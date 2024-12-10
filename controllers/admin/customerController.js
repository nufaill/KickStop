const { query } = require("express");
const User = require("../../models/userSchema");

const userInfo = async (req, res) => {
    try {
        // Handle search query
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        // Handle pagination
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }
        const limit = 10;

        // Fetch user data based on search and pagination
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { username: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        // Count total documents for pagination
        const count = await User.find({
            isAdmin: false,
            $or: [
                { username: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        }).countDocuments();

        res.render("customers", {
            data: userData,
            currentPage: page, 
            totalPages: Math.ceil(count / limit),
            search,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
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
