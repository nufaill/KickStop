const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

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
        let { payment_id, order_id, signature, singleProduct, totalPrice, addressId, discount } = req.body;
        // console.log('body-------------------', req.body);
        // console.log('dicount-------------------', discount);

        console.log('typr of discount', typeof discount);
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId: userId });
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZOR_KEY_SECRET)
            .update(`${order_id}|${payment_id}`)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.error("Signature mismatch");
            return res.status(400).json({
                success: false,
                message: "Payment verification failed",
            });
        }

        const orderItems = [];

        // Handle Single Product Payment
        if (singleProduct) {
            const product = await Product.findById(singleProduct);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found",
                });
            }

            orderItems.push({
                productId: product._id,
                quantity: 1,
                price: product.salePrice,
            });
        }
        // Handle Cart Payments
        else if (cart) {
            // let parsedCart;
            try {
                // parsedCart = cart
                // Array.isArray(cart) ? cart : JSON.parse(cart);

                // if (!Array.isArray(parsedCart)) {
                //     throw new Error("Cart parsing failed.");
                // }

                for (const item of cart.items) {
                    const product = await Product.findById(item.productId);
                    // console.log('product ===>', product);

                    if (!product) {
                        return res.status(404).json({
                            success: false,
                            message: "Product not found",
                        });
                    }
                    orderItems.push({
                        productId: product._id,
                        quantity: item.quantity,
                        price: product.salePrice * item.quantity,
                    });
                }
            } catch (error) {
                console.error("Error parsing cart:", error);
                return res.status(400).json({
                    success: false,
                    message: "Invalid cart data provided.",
                });
            }
        }


        const newOrder = new Order({
            user: req.session.user,
            items: orderItems,
            totalPrice,
            finalAmount: totalPrice += Number(discount),
            status: "Paid",
            shippingAddress: addressId,
            paymentMethod: "Online",
            paymentStatus: "Paid",
            razorpayOrderId: order_id,
            razorpayPaymentId: payment_id,
            discount
        });

        await newOrder.save();

        res.json({
            success: true,
            orderId: newOrder._id,
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error: error.message,
        });
    }
};


module.exports = {
    loadRazorpay,
    verifyPayment
}