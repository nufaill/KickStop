const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema'); 
const Address = require('../../models/addressSchema')

const productDetails = async (req, res) => {
    try {
        const productId = req.query.productId;
        const product = await Product.findById(productId).populate('category');
        const relatedProducts = await Product.find({ 
            category: product.category, 
            isBlocked: false, 
            _id: { $ne: product._id } 
        });

        res.render('product-details', { product, relatedProducts });
    } catch (error) {
        console.error("Error loading product details page", error);
        res.status(500).render('error-page', { message: 'Unable to load product details.' });
    }
}

const getBrands = async (req, res) => {
    try {
        const brands = await Brand.find({ isBlocked: false });
        res.render('userbrands', { brands });
    } catch (error) {
        console.error("Error loading brands page", error);
        res.status(500).render('error-page', { message: 'Unable to load brands.' });
    }
}

const loadallProducts = async (req, res) => {
    try {
        const limit = 16;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        
        const products = await Product.find({isBlocked: false})
            .limit(limit)
            .skip((page - 1) * limit);
        
        const count = await Product.countDocuments();
        const totalPages = Math.ceil(count / limit);
        
        // Fetch categories
        const categories = await Category.find({isListed:false});
        
        res.render('all-products', {
            products,
            categories,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('Error loading all products:', error);
        res.status(500).render('error-page', { message: 'Unable to load products at this time.' });
    }
}

const loadCheckout = async (req, res) => {
    try {
      const user = req.session.user;
  
      if (!user) {
        return res.redirect('/login');
      }
  
      // Fetch user addresses
      const addressDoc = await Address.findOne({ userId: user });
      const addressesList = addressDoc ? addressDoc.addresses : [];
  
      let totalPrice = 0;
  
      if (req.query.id) {
        const productId = req.query.id;
  
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res.redirect('/pageerror');
        }
  
        // Fetch the product
        const product = await Product.findOne({ _id: productId, isBlocked: false });
        if (!product) {
          return res.redirect('/pageerror');
        }
  
        // Render checkout for a single product
        totalPrice = product.salePrice;
        return res.render('checkout', {
          cart: null,
          product,
          address: addressesList,
          totalPrice,
        });
      } else {
        // Fetch cart items for the user
        const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
        if (!cartItems || cartItems.items.length === 0) {
          return res.render('checkout', {
            cart: null,
            products: [],
            address: addressesList,
            totalPrice,
            product: null,
          });
        }
  
        // Calculate total price for all items in the cart
        totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
        // Render checkout for cart
        return res.render('checkout', {
          cart: cartItems,
          products: cartItems.items,
          address: addressesList,
          totalPrice,
          product: null,
        });
      }
    } catch (error) {
      console.error("Error loading checkout page:", error.message || error);
      res.redirect('/pageerror');
    }
  };
  

module.exports = {
    productDetails,
    getBrands,
    loadallProducts,
    loadCheckout
}
