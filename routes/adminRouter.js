const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const dashboardController =require("../controllers/admin/dashboardController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const stockController = require('../controllers/admin/stockController');
const couponController = require('../controllers/admin/couponController');
const salesController = require('../controllers/admin/salesController');
const {userAuth,adminAuth} = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer ({storage:storage});

//error-page
router.get('/pageerror',adminController.pageError)


router.get("/login", adminController.loadLogin);
router.post("/login",adminController.handleLogin); 
router.get('/', adminAuth,dashboardController.getDashboard);
 router.get("/logout",adminController.logout);

//customer Controller
router.get("/users",adminAuth,customerController.userInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);

//category Controller
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addcategoryoffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removecategoryoffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listcategory",adminAuth,categoryController.getListCategory);
router.get("/unlistcategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editcategory", adminAuth, categoryController.getEditCategory);
router.post("/editcategory/:id", adminAuth, categoryController.editCategory);

//brand Controller
router.get("/brands",adminAuth,brandController.getBrandpage)
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand)
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.get("/deleteBrand",adminAuth,brandController.deleteBrand);

//product Controller
router.get('/addproduct',adminAuth,productController.getProductAddPage);
router.post('/addproduct',adminAuth,uploads.array('images',4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.get('/blockproduct',adminAuth,productController.blockProduct);
router.get('/unblockproduct',adminAuth,productController.unBlockProduct);
router.get('/editproduct',adminAuth,productController.getEditProduct);
router.post('/editproduct/:id',adminAuth,uploads.array('images',4),productController.editProduct);
router.post('/addproductoffer',adminAuth,productController.addProductOffer);
router.post('/removeproductoffer',adminAuth,productController.removeProductOffer);
router.post('/deleteimage',adminAuth,productController.deleteSingleImage);

//order Controller
router.get('/orders', adminAuth, orderController.loadOrders);
router.post('/update-order-status', adminAuth, orderController.updateOrderStatus);


//stock Controller
router.get('/stocks',adminAuth,stockController.loadStock);
router.post('/update-stock',adminAuth,stockController.updateStock)

//coupon Controller
router.get('/coupons',adminAuth,couponController.loadCoupon);
router.post('/addcoupon',adminAuth,couponController.addCoupon);
router.get('/deleteCoupon',adminAuth,couponController.deleteCoupon);
router.get("/editCoupon",adminAuth,couponController.editCoupon);
router.post("/editCoupon",adminAuth,couponController.posteditCoupon); 

//sales Controller
router.get("/sales-report",adminAuth,salesController.loadSalesReport);
router.get('/sales-report/pdf',adminAuth, salesController.exportSalesToPDF);
router.get('/sales-report/excel',adminAuth, salesController.exportSalesToExcel);

module.exports = router;