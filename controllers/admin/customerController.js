const { query } = require("express");
const User = require("../../models/userSchema");

const userInfo = async (req, res) => {
    try {
        const search = req.query.search || ""; // Get search term from query
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = 4; // Number of users per page
        const skip = (page - 1) * limit;

        // Construct the query with search filter
        const query = {
            isAdmin: false,
            ...(search && { 
                $or: [
                    { username: { $regex: ".*" + search + ".*", $options: "i" } },
                    { email: { $regex: ".*" + search + ".*", $options: "i" } },
                ],
            }),
        };

        // Get filtered user data with pagination
        const userData = await User.find(query).skip(skip).limit(limit);

        // Get total count of users matching the query
        const totalCategories = await User.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);

        // Render the view with pagination and data
        res.render("customers", {
            data: userData,
            currentPage: page,
            totalPages: totalPages,
            search, // Pass the search term back to the view
        });
    } catch (error) {
        console.error("Error in userInfo controller:", error);
        res.status(500).send("Internal Server Error");
    }
};



const customerBlocked = async (req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id: id},{$set:{isBlocked:true}});
        res.redirect("/admin/users")
    } catch (error) {
        console.error("user blocked section error ",error);
    }
}
const customerunBlocked = async (req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id: id},{$set:{isBlocked:false}});
        res.redirect("/admin/users")
    } catch (error) {
        console.error("user unblocked section error ",error);
    }
}



module.exports = {
    userInfo,
    customerBlocked,
    customerunBlocked
};
