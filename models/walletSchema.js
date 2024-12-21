const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    balance: { 
        type: Number, 
        default: 0 
    },
    transactions: [{
        amount: { 
            type: Number, 
            required: true 
        },        
        type: { 
            type: String, 
            enum: ['credit', 'Debit', 'Refund', 'Purchase'], 
            required: true 
        },        
        description: { 
            type: String 
        },
        orderId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Order' 
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed'],
            default: 'Completed'
        },
        date: {
            type: Date, 
            default: Date.now 
        }
    }]
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;