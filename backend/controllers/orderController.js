import Order from "../models/orderModel.js"
import Product from "../models/productModel.js"
import braintree from "braintree"

// Braintree configuration
const MERCHANT_ID = process.env.BRAINTREE_MERCHANT_ID || "ctsd67mwj5fg63wf"
const MERCHANT_KEY = process.env.BRAINTREE_PUBLIC_KEY || "xrh299r3m8mcxhmm"
const MERCHANT_SECRET = process.env.BRAINTREE_PRIVATE_KEY || "660b6aa042e7cb9d9545c4b73e876709"

// Initialize Braintree gateway
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: MERCHANT_ID,
  publicKey: MERCHANT_KEY,
  privateKey: MERCHANT_SECRET,
})

/**
 * Calculate prices for an order
 * @param {Array} orderItems - Array of order items
 * @returns {Object} - Object containing calculated prices
 */
function calcPrices(orderItems) {
  const itemsPrice = orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)

  // Free shipping for orders over $100
  const shippingPrice = itemsPrice > 100 ? 0 : 10

  // Tax rate is 15%
  const taxRate = 0.15
  const taxPrice = (itemsPrice * taxRate).toFixed(2)

  const totalPrice = (itemsPrice + shippingPrice + Number.parseFloat(taxPrice)).toFixed(2)

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice,
    totalPrice,
  }
}

/**
 * Create a new order
 * @route POST /api/orders
 * @access Private
 */
const createOrder = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items" })
    }

    // Get the latest product information from the database
    const itemsFromDB = await Product.find({
      _id: { $in: orderItems.map((x) => x._id) },
    })

    // Map order items with current prices from database
    const dbOrderItems = orderItems.map((item) => {
      const product = itemsFromDB.find((p) => p._id.toString() === item._id)

      if (!product) {
        throw new Error(`Product not found: ${item._id}`)
      }

      return {
        ...item,
        product: item._id,
        price: product.price,
        _id: undefined,
      }
    })

    // Calculate prices
    const { itemsPrice, taxPrice, shippingPrice, totalPrice } = calcPrices(dbOrderItems)

    // Create new order
    const order = new Order({
      orderItems: dbOrderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    })

    const createdOrder = await order.save()
    res.status(201).json(createdOrder)
  } catch (error) {
    console.error("Create order error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get all orders
 * @route GET /api/orders
 * @access Private/Admin
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("user", "id username email")
    res.json(orders)
  } catch (error) {
    console.error("Get all orders error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get logged in user's orders
 * @route GET /api/orders/mine
 * @access Private
 */
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
    res.json(orders)
  } catch (error) {
    console.error("Get user orders error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get total number of orders
 * @route GET /api/orders/total-orders
 * @access Private/Admin
 */
const countTotalOrders = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments()
    res.json({ totalOrders })
  } catch (error) {
    console.error("Count total orders error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Calculate total sales
 * @route GET /api/orders/total-sales
 * @access Private/Admin
 */
const calculateTotalSales = async (req, res) => {
  try {
    const orders = await Order.find({ isPaid: true })
    const totalSales = orders.reduce((sum, order) => sum + Number(order.totalPrice), 0)
    res.json({ totalSales: totalSales.toFixed(2) })
  } catch (error) {
    console.error("Calculate total sales error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Calculate total sales by date
 * @route GET /api/orders/total-sales-by-date
 * @access Private/Admin
 */
const calculateTotalSalesByDate = async (req, res) => {
  try {
    const salesByDate = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          totalSales: { $sum: { $toDouble: "$totalPrice" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    res.json(salesByDate)
  } catch (error) {
    console.error("Calculate sales by date error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get order by ID
 * @route GET /api/orders/:id
 * @access Private
 */
const findOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "username email")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the user is authorized to view this order
    if (!req.user.isAdmin && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this order" })
    }

    res.json(order)
  } catch (error) {
    console.error("Find order by ID error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Update order to paid
 * @route PUT /api/orders/:id/pay
 * @access Private
 */
const markOrderAsPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the order is already paid
    if (order.isPaid) {
      return res.status(400).json({ message: "Order is already paid" })
    }

    const { nonce, amount } = req.body

    // If no nonce is provided, assume it's a direct update (e.g., PayPal)
    if (!nonce) {
      order.isPaid = true
      order.paidAt = Date.now()
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.payer?.email_address,
      }

      const updatedOrder = await order.save()
      return res.json(updatedOrder)
    }

    // Process Braintree payment
    gateway.transaction.sale(
      {
        amount: amount,
        paymentMethodNonce: nonce,
        options: { submitForSettlement: true },
      },
      async (error, result) => {
        if (result?.success) {
          order.isPaid = true
          order.paidAt = Date.now()
          order.paymentResult = {
            id: result.transaction.id,
            status: result.transaction.status,
            update_time: new Date().toISOString(),
            email_address: req.user?.email || "customer@example.com",
          }

          const updatedOrder = await order.save()
          res.json(updatedOrder)
        } else {
          console.error("Braintree payment error:", error || result.message)
          res.status(400).json({
            message: "Payment processing failed",
            error: error?.message || result?.message || "Unknown payment error",
          })
        }
      },
    )
  } catch (error) {
    console.error("Mark order as paid error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Update order to delivered
 * @route PUT /api/orders/:id/deliver
 * @access Private/Admin
 */
const markOrderAsDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Check if the order is already delivered
    if (order.isDelivered) {
      return res.status(400).json({ message: "Order is already delivered" })
    }

    order.isDelivered = true
    order.deliveredAt = Date.now()

    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } catch (error) {
    console.error("Mark order as delivered error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Generate Braintree client token
 * @route GET /api/orders/braintree/token
 * @access Private
 */
const braintreeTokenController = async (req, res) => {
  try {
    gateway.clientToken.generate({}, (err, response) => {
      if (err) {
        console.error("Braintree token error:", err)
        res.status(500).json({ error: err.message })
      } else {
        res.json({ clientToken: response.clientToken })
      }
    })
  } catch (error) {
    console.error("Braintree token controller error:", error)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Process Braintree payment
 * @route POST /api/orders/braintree/payment
 * @access Private
 */
const brainTreePaymentController = async (req, res) => {
  try {
    const { nonce, orderId } = req.body

    if (!nonce || !orderId) {
      return res.status(400).json({ message: "Invalid payment request" })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    gateway.transaction.sale(
      {
        amount: order.totalPrice,
        paymentMethodNonce: nonce,
        options: { submitForSettlement: true },
      },
      async (error, result) => {
        if (result?.success) {
          // Update order payment status
          order.isPaid = true
          order.paidAt = Date.now()
          order.paymentResult = {
            id: result.transaction.id,
            status: result.transaction.status,
            update_time: new Date().toISOString(),
            email_address: req.user.email,
          }

          await order.save()
          res.json({
            success: true,
            message: "Payment successful",
            transactionId: result.transaction.id,
          })
        } else {
          console.error("Braintree payment error:", error || result)
          res.status(400).json({
            success: false,
            message: "Payment failed",
            error: error?.message || result?.message || "Unknown payment error",
          })
        }
      },
    )
  } catch (err) {
    console.error("Braintree payment controller error:", err)
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: err.message,
    })
  }
}

export {
  createOrder,
  getAllOrders,
  getUserOrders,
  countTotalOrders,
  calculateTotalSales,
  calculateTotalSalesByDate,
  findOrderById,
  markOrderAsPaid,
  markOrderAsDelivered,
  braintreeTokenController,
  brainTreePaymentController,
}
