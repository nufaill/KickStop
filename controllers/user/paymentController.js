const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Coupon = require("../../models/couponSchema");
const Address = require("../../models/addressSchema");

const razorpay = new Razorpay({
    key_id: process.env.RAZOR_KEY_ID,
    key_secret: process.env.RAZOR_KEY_SECRET,
});


const loadRazorpay = async (req, res) => {
    try {
        const discountAmount = req.body.discount.split('.')[0]
        const userId = req.session.user
        const cart = await Cart.findOne({ userId: userId });
        let totalPrice = cart.items.reduce((acc, curr) => {
            return acc + curr.totalPrice
        }, 0)

        if (!totalPrice || isNaN(totalPrice)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing amount.",
            });
        }
        const amountToPay = totalPrice -Number(discountAmount)
        
        const options = {
            amount: amountToPay * 100, 
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        console.log('Created order', order);
        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Error creating Razorpay order", error);
        res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order",
            error: error.message,
        });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { 
            payment_id, 
            order_id, 
            signature, 
            singleProduct, 
            totalPrice, 
            addressId, 
            discount ,
            couponCodeInput,
            discountInput
        } = req.body;

        console.log("kkk",addressId,)
        
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId: userId });
        
        if (!addressId) {
          return res.status(400).json({
              success: false,
              status: 'missing_address',
              message: "Shipping address is required",
              redirectUrl: `/payment-failure?reason=missing_address`
          });
      }
      const address = await Address.findById(addressId);
      if (!address) {
          return res.status(404).json({
              success: false,
              status: 'address_not_found',
              message: "Selected shipping address not found",
              redirectUrl: `/payment-failure?reason=address_not_found`
          });
      }
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZOR_KEY_SECRET)
            .update(`${order_id}|${payment_id}`)
            .digest("hex");

        if (signature !== expectedSignature) {
            return res.status(400).json({
                success: false,
                status: 'signature_mismatch',
                message: "Payment verification failed due to signature mismatch",
                redirectUrl: `/payment-failure?orderId=${order_id}&reason=signature_mismatch`
            });
        }

        const orderItems = [];

        if (singleProduct) {
            const product = await Product.findById(singleProduct);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    status: 'product_not_found',
                    message: "Product not found",
                    redirectUrl: `/payment-failure?orderId=${order_id}&reason=product_not_found`
                });
            }

            orderItems.push({
                productId: product._id,
                quantity: 1,
                price: product.salePrice,
            });
        } else if (cart && cart.items.length > 0) {
            for (const item of cart.items) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    return res.status(404).json({
                        success: false,
                        status: 'cart_product_not_found',
                        message: "One or more products in cart not found",
                        redirectUrl: `/payment-failure?orderId=${order_id}&reason=cart_product_not_found`
                    });
                }
                orderItems.push({
                    productId: product._id,
                    quantity: item.quantity,
                    price: product.salePrice * item.quantity,
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                status: 'empty_order',
                message: "No items to order",
                redirectUrl: `/payment-failure?orderId=${order_id}&reason=empty_order`
            });
        }

        const safeTotal = Number(totalPrice) || 0;
        const safeDiscount = Number(discount) || 0;
        let couponAmount = 0;
            const coupon = await Coupon.findOne({ code: couponCodeInput });
            if (coupon) {
                couponAmount = coupon.price;
            }
        const newOrder = new Order({
            user: userId,
            items: orderItems,
            totalPrice: safeTotal + safeDiscount, 
            finalAmount: safeTotal,
            status: "Pending",
            shippingAddress: addressId,
            paymentMethod: "Online",
            paymentStatus: "Pending",
            razorpayOrderId: order_id,
            razorpayPaymentId: payment_id,
            discount: safeDiscount,
            couponCode:couponCodeInput || null,
            couponAmount:couponAmount
        });

        await newOrder.save();

        if (cart) {
            await Cart.findOneAndDelete({ userId });
        }

        return res.json({
            success: true,
            status: 'payment_success',
            orderId: newOrder._id,
            redirectUrl: `/order-confirmation?id=${newOrder._id}`
        });

    } catch (error) {
        console.error("Error processing payment:", error);
        
        return res.status(500).json({
            success: false,
            status: 'server_error',
            message: "Payment processing failed",
            redirectUrl: `/payment-failure?reason=server_error`
        });
    }
};


module.exports = {
    loadRazorpay,
    verifyPayment
}