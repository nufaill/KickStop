
const Coupon = require('../../models/couponSchema');

const loadCoupon = async (req,res) => {
    try {
      
      const user = req.session.user;
      if(!user){
        return res.redirect('/login');
      }
  
      const coupons = await Coupon.find({
        isActive: true,
        userId: { $ne: user },
      });
      
      res.render('couponList',{coupons});
  
    } catch (error) {
      console.error("loadCoupons not worked",error)
    }
  }

  const postCoupon = async (req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const totalAmount = Number(cartTotal);

        if (!totalAmount || isNaN(totalAmount)) {
            return res.json({
                success: false,
                message: 'Invalid cart total'
            });
        }

        const userId = req.session.user;

        const coupon = await Coupon.findOne({
            code: couponCode,
            isActive: true,
            endOn: { $gt: new Date() }
        });

        if (!coupon) {
            return res.json({
                success: false,
                message: 'Invalid or expired coupon code'
            });
        }
        if (coupon.endOn < new Date()) {
          return res.json({
              success: false,
              message: 'This coupon has ended.',
              expired: true 
          });
      }
        if (!coupon.price || isNaN(coupon.price)) {
            return res.json({
                success: false,
                message: 'Coupon offer percentage is invalid'
            });
        }

        if (coupon.userId.includes(userId)) {
            return res.json({
                success: false,
                message: 'Coupon has already been used by this user'
            });
        }

        // Enhanced minimum price check with more descriptive message
        if (coupon.minimumAmount && totalAmount < coupon.minimumAmount) {
            return res.json({
                success: false,
                message: `Coupon requires a minimum purchase of ₹${coupon.minimumAmount}. Your current cart total is ₹${totalAmount}.`
            });
        }

        // Optional: Add a maximum total check if specified in coupon schema
        if (coupon.maximumAmount && totalAmount > coupon.maximumAmount) {
            return res.json({
                success: false,
                message: `Coupon is valid only for purchases up to ₹${coupon.maximumAmount}. Your current cart total is ₹${totalAmount}.`
            });
        }

        const discountAmount = (totalAmount * coupon.price) / 100;
        const discountedTotal = totalAmount - discountAmount;

        console.log("Discount Amount:", discountAmount, "Discounted Total:", discountedTotal);

        return res.json({
            success: true,
            message: 'Coupon applied successfully!',
            discountedTotal,
            discountAmount
        });
    } catch (error) {
        console.error('Invalid coupon:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to apply coupon'
        });
    }
};


  const removeCoupon = async (req, res) => {
    try {
  
      const { totalPrice } = req.body;
  
      const discountAmount = 0;
      const finalTotal = totalPrice;
  
      res.json({
        success: true,
        discountAmount,
        finalTotal,
      });
  
    } catch (error) {
      console.error("Error removing coupon", error);
      res.status(500);
    }
  }

  
module.exports={
    loadCoupon,
    postCoupon,
    removeCoupon
}