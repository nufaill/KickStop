const pageNotFound = async (req, res) => {
    try {
        return res.status(404).render("error", {
            errorCode: 404,
            message: "Page Not Found"
        });
    } catch (error) {
        console.log(error);
        res.status(500).redirect("/error");
    }
};

const loadHomepage = async (req,res) => {
    try {
        return res.render("home");
    } catch (error) {
        console.log("Home page not found",error);
        res.status(500).send("Server error");

    }
};
const loadLogin = async (req,res) => {
    try {
        return res.render("login");
    } catch (error) {
        console.log("login page not found",error);
        res.status(500).send("Server error");

    }
};


module.exports={
    loadHomepage,
    loadLogin,
    pageNotFound
}