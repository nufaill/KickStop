const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');

const loadWishlist = async (req, res) => {
    try {
        const {ProductId} = req.body;
        const userId = req.session.user;
        if(!userId){
            return res.redirect("/login");
        }
        const wishlist = await Wishlist.findOne({userId:userId });
        if(wishlist){
            const productExists = wishlist.products.some(item => item.productId.toString() === ProductId);

            if(!productExists){
                wishlist.products.push({ ProductId });
                await wishlist.save();

            }
        }else{
            wishlist = new Wishlist({
                userId: user,
                products: [{ ProductId }]
            });
            await wishlist.save();
        }
        res.redirect('/wishlist');
        }catch (error) {
        
    }
}

module.exports={
    loadWishlist
}