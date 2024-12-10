const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema');
const moment = require('moment');
const { json } = require('express');
const crypto = require('crypto');

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
        const addresses = addressDoc ? addressDoc : []; // Change this line
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

const placeOrderInitial = async (req, res) => {
    try {
        const { singleProduct, totalPrice, addressId, paymentMethod,discountInput } = req.body;

        const user = req.session.user;
        const cart = await Cart.findOne({ userId: user })

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!addressId || (!cart && !singleProduct)) {
            return res.status(400).json({ success: false, message: "Invalid input" });
        }

        if (paymentMethod === "COD") {
            const orderItems = [];
            if (singleProduct) {
                const product = await Product.findById(singleProduct);
                if (!product) {
                    return res.status(404).json({ success: false, message: "Product not found" });
                }
                orderItems.push({
                    productId: product._id,
                    quantity: 1,
                    price: product.salePrice,
                });
            } else if (cart) {
                for (const item of cart.items) {
                    const product = await Product.findById(item.productId);
                    console.log('product ---->', item);
                    if (!product) {
                        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
                    }
                    orderItems.push({
                        productId: product._id,
                        quantity: item.quantity,
                        price: product.salePrice * item.quantity,
                    });
                }
            }
            // console.log(discountInput)
            let total = Number(discountInput) + Number(totalPrice);
            // console.log(total)

            const newOrder = new Order({
                user,
                items: orderItems,
                totalPrice:total,
                discount:discountInput,
                finalAmount:totalPrice,
                status: "Pending",
                shippingAddress: addressId,
                paymentMethod: "COD",
                paymentStatus: "Pending",
            });

            await newOrder.save();

            if (cart) {
                await Cart.findOneAndDelete({ userId: user });
            }
            
            return res.json({
                success: true,
                orderId: newOrder._id,
            });
        } else {
            return res.json({ success: false, message: "Invalid payment method" });
        }
    } catch (error) {
        console.error("Error placing order", error);
        res.status(500).json({ success: false, message: "Failed to place order", errorDetails: error.message });
    }
};

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

        res.render('order-confirmation', {
            order,
            orderNumber: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
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

        if (order.paymentMethod.toLowerCase() !== 'online') {
            return res.status(403).json({ success: false, message: 'Cannot cancel this order' });
        }

        const userId = req.session?.user;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not authenticated' });
        }

        const amount = order.finalAmount;
        let wallet = await Wallet.findOne({ userId });
        // console.log('Wallet Before Update:', wallet);

        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: amount,
                transactions: [{
                    type: 'refund',
                    amount,
                    orderId,
                    description: 'Order refund',
                }],
            });
        } else {
            wallet.balance += amount;
            wallet.transactions.push({
                type: 'Refund',
                amount,
                orderId,
                description: 'Order refund',
            });
        }

        await wallet.save();
        // console.log('Wallet After Update:', wallet);

        order.status = 'Cancelled';
        await order.save();

        return res.json({ success: true, message: 'Order cancelled and refund processed successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};


const getOrderHistory = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 3; 
        const skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments({ user });
        const totalPages = Math.ceil(totalOrders / limit);
        const orders = await Order.find({ user })
            .populate(['items.productId', 'shippingAddress'])
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        res.render('order-details', {
            orders,
            moment,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        handleError(res, error, 'Error fetching order history');
    }
};

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

        console.log("Coupon Data:", coupon);

        if (!coupon) {
            return res.json({
                success: false,
                message: 'Invalid or expired coupon code'
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

        if (coupon.minimumPrice && totalAmount < coupon.minimumPrice) {
            return res.json({
                success: false,
                message: `Minimum purchase amount of ${coupon.minimumPrice} required`
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
        console.error('invalid  coupon:', error);
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
 

module.exports = {
    productDetails,
    getBrands,
    loadallProducts,
    loadCheckout,
    placeOrderInitial,
    getOrderConfirmation,
    cancelOrder,
    getOrderHistory,
    loadCoupon,
    postCoupon,
    removeCoupon,

};
