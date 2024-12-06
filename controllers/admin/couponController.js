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

const addCoupon = async (req, res) => {
    try {
        const { 
            couponCode, 
            discountPercentage, 
            minimumPrice, 
            maximumPrice, 
            createdDate, 
            endDate 
        } = req.body;

        if (!couponCode || !discountPercentage || !minimumPrice || !maximumPrice || !createdDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        const existingCoupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: `Coupon ${couponCode} already exists`
            });
        }
        const newCoupon = new Coupon({
            code: couponCode.toUpperCase(),
            price: parseFloat(discountPercentage),
            minimumAmount: parseFloat(minimumPrice),
            maximumAmount: parseFloat(maximumPrice),
            createdOn: new Date(createdDate),
            endOn: new Date(endDate),
            isActive: true,
            usageLimit: 1,
            usageCount: 0
        });

        await newCoupon.save();

        return res.status(201).json({
            success: true,
            message: 'Coupon added successfully',
            coupon: newCoupon
        });

    } catch (error) {
        console.error('Error adding coupon:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add coupon',
            error: error.message
        });
    }
};
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
const editCoupon = async (req,res) => {
    try {
        const id = req.query.id;
        const coupons = await Coupon.findById(id);
        res.render("edit-coupon",{coupons});
    } catch (error) {
        
    }
}
const posteditCoupon = async (req, res) => {
    try {
        const { couponCode, discountPercentage, minimumPrice, maximumPrice, createdDate, endDate } = req.body;
        const couponId = req.query.id;  
        const price = discountPercentage; 
        const existingCoupon = await Coupon.findOne({
            code: couponCode,
            _id: { $ne: couponId },
        });

        if (existingCoupon) {
            return res.status(400).json({ error: "Coupon code already exists. Please choose a different code." });
        }

        
        const updateFields = {
            code: couponCode,
            price: price,
            minimumAmount: minimumPrice,
            maximumAmount: maximumPrice,
            createdOn: new Date(createdDate), 
            endOn: new Date(endDate), 
        };

        
        const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, updateFields, { new: true });

        if (!updatedCoupon) {
            return res.status(404).json({ error: "Coupon not found." });
        }
        res.redirect('/admin/coupons');  

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while updating the coupon." });
    }
};
module.exports = {
    loadCoupon,
    deleteCoupon,
    addCoupon,
    editCoupon,
    posteditCoupon
};