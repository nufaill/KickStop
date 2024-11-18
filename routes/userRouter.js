const express=require("express");
const  router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("../config/passport"); 



router.get("/",userController.loadHomepage);
router.get('/login',userController.loadLogin);
router.post('/login',userController.login);
router.get('/signup',userController.loadsignup);
router.post('/signup',userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/signup" }),(req, res) => { console.log('Google Auth Success:', req.user); res.redirect("/");});



router.use(userController.pageNotFound);
module.exports = router;