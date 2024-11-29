const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const moment = require('moment');

// Utility for error handling
const handleError = (res, error, customMessage = 'An error occurred') => {
    console.error(customMessage, error);
    res.status(500).render('error-page', { message: customMessage });
};

// Fetch product details
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

// Fetch all products with pagination
const loadallProducts = async (req, res) => {
    try {
        const limit = 16;
        const page = Math.max(1, parseInt(req.query.page) || 1);

        const [products, count, categories] = await Promise.all([
            Product.find({ isBlocked: false })
                .limit(limit)
                .skip((page - 1) * limit),
            Product.countDocuments(),
            Category.find({ isListed: false })
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

// Load checkout page
const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const addressDoc = await Address.findOne({ userId: user });
        const addressesList = addressDoc ? addressDoc.addresses : [];
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
                address: addressesList,
                totalPrice
            });
        } else {
            const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
            if (!cartItems || cartItems.items.length === 0) {
                return res.render('checkout', {
                    cart: null,
                    products: [],
                    address: addressesList,
                    totalPrice,
                    product: null
                });
            }

            totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
            res.render('checkout', {
                cart: cartItems,
                products: cartItems.items,
                address: addressesList,
                totalPrice,
                product: null
            });
        }
    } catch (error) {
        handleError(res, error, 'Error loading checkout page');
    }
};

// Place an order
const placeOrderInitial = async (req, res) => {
    try {
        const { cart, singleProduct, totalPrice, addressId, payment_method } = req.body;
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Validate input
        if (!addressId || !payment_method || (!cart && !singleProduct)) {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }

        let orderItems = [];
        let finalAmount = totalPrice;

        if (singleProduct) {
            const product = await Product.findById(singleProduct._id);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }

            orderItems.push({
                productId: product._id,
                quantity: 1,
                price: product.salePrice
            });
        } else if (cart) {
            const parsedCart = typeof cart === 'string' ? JSON.parse(cart) : cart;

            for (const item of parsedCart) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
                }

                orderItems.push({
                    productId: product._id,
                    quantity: item.quantity,
                    price: product.salePrice * item.quantity
                });
            }
        }

        const newOrder = new Order({
            user,
            items: orderItems,
            totalPrice: finalAmount,
            finalAmount,
            status: 'Pending',
            shippingAddress: addressId,
            paymentMethod: payment_method,
            paymentStatus: 'Pending'
        });

        await newOrder.save();

        res.json({
            success: true,
            orderId: newOrder._id,
            orderNumber: `ORD-${newOrder._id.toString().slice(-8).toUpperCase()}`
        });
    } catch (error) {
        handleError(res, error, 'Error placing order');
        res.status(500).json({ success: false, message: 'Failed to place order', errorDetails: error.message });
    }
};

// Order confirmation
const getOrderConfirmation = async (req, res) => {
    try {
        const orderId = req.query.id;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.redirect('/error');
        }

        const order = await Order.findById(orderId).populate('items.productId').populate('shippingAddress');
        if (!order) {
            return res.redirect('/error');
        }

        const orderNumber = `ORD-${order._id.toString().slice(-8).toUpperCase()}`;

        res.render('order-confirmation', {
            order,
            orderNumber,
            totalAmount: order.finalAmount
        });
    } catch (error) {
        handleError(res, error, 'Error fetching order confirmation');
    }
};


const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = 'Cancelled';
        await order.save();

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        handleError(res, error, 'Error cancelling order');
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};

const getOrderHistory = async (req, res) => {
  try {
      const user = req.session.user;
      if (!user) {
          return res.redirect('/login');
      }

      const orders = await Order.find({ user })
          .populate('items.productId')
          .sort({ createdAt: -1 });

      res.render('order-details', { 
          orders,
          moment
      });
  } catch (error) {
      handleError(res, error, 'Error fetching order history');
  }
};

module.exports = {
    productDetails,
    getBrands,
    loadallProducts,
    loadCheckout,
    placeOrderInitial,
    getOrderConfirmation,
    cancelOrder,
    getOrderHistory
};
