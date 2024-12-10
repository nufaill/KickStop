const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const sortSearch = async (req, res) => {
    try {
        const { 
            search = '', 
            category = 'all-categories', 
            sort = 'default', 
            page = 1, 
            limit = 8 
        } = req.body;

        let SortingCondition;
        let query = { isBlocked: false };


        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } }, 
                { description: { $regex: search, $options: 'i' } }  
            ];
        }

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

        // const query = {
        //     productName: { $regex: search, $options: 'i' }, 
        // };

        
        if (category !== 'all-categories') {
            if (['Mens', 'Womens', 'Kids'].includes(category)) {
                query.category = category;
            } else {
                query.category = category;
            }
        }

        const skip = (page - 1) * limit;

        const [products, totalCount] = await Promise.all([
            Product.find(query)
                .sort(SortingCondition)
                .skip(skip)
                .limit(limit),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({ 
            products, 
            totalPages, 
            currentPage: page 
        });
    } catch (error) {
        console.error("Error in sort and search:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    sortSearch,
};