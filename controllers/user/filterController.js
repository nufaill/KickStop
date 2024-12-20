const mongoose = require('mongoose');
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const sortSearch = async (req, res) => {
    try {
        const { 
            search = '', 
            category = 'all-categories', 
            sort = 'default', 
            page = 1
        } = req.body;

        const limit = 8; 
        let sortingCondition;
        let query = { isBlocked: false };
        
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } }, 
                { description: { $regex: search, $options: 'i' } }  
            ];
        }

        if (category && category !== 'all-categories') {
            try {
                // Validate if the category is a valid MongoDB ObjectId
                if (!mongoose.Types.ObjectId.isValid(category)) {
                    return res.status(400).json({ 
                        success: false, 
                        error: "Invalid category ID" 
                    });
                }
                
                const categoryDoc = await Category.findById(category);
                if (categoryDoc) {
                    query.category = categoryDoc._id;
                } else {
                    return res.status(404).json({ 
                        success: false, 
                        error: "Category not found" 
                    });
                }
            } catch (err) {
                console.log("Category lookup error:", err);
                return res.status(500).json({ 
                    success: false, 
                    error: "Error processing category filter" 
                });
            }
        }

        switch (sort) {
            case 'popularity':
                sortingCondition = { popularity: -1 };
                break;
            case 'price-low-high':
                sortingCondition = { salePrice: 1 };
                break;
            case 'price-high-low':
                sortingCondition = { salePrice: -1 };
                break;
            case 'rating':
                sortingCondition = { rating: -1 };
                break;
            case 'new-arrivals':
                sortingCondition = { createdAt: -1 };
                break;
            case 'alphabetical-a-z':
                sortingCondition = { productName: -1 };
                break;
            case 'alphabetical-z-a':
                sortingCondition = { productName: 1 };
                break;
            default:
                sortingCondition = { createdAt: -1 };
        }

        const skip = (parseInt(page) - 1) * limit;

        const [products, totalCount] = await Promise.all([
            Product.find(query)
                .populate('category', 'name')
                .sort(sortingCondition)
                .skip(skip)
                .limit(limit),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({ 
            success: true,
            products,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalProducts: totalCount,
                limit
            }
        });
    } catch (error) {
        console.error("Error in sort and search:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

module.exports = {
    sortSearch
};