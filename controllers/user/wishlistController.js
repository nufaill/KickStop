const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');

const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login first' });
        }

        const productId = req.body.productId; 
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (wishlist) {
            const productExists = wishlist.products.some(item => 
                item.productId && item.productId.toString() === productId
            );

            if (!productExists) {
                wishlist.products.push({ 
                    productId: productId 
                });
                await wishlist.save();
                return res.status(200).json({ success: true, message: 'Product added to wishlist' });
            } else {
                return res.status(200).json({ success: false, message: 'Product already in wishlist' });
            }
        } else {
            wishlist = new Wishlist({
                userId: userId,
                products: [{ 
                    productId: productId 
                }]
            });
            await wishlist.save();
            return res.status(200).json({ success: true, message: 'Product added to wishlist' });
        }
    } catch (error) {
        console.error('Error in loadWishlist:', error);
        res.status(500).json({ success: false, message: 'An error occurred while processing the wishlist' });
    }
}

const renderWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
        
        res.render('wishlist', { 
            products: wishlist ? wishlist.products : []
        });
    } catch (error) {
        console.error('Error rendering wishlist:', error);
        res.status(500).send('An error occurred while loading the wishlist');
    }
}

const removeWishlistItem = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.body.productId;

        if (!userId) {
            return res.redirect("/login");
        }

        await Wishlist.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId } } }
        );

        res.redirect('/wishlist');
    } catch (error) {
        console.error('Error removing wishlist item:', error);
        res.status(500).send('An error occurred while removing the item');
    }
}

module.exports = {
    loadWishlist,
    renderWishlist,
    removeWishlistItem
};