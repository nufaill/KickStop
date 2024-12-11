const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");

const loadSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);
        
        const orderData = await Order.find()
            .populate("user")
            .populate("items.productId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.render("salesReports", {
            orders: orderData,
            count: totalOrders,
            totalPages: totalPages,
            currentPage: page
        });
        
    } catch (error) {
        console.error("Error loading sales report:", error);
        res.redirect("/admin/pageerror");
    }
}

module.exports = {
    loadSalesReport 
};