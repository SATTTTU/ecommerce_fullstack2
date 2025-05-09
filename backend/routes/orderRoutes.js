import express from "express";
const router = express.Router();

import {
  createOrder,
  getAllOrders,
  getUserOrders,
  countTotalOrders,
  calculateTotalSales,
  // calcualteTotalSalesByDate,
  findOrderById,
  markOrderAsPaid,
  markOrderAsDelivered,
  braintreeTokenController,
  brainTreePaymentController,
} from "../controllers/orderController.js";

import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware.js";

router.route("/").post(authenticate, createOrder).get(authenticate, authorizeAdmin, getAllOrders);
router.route("/mine").get(authenticate, getUserOrders);
router.route("/total-orders").get(authenticate, authorizeAdmin, countTotalOrders);
router.route("/total-sales").get(authenticate, authorizeAdmin, calculateTotalSales);
// router.route("/total-sales-by-date").get(authenticate, authorizeAdmin, calcualteTotalSalesByDate);
router.route("/braintree/token").get(authenticate, braintreeTokenController);
router.route("/braintree/payment").post(authenticate, brainTreePaymentController);
router.route("/:id").get(authenticate, findOrderById);
router.route("/:id/pay").put(authenticate, markOrderAsPaid);
router.get("/paypal-token", braintreeTokenController)
router.route("/:id/deliver").put(authenticate, authorizeAdmin, markOrderAsDelivered);

export default router;
