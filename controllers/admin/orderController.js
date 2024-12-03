const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const Address = require('../../models/addressSchema')
const loadOrders = async(req,res)=>{
    const { status } = req.query;

    const filter = status && status !== 'All' ? { status } : {};

    try {
        const limit = 10;
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

// const loadOrders = async (req, res) => {
//     const { status } = req.query;

//     const filter = status && status !== 'All' ? { status } : {};

//     try {
//         const limit = 10;
//         const page = Math.max(1, parseInt(req.query.page) || 1);

//         // Fetch orders with user and items populated
//         const orders = await Order.find(filter)
//             .populate('user') // Populate user details
//             .populate({
//                 path: 'items.productId',
//                 model: 'Product',
//                 select: 'productName image',
//                 strictPopulate: false
//             })
//             .sort({ createdAt: -1 })
//             .limit(limit)
//             .skip((page - 1) * limit);

//         // Manually populate shipping addresses
//         const populatedOrders = await Promise.all(
//             orders.map(async (order) => {
//                 if (order.shippingAddress) {
//                     // Find the address document containing the required address
//                     const addressDoc = await Address.findOne({
//                         'addresses._id': order.shippingAddress
//                     }, {
//                         'addresses.$': 1 // Only include the matching address in the result
//                     });
//                     console.log('address', addressDoc);
                    
//                     // Attach the populated address to the order
//                     if (addressDoc && addressDoc.addresses.length > 0) {
//                         order.shippingAddress = addressDoc.addresses[0]; // Replace ObjectId with the full address
//                     }
//                 }
//                 return order;
//             })
//         );

//         // Count total documents for pagination
//         const totalCount = await Order.countDocuments(filter);
//         // console.log('populatedOrders', populatedOrders);
        
//         // Render the orders page
//         res.render('orders-list', {
//             orders: populatedOrders.reverse(), // Reverse for desired order
//             currentStatus: status || 'All',
//             totalPages: Math.ceil(totalCount / limit),
//             currentPage: page
//         });
//     } catch (error) {
//         console.error('Error fetching orders:', error);
//         res.status(500).render('error-page', {
//             message: 'Error retrieving orders',
//             errorCode: 500,
//             error: error
//         });
//     }
// };


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

        order.status = newStatus;
        await order.save();

        res.json({ success: true, message: 'Order status updated successfully' });
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