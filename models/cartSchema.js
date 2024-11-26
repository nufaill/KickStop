const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
        min: [1, "Quantity must be at least 1"],
      },
      price: {
        type: Number,
        required: true,
        min: [0, "Price must be non-negative"],
      },
      totalPrice: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ["Placed", "Cancelled", "Processing", "Shipped"],
        default: "Placed",
      },
      cancellationReason: {
        type: String,
        default: null,
      },
    },
  ],
});

cartSchema.pre("save", function (next) {
  this.items.forEach(item => {
    item.totalPrice = item.quantity * item.price;
  });
  next();
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
