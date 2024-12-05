const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const sortSearch = async (req, res) => {
    try {
        const { search = '', category = 'all-categories', sort = 'default' } = req.body;
        let SortingCondition;

        switch (sort) {
            case 'popularity':
                SortingCondition = { popularity: -1 };
                break;
            case 'price-low-high':
                SortingCondition = { salePrice: 1 };
                break;
            case 'price-high-low':
                SortingCondition = { salePrice: -1 };
                break;
            case 'rating':
                SortingCondition = { rating: -1 };
                break;
            case 'new-arrivals':
                SortingCondition = { createdAt: -1 };
                break;
            case 'alphabetical-a-z':
                SortingCondition = { productName: -1 };
                break;
            case 'alphabetical-z-a':
                SortingCondition = { productName: 1 };
                break;
            default:
                SortingCondition = { createdAt: -1 };
        }

        const query = {
            productName: { $regex: search, $options: 'i' }, 
        };

        // Handle category filtering
        if (category !== 'all-categories') {
            // For standard categories (Mens, Womens, Kids)
            if (['Mens', 'Womens', 'Kids'].includes(category)) {
                query.category = category;
            } else {
                // For other custom categories (using _id)
                query.category = category;
            }
        }

        const products = await Product.find(query).sort(SortingCondition);
        res.status(200).json({ products });
    } catch (error) {
        console.error("Error in sort and search:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    sortSearch,
};