const Product = require('../../models/productSchema');

const productDetails = async (req, res) => {
    try {

        const productId = req.query.productId;
        console.log(productId);

        const product = await Product.findById(productId).populate('category');
        const relatedProducts = await Product.find({ category: product.category, isBlocked: false, _id: { $ne: product._id } })

        res.render('product-details', { product, relatedProducts });

    } catch (error) {
        console.error("Error loading product details page", error);
    }
}

module.exports = {
    productDetails
}