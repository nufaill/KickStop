const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
const moment = require('moment');
const { json } = require('express');
const PDFDocument = require('pdfkit');

const placeOrderInitial = async (req, res) => {
    try {
        const { singleProduct, totalPrice, addressId, paymentMethod, discountInput, couponCodeInput } = req.body;

        const user = req.session.user;
        const cart = await Cart.findOne({ userId: user })

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!addressId || (!cart && !singleProduct)) {
            return res.status(400).json({ success: false, message: "Invalid input" });
        }

        if (paymentMethod === "COD") {
            const orderItems = [];
            if (singleProduct) {
                const product = await Product.findById(singleProduct);
                if (!product) {
                    return res.status(404).json({ success: false, message: "Product not found" });
                }
                orderItems.push({
                    productId: product._id,
                    quantity: 1,
                    price: product.salePrice,
                });
            } else if (cart) {
                for (const item of cart.items) {
                    const product = await Product.findById(item.productId);
                    if (!product) {
                        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
                    }
                    orderItems.push({
                        productId: product._id,
                        quantity: item.quantity,
                        price: product.salePrice * item.quantity,
                    });
                }
            }
            let total = Number(discountInput) + Number(totalPrice);

            let couponAmount = 0;
            const coupon = await Coupon.findOne({ code: couponCodeInput });
            if (coupon) {
                couponAmount = coupon.price;
            }

            const newOrder = new Order({
                user,
                items: orderItems,
                totalPrice:total,
                discount:discountInput,
                finalAmount:totalPrice,
                status: "Pending",
                shippingAddress: addressId,
                paymentMethod: "COD",
                paymentStatus: "Pending",
                couponCode:couponCodeInput || null,
                couponAmount:couponAmount

            });

            await newOrder.save();

            if (cart) {
                await Cart.findOneAndDelete({ userId: user });
            }
            
            return res.json({
                success: true,
                orderId: newOrder._id,
            });
        } else {
            return res.json({ success: false, message: "Invalid payment method" });
        }
    } catch (error) {
        console.error("Error placing order", error);
        res.status(500).json({ success: false, message: "Failed to place order", errorDetails: error.message });
    }
};

const getOrderConfirmation = async (req, res) => {
    try {
        const orderId = req.query.id;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.redirect('/error');
        }

        const order = await Order.findById(orderId).populate('items.productId').populate('shippingAddress');
        if (!order) {
            return res.redirect('/error');
        }

        res.render('order-confirmation', {
            order,
            orderNumber: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
            totalAmount: order.finalAmount
        });
    } catch (error) {
        handleError(res, error, 'Error fetching order confirmation');
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
            .populate(['items.productId', 'shippingAddress'])
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        res.render('order-details', {
            orders,
            moment,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        handleError(res, error, 'Error fetching order history');
    }
};

const generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).send('Invalid Order ID');
        }

        const order = await Order.findById(orderId)
            .populate('items.productId')
            .populate('shippingAddress');

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
           .text(`${order.shippingAddress.name}`, 350, 160)
           .text(`${order.shippingAddress.address}`, 350, 175)
           .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 350, 190)
           .text(`${order.shippingAddress.pincode}`, 350, 205);

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
        order.items.forEach((item) => {
            doc.font('Helvetica')
               .fillColor('#666666')
               .text(item.productId.productName, 50, currentHeight)
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

module.exports={
    placeOrderInitial,
    getOrderConfirmation,
    cancelOrder,
    getOrderHistory,
    generateInvoice
}