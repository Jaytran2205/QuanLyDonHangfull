import mongoose from "mongoose";

const permissionsSchema = new mongoose.Schema(
  {
    dashboard: { type: Boolean, default: false },
    customers: { type: Boolean, default: false },
    products: { type: Boolean, default: false },
    orders: { type: Boolean, default: false },
    users: { type: Boolean, default: false }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user"
    },
    permissions: {
      type: permissionsSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
