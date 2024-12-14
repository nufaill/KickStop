const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Address = require('../../models/addressSchema');

const handleError = (res, error, customMessage = 'An error occurred') => {
    console.error(customMessage, error);
    res.status(500).render('error-page', { message: customMessage });
};

const productDetails = async (req, res) => {
    try {
        const productId = req.query.productId;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).render('error-page', { message: 'Invalid product ID' });
        }

        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).render('error-page', { message: 'Product not found' });
        }

        const relatedProducts = await Product.find({
            category: product.category,
            isBlocked: false,
            _id: { $ne: product._id }
        });

        res.render('product-details', { product, relatedProducts });
    } catch (error) {
        handleError(res, error, 'Error loading product details page');
    }
};

// Fetch brands
const getBrands = async (req, res) => {
    try {
        const brands = await Brand.find({ isBlocked: false });
        res.render('userbrands', { brands });
    } catch (error) {
        handleError(res, error, 'Error loading brands page');
    }
};

const loadallProducts = async (req, res) => {
    try {
        const limit = 8;
        const page = Math.max(1, parseInt(req.query.page) || 1);

        const [products, count, categories] = await Promise.all([
            Product.find({ isBlocked: false })
                .limit(limit)
                .skip((page - 1) * limit),
            Product.countDocuments(),
            Category.find({ isListed: true })
        ]);

        const totalPages = Math.ceil(count / limit);
        res.render('all-products', {
            products,
            categories,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        handleError(res, error, 'Error loading all products');
    }
};

const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const addressDoc = await Address.find({ userId: user });
        const addresses = addressDoc ? addressDoc : []; 
        let totalPrice = 0;

        if (req.query.id) {
            const productId = req.query.id;
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.redirect('/pageerror');
            }

            const product = await Product.findOne({ _id: productId, isBlocked: false });
            if (!product) {
                return res.redirect('/pageerror');
            }

            totalPrice = product.salePrice;
            return res.render('checkout', {
                cart: null,
                product,
                addresses, 
                totalAmount: totalPrice
            });
        } else {
            const cartItems = await Cart.findOne({ userId: user }).populate({
                path: 'items.productId',
                model: 'Product'
            });
            if (!cartItems || cartItems.items.length === 0) {
                return res.render('checkout', {
                    cart: null,
                    products: [],
                    addresses, 
                    totalAmount: totalPrice,
                    product: null
                });
            }

            totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
            res.render('checkout', {
                cart: cartItems,
                products: cartItems.items,
                addresses, 
                totalAmount: totalPrice,
                product: null
            });
        }
    } catch (error) {
        handleError(res, error, 'Error loading checkout page');
    }
};

module.exports = {
    productDetails,
    getBrands,
    loadallProducts,
    loadCheckout
};
