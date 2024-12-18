const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        price: {
            type: Number,
            required: true,
        }
    }],
    totalPrice: {
        type: Number,
        required: true,
    },

    discount: {
        type: Number,
        default: 0,
    },
    finalAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Payment Failed','Shipped', 'Delivered', 'Cancelled', 'Paid'], 
        default: 'Pending',
        required: true,
    },
    shippingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
      },
    paymentMethod: {
        type: String,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Completed'],
        default: 'Pending',
    },
    couponAmount: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        default:0
    },
    orderId: {
        type: String,
        unique: true,
        default: function() {
            return `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
