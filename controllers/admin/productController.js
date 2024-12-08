const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render('add-product', {
            cat: category,
            brand: brand
        });
    } catch (error) {
        console.error("Error fetching categories and brands:", error);
        res.status(500).render('page-error', { message: "Failed to load categories and brands" });
    }
};



const addProducts = async (req, res) => {
    try {
        const products = req.body;
        if (!products.productName || !products.category || !products.brand) {
            console.error("Missing required fields:", products);
            return res.status(400).json("Please provide all required fields.");
        }
        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            console.warn("Product already exists:", products.productName);
            return res.status(400).json("Product already exists, please try with another name.");
        }
        const uploadDir = path.join("public", "uploads", "product-images");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join(uploadDir, req.files[i].filename);

                try {
                    await sharp(originalImagePath)
                        .resize({ width: 440, height: 440 })
                        .toFile(resizedImagePath);

                    images.push(req.files[i].filename);
                } catch (err) {
                    console.error("Image processing error:", err);
                    return res.status(500).json("Failed to process image.");
                }
            }
        }
        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            console.error(`Invalid category: ${products.category}`);
            return res.status(400).json("Invalid category name.");
        }

        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            createdAt: new Date(),
            quantity: products.quantity,
            size: products.size,
            color: products.color,
            productImage: images,
            status: "Available",
        });

        await newProduct.save();
        console.info("Product added successfully:", products.productName);
        return res.redirect('/admin/addproduct');
    } catch (error) {
        console.error("Error adding product:", error);
        return res.status(500).render('page-error', { message: "An error occurred while adding the product." });
    }
};

const getAllProducts = async (req,res) => {
    try {
        
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;
        
        const productData = await Product.find({
             $or:[
                {productName:{$regex:".*"+search+".*",$options:"i"}},
                {brand:{$regex:".*"+search+".*",$options:"i"}}
             ]
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec();
        const count = await Product.find({
            $or:[
                {productName:{$regex:".*"+search+".*",$options:"i"}},
                {brand:{$regex:".*"+search+".*",$options:"i"}}
            ]
        }).countDocuments();

        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});

        if(category && brand){
            res.render('products',{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                // cat:category,
                // brand:brand
            });
        }else{
            res.render("")
        }

    } catch (error) {
        res.redirect('/admin/pageerror');
        res.status(500).json({status:false,message:"Internal server error"})
    }
}

const blockProduct = async (req,res) => {
    try {
        
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products');

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const unBlockProduct = async (req,res) => {
    try {
        
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/products')

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const getEditProduct = async (req,res) => {
    try {
        
        const id = req.query.id;
        const product = await Product.findOne({_id:id});
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render('edit-product',{
            message:"",
            product:product,
            cat:category,
            brand:brand,
        });

    } catch (error) {
        res.redirect('/admin/pageerror');
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        
        // Enhanced Validation
        if (!data.productName || !data.category || !data.brand) {
            return res.status(400).json({
                error: "Missing required fields",
                details: {
                    productName: !data.productName,
                    category: !data.category,
                    brand: !data.brand
                }
            });
        }

        // Existing Duplicate Check
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({
                error: "Product with this name already exists"
            });
        }

        // Enhanced Image Handling
        const images = [];
        const MAX_IMAGES = 4;

        if (req.files && req.files.length > 0) {
            if (req.files.length > MAX_IMAGES) {
                return res.status(400).json({
                    error: `Maximum ${MAX_IMAGES} images allowed`
                });
            }
        
            req.files.forEach(file => {
                images.push(file.filename);
            });
        }
        
        // If new images are uploaded
        if (images.length > 0) {
            updateData.$push = { productImage: { $each: images } };
        }
        const category = await Category.findOne({ name: data.category });
        if (!category) {
            return res.status(400).json({ error: "Invalid category" });
        }

        const updateData = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: category._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice || data.regularPrice,
            quantity: data.quantity,
            color: data.color
        };

        // Only update images if new images are uploaded
        if (images.length > 0) {
            updateData.$push = { productImage: { $each: images } };
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.redirect('/admin/products');
    } catch (error) {
        console.error("Edit Product Error:", error);
        res.status(500).json({ 
            error: "Internal server error", 
            details: error.message 
        });
    }
};
const addProductOffer = async (req, res) => {
    try {
      const { productId, percentage } = req.body;
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ status: false, message: "Product not found" });
      }
  
      product.productOffer = parseInt(percentage, 10);
      const category = await Category.findById(product.category);
      const effectiveOffer = category ? Math.max(percentage, category.categoryOffer) : percentage;
      product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (effectiveOffer / 100));
      await product.save();
  
      res.json({ status: true });
    } catch (error) {
      console.error("Error adding product offer:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  };
  

const removeProductOffer = async (req,res) => {
    try {
        
        const {productId} = req.body;
        const findProduct = await Product.findOne({_id:productId});
        findProduct.salePrice = findProduct.regularPrice;
        findProduct.productOffer = 0;
        await findProduct.save();
        return res.json({status:true});

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}
const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        
        if (!imageNameToServer || !productIdToServer) {
            return res.json({ 
                status: false, 
                message: 'Missing required parameters' 
            });
        }

        // Find the product
        const product = await Product.findById(productIdToServer);
        
        if (!product) {
            return res.json({ 
                status: false, 
                message: 'Product not found' 
            });
        }

        // Check minimum image requirement
        if (product.productImage.length <= 1) {
            return res.json({ 
                status: false, 
                message: 'Cannot delete the last product image' 
            });
        }

        // Remove image from array
        const updatedImages = product.productImage.filter(img => img !== imageNameToServer);
        
        // Update product with new image array
        await Product.findByIdAndUpdate(
            productIdToServer,
            { $set: { productImage: updatedImages } },
            { new: true }
        );

        // Delete physical file
        const imagePath = path.join(__dirname, '../../public/uploads/product-images', imageNameToServer);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        res.json({ 
            status: true, 
            message: 'Image deleted successfully' 
        });

    } catch (error) {
        console.error('Error in deleteSingleImage:', error);
        res.json({ 
            status: false, 
            message: 'Internal server error' 
        });
    }
};


module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    addProductOffer,
    removeProductOffer,
    deleteSingleImage
};
