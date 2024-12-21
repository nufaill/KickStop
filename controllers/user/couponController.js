
const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");



const getCoupons=async (req,res)=>{
  try {
      const user = req.session.user;
      if(!user){
        return res.redirect('/login');
      }
      const currentDate = new Date(); 

      const coupons = await Coupon.find({
      isActive: true,
      userId: { $ne: user },
      endOn:{$gt:currentDate}
      });
      
      res.render('couponList',{coupons});
  } catch (error) {
      
  }
}

const applyCoupon=async (req,res)=>{
  const {couponCode,totalPrice}=req.body;
  
  try {
      const userId=req.session.user
      if (!couponCode || !totalPrice) {
        
          return res.status(400).json({ success: false, message: "Missing coupon code or price" });
      }
      
      const coupon =await Coupon.findOne({code:couponCode,endOn:{$gt:Date.now()}})
      if(!coupon){
          return res.json({success:false,meassge:'invalid or expired coupon'})
      }
      
      const hasUsedCoupon = coupon.userId.some(id => id.toString() === userId.toString());
        if (hasUsedCoupon) {
            return res.status(400).json({
                success: false,
                message: 'You have already used this coupon'
            });
        }
      if(coupon.minimumPrice>totalPrice){
          return res.json({ success: false, message: `minimum price to apply coupon ${coupon.minimumPrice}` });

      }
      if (coupon.userId && coupon.userId.includes(userId)) {
        return res.json({
          success: false,
          message: 'You have already used this coupon'
        });
      }
      const discount = parseFloat(coupon.price);
      if (isNaN(discount)) {
          return res.status(400).json({ success: false, message: "Invalid discount value" });
      }
      const discountAmount = (totalPrice * discount) / 100;
      const finalTotal = totalPrice - discountAmount;

      await Coupon.findByIdAndUpdate(
        coupon._id,
        { $addToSet: { userId: userId } },
        { new: true }
      );

      res.status(200).json({
          success: true,
          discountAmount: discountAmount.toFixed(2),
          finalTotal: finalTotal.toFixed(2),
          message: "Coupon applied successfully!"
      });
  } catch (error) {
      console.error(error);
      
  }
}
const removeCoupon = async (req, res) => {
  try {
    const { totalPrice } = req.body;
    const discountAmount = 0;
    const finalTotal = totalPrice;

    return res.json({
      success: true,
      discountAmount,
      finalTotal,
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}


module.exports = {
    applyCoupon,
    removeCoupon,
    getCoupons
}