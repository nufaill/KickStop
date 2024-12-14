const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');


const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(userId);

        const cartItems = await Cart.findOne({ userId }).populate('items.productId');

        if (!cartItems || cartItems.items.length === 0) {
            return res.render('cart', { cart: null, products: [], totalAmount: 0, user });
        }

        const totalAmount = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);

        res.render('cart', { cart: cartItems, products: cartItems.items, totalAmount, user });
    } catch (error) {
        console.error("Error loading cart", error);
        res.redirect('/page-not-found');
    }
};


const addcart = async (req, res) => {
    try {
        const productId = req.body.productId || req.query.id;
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const quantity = parseInt(req.body.quantity, 10) || 1;
        const totalPrice = product.salePrice * quantity;

        let cartDoc = await Cart.findOne({ userId });

        if (cartDoc) {
            const existingItemIndex = cartDoc.items.findIndex(item => item.productId.toString() === productId);

            if (existingItemIndex >= 0) {
                cartDoc.items[existingItemIndex].quantity += quantity;
                cartDoc.items[existingItemIndex].totalPrice += totalPrice;
            } else {
                cartDoc.items.push({
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice
                });
            }

            await cartDoc.save();
        } else {
            cartDoc = new Cart({
                userId,
                items: [{
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice
                }]
            });
            await cartDoc.save();
        }
        return res.status(200).json({ success: true, message: 'Product added to cart' })
    } catch (error) {
        console.error("Error adding to cart", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const removeCartItems = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;

        await Cart.findOneAndUpdate({ userId: userId },
            { $pull: { items: { productId: productId } } });

        res.redirect("/cart");

    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.redirect("/page-not-found");
    }
}

const updateCart = async (req, res) => {
    const { productId, change } = req.body;
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.json({ success: false, message: "User not logged in" });
        }
        const cartDoc = await Cart.findOne({ userId: userId });
        if (!cartDoc) {
            return res.json({ success: false, message: "Cart not found" });
        }

        const item = cartDoc.items.find((item) => item.productId.toString() === productId);
        if (item) {
            item.quantity += change;
            item.totalPrice = item.quantity * item.price;

            if (item.quantity <= 0) {
                cartDoc.items = cartDoc.items.filter((item) => item.productId.toString() !== productId);
            }

            cartDoc.totalPrice = cartDoc.items.reduce((total, item) => total + item.totalPrice, 0);
            await cartDoc.save();

            res.json({
                success: true,
                newQuantity: item.quantity,
                newSubtotal: item.totalPrice,
                totalPrice: cartDoc.totalPrice,
            });
        } else {
            res.json({ success: false, message: "Item not found in cart" });
        }

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Failed to update quantity" });
    }
};


module.exports = {
    loadCart,
    addcart,
    removeCartItems,
    updateCart
}