const Wallet = require('../../models/walletSchema');

const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        let wallet = await Wallet.findOne({ userId: userId });
        
        if (!wallet) {
            wallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        res.render('wallet', { wallet });

    } catch (error) {
        console.error("Error loading wallet", error);
        res.redirect('admin/pageerror');
    }
}

module.exports ={
    loadWallet
}