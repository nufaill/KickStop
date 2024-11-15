const express=require("express");
const  router = express.Router();
const userController = require("../controllers/user/userController");


router.get("/error",userController.pageNotFound);
router.get("/",userController.loadHomepage);
router.get('/login',userController.loadLogin);

router.use(userController.pageNotFound);
module.exports = router;