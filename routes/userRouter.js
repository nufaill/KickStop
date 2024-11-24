const express=require("express");
const  router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require('../controllers/user/productController')
const profileController = require("../controllers/user/profileController");
const passport = require("../config/passport"); 
const {userAuth,adminAuth} = require("../middlewares/auth");
const User = require('../models/userSchema')


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
router.get('/forgot-password',profileController.getForgetPassPage);
router.post('/forgot-email-valid',profileController.forgotEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post('/resend-forgot-otp',profileController.resendOtp);
router.post('/reset-password',profileController.postNewPassword);


router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/signup" }),(req, res) => { console.log('Google Auth Success:', req.user); res.redirect("/");});

router.get('/product-details',productController.productDetails)

router.use(userController.pageNotFound);
module.exports = router;