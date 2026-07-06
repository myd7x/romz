import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "Home" },
    governorate: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    street: { type: String, trim: true, required: true },
    apartment: { type: String, trim: true, default: "" }
  },
  { _id: true }
);

const otpSchema = new mongoose.Schema(
  {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, lowercase: true, trim: true, required: true, unique: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true, default: "" },
    role: { type: String, enum: ["admin", "user"], default: "user", index: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: otpSchema, default: () => ({}) },
    addresses: { type: [addressSchema], default: [] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    refreshTokenVersion: { type: Number, min: 0, default: 0 },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false }
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpiresAt;
  delete user.otp;
  delete user.refreshTokenVersion;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
