const mongoose = require("mongoose");

const pageContentSchema = new mongoose.Schema(
  {
    pageKey: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    content: { type: Map, of: String, default: {} },
    styles: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    layout: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PageContent", pageContentSchema);
