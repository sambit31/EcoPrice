const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amazonPrice: { type: Number, required: true },
  flipkartPrice: { type: Number, required: true },
  ecoScore: Number,
  image: String,
  similarityScore: Number,
  priceHistory: [{ date: Date, amazonPrice: Number, flipkartPrice: Number }]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);