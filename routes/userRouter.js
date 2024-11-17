const express=require("express");
const  router = express.Router();
const userController = require("../controllers/user/userController");



router.get("/",userController.loadHomepage);
router.get('/login',userController.loadLogin);
router.get('/signup',userController.loadsignup);
router.post('/signup',userController.signup);

router.use(userController.pageNotFound);
module.exports = router;