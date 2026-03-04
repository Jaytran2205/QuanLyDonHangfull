import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        productName: {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true,
          min: 0
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        total: {
          type: Number,
          required: true,
          min: 0
        }
      }
    ],
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },
    invoiceImage: {
      type: String,
      default: null
    },
    exportDate: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Order", orderSchema);
