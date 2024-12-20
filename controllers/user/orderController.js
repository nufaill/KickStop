const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
const moment = require('moment');
const { json } = require('express');
const PDFDocument = require('pdfkit');
const Return = require('../../models/returnSchema');

const placeOrderInitial = async (req, res) => {
    try {
        let { cart, totalPrice, couponCode, payment_option, discount, addressId, singleProduct } = req.body;
        console.log('--------->req.body', req.body)
        const userId = req.session.user;
        if (!addressId || addressId.trim() === '') {
            const defaultAddress = await Address.findOne({ userId: userId, isDefault: true });

            if (!defaultAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'No address selected and no default address found'
                });
            }

            addressId = defaultAddress._id;
        }
        let orderedItems = [];
        if (singleProduct) {
            const product = JSON.parse(singleProduct);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                price: product.salePrice,
            });
        } else {
            const cartItems = JSON.parse(cart);
            orderedItems = cartItems.map(item => ({
                product: item.product || item.productId,
                quantity: item.quantity,
                price: item.totalPrice / item.quantity,
            }));
        }

        const couponApplied = Boolean(couponCode && couponCode.trim() !== "");

        const parsedTotalPrice = Number(totalPrice) || 0;
        const parsedDiscount = Number(discount) || 0;

        let fullAmount = parsedTotalPrice + parsedDiscount;
        let convTotal = Number(fullAmount);
        let finAmount = parsedTotalPrice - parsedDiscount;
        // finAmount = finAmount +(finAmount * 0.18)
        let convfin = Number(finAmount);


        if (discount == 0) {
            couponCode = undefined;
        }

        const orderData = {
            orderedItems,
            totalPrice: convTotal.toFixed(2),
            finalAmount: parsedTotalPrice,
            couponCode,
            discount,
            couponApplied,
            user: userId,
            address: addressId,
            paymentMethod: payment_option,
        };

        if (payment_option === 'COD') {
            orderData.status = 'Pending';
            orderData.paymentStatus = 'Not Applicable';
        } else if (payment_option === 'Online') {
            orderData.status = 'Pending';
            orderData.paymentStatus = 'Pending';
        }

        if (discount !== 0) {
            await User.findByIdAndUpdate(
                userId,
                { $push: { redeemedcoupon: couponCode } }
            );
        }

        const newOrder = new Order(orderData);
        console.log('new order', newOrder);

        await newOrder.save();

        if (payment_option === 'COD') {
            if (singleProduct) {
                const product = JSON.parse(singleProduct);
                const data = await Product.findByIdAndUpdate(product._id, {
                    $inc: { quantity: -1 }
                });
                console.log(`the data is ${data}`)
            }
            const cart = await Cart.findOne({ userId });
            if (!cart) res.status(404).json({ message: "Cart not found" });

            cart.items = []
            await cart.save()
            res.redirect(`/order-confirmation?id=${newOrder._id}`);
        } else {
            res.json({ orderId: newOrder._id, finalAmount: parsedTotalPrice });
        }

    } catch (error) {
        console.error("Error in placing order:", error);
        res.status(500).send("Internal Server Error");
    }
};

const getOrderConfirmation = async (req, res) => {
    try {
        const orderId = req.query.id;
        console.log(orderId)
        return res.render('order-confirmation', { orderId })
    } catch (error) {
        console.log("error in loading successpage")
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.paymentMethod.toLowerCase() !== 'online') {
            return res.status(403).json({ success: false, message: 'Cannot cancel this order' });
        }

        const userId = req.session?.user;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not authenticated' });
        }

        const amount = order.finalAmount;
        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: amount,
                transactions: [{
                    type: 'refund',
                    amount,
                    orderId,
                    description: 'Order refund',
                }],
            });
        } else {
            wallet.balance += amount;
            wallet.transactions.push({
                type: 'Refund',
                amount,
                orderId,
                description: 'Order refund',
            });
        }

        await wallet.save();

        order.status = 'Cancelled';
        await order.save();

        return res.json({ success: true, message: 'Order cancelled and refund processed successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};


const getOrderHistory = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ user });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({ user })
            .populate({
                path: 'orderedItems.product',
                model: 'Product'
            })
            .populate('address')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);
        const paginationData = {
            orders,
            moment,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            totalOrders
        };
        res.render('order-details', paginationData);

    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).render('error', {
            message: 'An error occurred while fetching order history',
            error: error.message
        });
    }
};
const generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).send('Invalid Order ID');
        }

        const order = await Order.findById(orderId)
            .populate('orderedItems.product')
            .populate('address');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${orderId}.pdf`);

        doc.pipe(res);

        doc.fillColor('#f4f4f4')
            .rect(50, 50, 500, 50)
            .fill();

        doc.fillColor('#800000')
            .fontSize(25)
            .font('Helvetica-Bold')
            .text('KickStop', 50, 65, { align: 'center' });

        doc.fontSize(10)
            .font('Helvetica')
            .fillColor('#666666')
            .text('Fashion Shoes Available', 50, 95, { align: 'center' });

        doc.strokeColor('#e0e0e0')
            .lineWidth(1)
            .moveTo(50, 120)
            .lineTo(550, 120)
            .stroke();

        doc.fillColor('#333333')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('INVOICE', 50, 140);

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor('#666666')
            .text(`Invoice Number: INV-${orderId.slice(-8).toUpperCase()}`, 50, 160)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 175)
            .text(`Payment Method: ${order.paymentMethod}`, 50, 190)
        //    .text(`Payment Status: ${order.paymentStatus}`, 50, 205);

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#333333')
            .text('Shipping Address', 350, 140);

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor('#666666')
            .text(`${order.address.name}`, 350, 160)
            .text(`${order.address.address}`, 350, 175)
            .text(`${order.address.city}, ${order.address.state}`, 350, 190)
            .text(`${order.address.pincode}`, 350, 205);

        const tableTop = 250;
        doc.fillColor('#800000')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text('Product', 50, tableTop)
            .text('Quantity', 250, tableTop)
            .text('Unit Price', 350, tableTop)
            .text('Total', 450, tableTop);

        doc.strokeColor('#e0e0e0')
            .lineWidth(1)
            .moveTo(50, tableTop + 15)
            .lineTo(550, tableTop + 15)
            .stroke();

        let currentHeight = tableTop + 30;
        order.orderedItems.forEach((item) => {
            doc.font('Helvetica')
                .fillColor('#666666')
                .text(item.product.productName, 50, currentHeight)
                .text(item.quantity.toString(), 250, currentHeight)
                .text(`RS ${item.price.toFixed(2).toLocaleString()}`, 350, currentHeight)
                .text(`RS ${(item.quantity * item.price).toFixed(2).toLocaleString()}`, 450, currentHeight);

            currentHeight += 20;
        });

        currentHeight += 30;
        doc.strokeColor('#e0e0e0')
            .lineWidth(1)
            .moveTo(50, currentHeight)
            .lineTo(550, currentHeight)
            .stroke();

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#800000')
            .text('Order Summary', 50, currentHeight + 20);

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor('#666666')
            .text('Subtotal:', 350, currentHeight + 20)
            .text(`RS ${order.totalPrice.toFixed(2).toLocaleString()}`, 450, currentHeight + 20);

        if (order.couponCode && order.couponAmount) {
            doc.text('Coupon Applied:', 350, currentHeight + 40)
                .text(`${order.couponCode}`, 450, currentHeight + 40);

            doc.text('Discount percentage :', 350, currentHeight + 60)
                .text(` ${order.couponAmount.toLocaleString()}%`, 450, currentHeight + 60);
        }

        if (order.discount) {
            doc.text('Other Discounts:', 350, order.couponCode ? currentHeight + 80 : currentHeight + 40)
                .text(`RS ${order.discount.toFixed(2).toLocaleString()}`, 450, order.couponCode ? currentHeight + 80 : currentHeight + 40);
        }

        const finalTotalHeight = order.couponCode ? currentHeight + 100 : currentHeight + 60;
        doc.font('Helvetica-Bold')
            .fillColor('#800000')
            .text('Total:', 350, finalTotalHeight)
            .text(`RS ${order.finalAmount.toFixed(2).toLocaleString()}`, 450, finalTotalHeight);

        doc.fontSize(8)
            .fillColor('#999999')
            .text('Thank you for your purchase in KickStop!', 50, 750, { align: 'center' })
            .text('This is a computer-generated invoice', 50, 765, { align: 'center' });

        doc.end();

    } catch (error) {
        console.error('Invoice Generation Error:', error);
        res.status(500).send('Error generating invoice');
    }
};
const returnOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const userId = req.session.user;


        const orderData = await Order.findById(orderId);
        if (!orderData) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const Existingreturn = await Return.findOne({ orderId });
        if (Existingreturn) {
            return res.status(404).json({ message: 'Return request already submited for this order' })
        }

        const reasonData = new Return({
            userId,
            orderId,
            reason,
            refundAmount: orderData.finalAmount,
        });

        await reasonData.save();

        return res.status(200).json({ message: "Return Request Submitted Successfully" });

    } catch (error) {
        console.error("Error processing return request:", error);
        return res.status(500).json({ message: 'Something went wrong, please try again later.' });
    }
};
module.exports = {
    placeOrderInitial,
    getOrderConfirmation,
    cancelOrder,
    getOrderHistory,
    generateInvoice,
    returnOrder
}