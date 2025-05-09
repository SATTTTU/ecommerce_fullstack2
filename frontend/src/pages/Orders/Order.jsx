import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import DropIn from "braintree-web-drop-in-react";
import Loader from "../../components/Loader";
import Message from "../../components/Message";
import {
  useDeliverOrderMutation,
  useGetOrderDetailsQuery,
  usePayOrderMutation,
  useGetPaypalClientIdQuery, // Add this import
} from "../../redux/api/orderApiSlice";

const Order = () => {
  const { id: orderId } = useParams();
  const { userInfo } = useSelector((state) => state.auth);
  const [braintreeInstance, setBraintreeInstance] = useState(null);

  const {
    data: order,
    refetch,
    isLoading,
    error,
  } = useGetOrderDetailsQuery(orderId);

  // Use the Redux query hook to get the client token
  const { data: braintreeData, isLoading: loadingToken } = useGetPaypalClientIdQuery();

  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();
  const [deliverOrder, { isLoading: loadingDeliver }] = useDeliverOrderMutation();

  useEffect(() => {
    if (order && !order.isPaid && braintreeData) {
      // The token is already included in the response from useGetPaypalClientIdQuery
      // No need for separate fetch
    }
  }, [order, braintreeData]);

  const handlePayment = async () => {
    try {
      if (!braintreeInstance) {
        toast.error("Payment system not ready");
        return;
      }

      const { nonce } = await braintreeInstance.requestPaymentMethod();

      await payOrder({
        orderId,
        paymentMethodNonce: nonce,
        amount: order.totalPrice,
      }).unwrap();

      toast.success("Payment successful!");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Payment failed");
      console.error("Payment error:", err);
    }
  };

  const handleDelivery = async () => {
    try {
      await deliverOrder(orderId);
      refetch();
      toast.success("Order marked as delivered");
    } catch (err) {
      toast.error("Delivery update failed");
    }
  };

  if (isLoading || loadingToken) return <Loader />;
  if (error) return <Message variant="danger">{error.data?.message}</Message>;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Order #{order._id}</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Your Order</h2>
          {order.orderItems.map((item, index) => (
            <div key={index} className="flex items-center border-b py-4">
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover mr-4" />
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-gray-600">{item.qty} × ${item.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between"><span>Subtotal:</span><span>${order.itemsPrice}</span></div>
            <div className="flex justify-between"><span>Shipping:</span><span>${order.shippingPrice}</span></div>
            <div className="flex justify-between"><span>Tax:</span><span>${order.taxPrice}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span><span>${order.totalPrice}</span>
            </div>
          </div>

          {!order.isPaid && (
            <div className="mt-4">
              {loadingPay && <Loader />}
              {braintreeData?.clientToken ? (
                <>
                  <DropIn
                    options={{
                      authorization: braintreeData.clientToken,
                      paypal: { flow: "checkout", amount: order.totalPrice, currency: "USD" }
                    }}
                    onInstance={(instance) => setBraintreeInstance(instance)}
                  />
                  <button
                    onClick={handlePayment}
                    className="w-full bg-blue-500 text-white py-2 rounded mt-4 hover:bg-blue-600 transition"
                    disabled={!braintreeInstance || loadingPay}
                  >
                    {loadingPay ? "Processing..." : "Pay Now"}
                  </button>
                </>
              ) : (
                <Loader />
              )}
            </div>
          )}

          {order.isPaid && (
            <div className="bg-green-100 text-green-800 p-3 rounded text-center">
              Paid on {new Date(order.paidAt).toLocaleString()}
            </div>
          )}

          {userInfo?.isAdmin && order.isPaid && !order.isDelivered && (
            <button
              onClick={handleDelivery}
              className="w-full bg-blue-500 text-white py-2 rounded mt-4 hover:bg-blue-600 transition"
              disabled={loadingDeliver}
            >
              {loadingDeliver ? "Processing..." : "Mark As Delivered"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Order;