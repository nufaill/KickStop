const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");

const loadSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        const orderData = await Order.find()
            .populate("user")
            .populate({
                path: "items.productId", 
                model: "Product"
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.render("salesReports", {
            orders: orderData,
            count: orderData.length,
            totalPages: Math.ceil(orderData.length / limit),
            currentPage: page
        });
        
    } catch (error) {
        console.error("Error loading sales report:", error);
        res.redirect("/admin/pageerror");
    }
}

module.exports = { loadSalesReport };