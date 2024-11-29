const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const loadOrders = async(req,res)=>{
    const { status } = req.query;

    const filter = status && status !== 'All' ? { status } : {};

    try {
        const limit = 10;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const orders = await Order.find(filter)
            .populate('user')
            .populate({
                path: 'orderedItems.product',
                model: 'Product'
            })
            .sort({createdAt:-1})
            .limit(limit)
            .skip((page - 1) * limit);
            
        const count = await Order.find(filter)
        res.render('orders-list', { 
            orders: orders.reverse(), 
            currentStatus: status || 'All',
            totalPages: Math.ceil(count.length/limit), 
            currentPage: page 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('admin/error', { 
            message: 'Error retrieving orders', 
            errorCode: 500,
            error: error 
        });
    }
}
module.exports={
    loadOrders
}