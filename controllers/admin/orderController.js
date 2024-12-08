const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const Address = require('../../models/addressSchema');


const loadOrders = async(req,res)=>{

    const { status } = req.query;

    const filter = status && status !== 'All' ? { status } : {};

    try {
        const limit = 7;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const orders = await Order.find(filter)
            .populate('user')
            .populate('shippingAddress')
            .populate({
                path: 'items.productId', 
                model: 'Product', 
                select: 'productName productImage', 
                strictPopulate: false 
            })
            .sort({createdAt:-1})
            .limit(limit)
            .skip((page - 1) * limit);
          
            
        const totalCount = await Order.countDocuments(filter);
        res.render('orders-list', { 
            orders: orders.reverse(), 
            currentStatus: status || 'All',
            totalPages: Math.ceil(totalCount/limit), 
            currentPage: page 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error-page', { 
            message: 'Error retrieving orders', 
            errorCode: 500,
            error: error 
        });
    }
}


const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Define valid status progression
        const statusProgression = [
            'Pending', 
            'Processing', 
            'Shipped', 
            'Delivered', 
            'Cancelled', 
            'Return Request', 
            'Returned'
        ];

        // Current status index
        const currentStatusIndex = statusProgression.indexOf(order.status);
        const newStatusIndex = statusProgression.indexOf(newStatus);

        // Validation rules
        if (currentStatusIndex === -1 || newStatusIndex === -1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status' 
            });
        }

        // Block backwards progression
        if (newStatusIndex < currentStatusIndex) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot revert to a previous status' 
            });
        }

        // Prevent changes after certain final states
        const finalStates = ['Delivered', 'Cancelled', 'Returned'];
        if (finalStates.includes(order.status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot change status from ${order.status}` 
            });
        }

        // Additional specific rules
        switch(order.status) {
            case 'Delivered':
                // Cannot change status after delivery
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot modify status after delivery' 
                });
            
            case 'Cancelled':
                // Cannot change status after cancellation
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot modify status after cancellation' 
                });
            
            case 'Returned':
                // Cannot change status after return
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot modify status after return' 
                });
        }

        // Prevent jumping multiple stages
        if (newStatusIndex > currentStatusIndex + 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Can only progress to the next immediate status' 
            });
        }

        // Special rule: can only cancel if not shipped
        if (newStatus === 'Cancelled' && 
            ['Shipped', 'Delivered', 'Return Request', 'Returned'].includes(order.status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Order cannot be cancelled after shipping' 
            });
        }

        // Update status
        order.status = newStatus;
        await order.save();

        res.json({ 
            success: true, 
            message: 'Order status updated successfully',
            newStatus: order.status 
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update order status', 
            error: error.message 
        });
    }
};
module.exports={
    loadOrders,
    updateOrderStatus
}