const express=require("express");
const  router = express.Router();
const checkUserBlocked = require('../middlewares/checkUserBlocked');
const userController = require("../controllers/user/userController");
const productController = require('../controllers/user/productController')
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const wishlistController = require("../controllers/user/wishlistController");
const filterController = require("../controllers/user/filterController");
const walletController = require("../controllers/user/walletController");
const paymentController = require("../controllers/user/paymentController");
const couponController = require("../controllers/user/couponController");
const orderController = require("../controllers/user/orderController");
const passport = require("../config/passport"); 
const {userAuth,adminAuth} = require("../middlewares/auth");
const User = require('../models/userSchema');
const Cart = require("../models/cartSchema");
const Wishlist = require("../models/wishlistSchema");

router.use(checkUserBlocked); 

router.use(express.json()); 
router.use(async (req, res, next) => {
    const userData = await User.findById(req.session.user);
    res.locals.user = userData || null;
    next();
});



router.get("/",userController.loadHomepage);
router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/logout', userController.logout);
router.get('/signup',userController.loadsignup);
router.post('/signup',userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/signup" }),(req, res) => { 
    req.session.user = req.user;
     res.redirect("/");});


router.get('/forgot-password',profileController.getForgetPassPage);
router.post('/forgot-email-valid',profileController.forgotEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post('/resend-forgot-otp',profileController.resendForgotOtp);
router.post('/reset-password',profileController.postNewPassword);
router.get('/profile',userAuth,profileController.userprofile);
router.get('/change-email', userAuth, profileController.changeEmail);
router.post('/change-email', userAuth, profileController.changeEmailValid);
router.post('/verify-email-otp', userAuth, profileController.verifyEmailChangeOtp);
// router.post("/resend-email-otp",profileController.resendOtp);
router.post('/update-email', userAuth, profileController.updateEmail);
router.get('/change-password',userAuth,profileController.changePassword);
router.post('/change-password',userAuth,profileController.changePasswordValid);
router.post('/verify-changepassword-otp',userAuth,profileController.verifyChangepasswordOtp);

//address Management
router.get('/addAddress',userAuth,profileController.addAddress);
router.post('/addAddress',userAuth,profileController.postAddaddress);
router.get('/editAddress',userAuth,profileController.editAddress);
router.post('/editAddress',userAuth, profileController.updateAddress);
router.get('/deleteAddress',userAuth, profileController.deleteAddress);

//user cart
router.get('/cart',userAuth,cartController.loadCart);
router.post('/add-to-cart',userAuth,cartController.addcart);
router.post('/remove-cart-item',userAuth,cartController.removeCartItems);
router.post('/update-cart-quantity',userAuth, cartController.updateCart);


//order management
router.post('/place-order-initial',userAuth, orderController.placeOrderInitial);
router.get('/order-confirmation',userAuth, orderController.getOrderConfirmation);
router.post('/cancel-order', userAuth,orderController.cancelOrder);
router.get('/order-history', userAuth, orderController.getOrderHistory);
router.get('/download-invoice/:orderId',userAuth,orderController.generateInvoice);
router.post('/return-request',orderController.returnOrder)

// products management
router.get('/checkout',userAuth,productController.loadCheckout);
router.get('/product-details',productController.productDetails);
router.get('/all-products',productController.loadallProducts);
router.get('/allbrands',productController.getBrands);

//coupon management
router.get('/couponList',userAuth,couponController.getCoupons)
router.post('/apply-coupon',userAuth,couponController.applyCoupon)
router.post('/remove-coupon',userAuth,couponController.removeCoupon);

//wishlist management
router.post('/add-to-wishlist', userAuth,wishlistController.loadWishlist);
router.get('/wishlist', userAuth,wishlistController.renderWishlist);
router.post('/remove-wishlist-item',userAuth, wishlistController.removeWishlistItem);

//filter management
router.post('/sort-and-search',filterController.sortSearch);

//wallet management
router.get('/wallet',userAuth,walletController.loadWallet);

//payment management
router.post('/create-order',paymentController.createRazorpay);
router.post('/update-order',paymentController.updateOrder);
router.get('/retry-payment',paymentController.retryPayment);


router.use(userController.pageNotFound);

module.exports = router;