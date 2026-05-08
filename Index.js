const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ── User ─────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    username:       { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:       { type: String, required: true, minlength: 6 },
    avatar:         { type: String, default: "" },
    role:           { type: String, enum: ["user", "creator", "admin"], default: "user" },
    plan:           { type: String, enum: ["free", "standard", "premium"], default: "free" },
    stripeCustomerId:     { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },
    totalEarned:    { type: Number, default: 0 },
    downloads:      [{ type: mongoose.Schema.Types.ObjectId, ref: "Content" }],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.stripeCustomerId;
  delete obj.stripeSubscriptionId;
  return obj;
};

// ── Content ───────────────────────────────────────────────────────
const contentSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type:        { type: String, enum: ["movie", "music", "news", "video"], required: true },
    genre:       { type: String, required: true },
    creator:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileKey:     { type: String, required: true },   // S3 key
    fileUrl:     { type: String, default: "" },       // public thumbnail/preview URL
    thumbnailUrl:{ type: String, default: "" },
    price:       { type: Number, default: 0 },        // 0 = free
    isFree:      { type: Boolean, default: false },
    monetization:{
      paidDownload:   { type: Boolean, default: true },
      adSupported:    { type: Boolean, default: false },
      subscriptionOnly:{ type: Boolean, default: false },
      revenueShare:   { type: Boolean, default: true },
    },
    views:       { type: Number, default: 0 },
    downloads:   { type: Number, default: 0 },
    rating:      { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    published:   { type: Boolean, default: true },
    adRevenue:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

contentSchema.index({ type: 1, genre: 1 });
contentSchema.index({ title: "text", description: "text" });

// ── Purchase ──────────────────────────────────────────────────────
const purchaseSchema = new mongoose.Schema(
  {
    user:             { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content:          { type: mongoose.Schema.Types.ObjectId, ref: "Content", required: true },
    amount:           { type: Number, required: true },
    stripePaymentId:  { type: String, required: true },
    status:           { type: String, enum: ["pending", "completed", "refunded"], default: "completed" },
    downloadCount:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = {
  User:     mongoose.model("User", userSchema),
  Content:  mongoose.model("Content", contentSchema),
  Purchase: mongoose.model("Purchase", purchaseSchema),
};
