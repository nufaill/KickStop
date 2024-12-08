const Wallet = require('../../models/walletSchema');

const loadWallet = async (req,res) => {
    try {
        if(!req.session.user || !req.session.user._id){
            return res.redirect("/login");
        }
        const userId = req.session.user._id;
        const wallet = await Wallet.findOne({userId}).populate("transactions.orderId");

        if(!wallet){
            return res.render("wallet", {wallet:{balance:0, transactions:[]}});
        }
        
        wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.render("wallet", {wallet});
    } catch (error) {
        console.error("Error loading wallet page",error);
        res.redirect("/pageNotFound");
    }
}

module.exports ={
    loadWallet
}