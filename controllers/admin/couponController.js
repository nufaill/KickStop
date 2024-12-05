const Coupon = require('../../models/couponSchema');

const loadCoupon = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1)*limit;
        const count = await Coupon.countDocuments();
        const totalPages = Math.ceil(count / limit);

        const coupons = await Coupon.find().skip(skip).limit(limit);
        return res.render("coupons",{coupons,totalPages,currentPage:page});
    } catch (error) {
        console.log("Error getting coupon page",error);
        return res.redirect("/admin/pageerror");
    }
}

const addCoupon = async (req,res)=>{
    try {
        const {couponCode,discountPercentage,minimumPrice, maximumPrice, createdDate, endDate} = req.body;
        
        if (!couponCode || !discountPercentage || !minimumPrice || !maximumPrice || !createdDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }
        const codeRegex = /^[A-Z0-9]+$/;
        if (!codeRegex.test(couponCode)) {
            return res.status(400).json({
                success: false,
                message: "Coupon code must be uppercase alphanumeric"
            });
        }
        const discountPercent = parseFloat(discountPercentage);
        if (isNaN(discountPercent) || discountPercent < 1 || discountPercent > 100) {
            return res.status(400).json({
                success: false,
                message: "Discount percentage must be between 1 and 100"
            });
        }

        const minPrice = parseFloat(minimumPrice);
        const maxPrice = parseFloat(maximumPrice);
        if (minPrice < 0 || maxPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "Prices cannot be negative"
            });
        }
        if (maxPrice <= minPrice) {
            return res.status(400).json({
                success: false,
                message: "Maximum price must be greater than minimum price"
            });
        }
        const createdOnDate = new Date(createdDate);
        const endOnDate = new Date(endDate);
        const currentDate = new Date();

        if (endOnDate <= currentDate) {
            return res.status(400).json({
                success: false,
                message: "End date must be a future date"
            });
        }

        const couponExisting = await Coupon.findOne({code:couponCode});
        if(couponExisting){
            return res.status(400).json({
                success: false,
                message: "This coupon code already exists"
            });
        }

        const isActive = currentDate >= createdOnDate && currentDate <= endOnDate;

        const newCoupon = new Coupon({
            code: couponCode,
            price: discountPercent,
            minimumAmount: minPrice,
            maximumAmount: maxPrice,
            createdOn: createdOnDate,
            endOn: endOnDate,
            isActive
        });

        await newCoupon.save();
        return res.status(201).json({ 
            success: true, 
            message: "Coupon added successfully" 
        });
    } catch (error) {
        console.error("Error adding coupon:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later."
        });
    }
}

const deleteCoupon = async (req,res) => {
    try {
        const couponId = req.query.id;
        if (!couponId) {
            return res.status(400).redirect("/admin/coupons");
        }
        await Coupon.findByIdAndDelete(couponId);
        return res.redirect("/admin/coupons");
    } catch (error) {
        console.error("Error deleting coupon:", error);
        return res.redirect("/admin/coupons");
    }
}

module.exports = {
    loadCoupon,
    addCoupon,
    deleteCoupon
};