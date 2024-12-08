const express=require("express");
const  router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require('../controllers/user/productController')
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const wishlistController = require("../controllers/user/wishlistController");
const filterController = require("../controllers/user/filterController");
const walletController = require("../controllers/user/walletController");
const paymentController = require("../controllers/user/paymentController");
const passport = require("../config/passport"); 
const {userAuth,adminAuth} = require("../middlewares/auth");
const User = require('../models/userSchema')

router.use(express.json()); 
router.use(async (req, res, next) => {
    const userData = await User.findById(req.session.user);
    res.locals.user = userData || null;
    next();
});

router.use(async (req, res, next) => {
    if (req.path === "/login") {
        return next();
    }

    if (req.session.user) {
        const user = await User.findById(req.session.user);
        if (user && user.isBlocked) {
            return res.redirect("/login");
        } else if (user) {

            return next();
        }
    }
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
router.get('/checkout',userAuth,productController.loadCheckout);
router.post('/place-order-initial',userAuth, productController.placeOrderInitial);
router.get('/order-confirmation',userAuth, productController.getOrderConfirmation);
router.post('/cancel-order', userAuth,productController.cancelOrder);
router.get('/order-history', userAuth, productController.getOrderHistory);

// products management
router.get('/product-details',productController.productDetails);
router.get('/all-products',productController.loadallProducts);
router.get('/allbrands',productController.getBrands);

//coupon management
router.get('/couponList',userAuth,productController.loadCoupon);
router.post('/applyCoupon',userAuth,productController.postCoupon);
router.post('/remove-coupon',userAuth, productController.removeCoupon);





//wishlist management
router.post('/add-to-wishlist', userAuth,wishlistController.loadWishlist);
router.get('/wishlist', userAuth,wishlistController.renderWishlist);
router.post('/remove-wishlist-item',userAuth, wishlistController.removeWishlistItem);
//filter management
router.post('/sort-and-search',filterController.sortSearch);
//wallet management
router.get('/wallet',userAuth,walletController.loadWallet)
//payment management
router.post("/payment/initiate",userAuth,paymentController.loadRazorpay);
router.post("/payment/verify",userAuth,paymentController.verifyPayment);


router.use(userController.pageNotFound);

module.exports = router;