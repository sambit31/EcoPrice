const Product = require('../models/Product');
const { fetchProducts } = require('../services/productService');

exports.searchProducts = async (req, res) => {
 try {
   console.log('Search query:', req.query.q);
   const products = await fetchProducts(req.query.q);
   
   // Mock dynamic products with search query
   const mockProducts = [
     {
       id: 1,
       name: `${req.query.q} Premium`, 
       amazonPrice: 899,
       flipkartPrice: 799,
       ecoScore: 9,
       similarityScore: 95,
       image: '/placeholder.png'
     },
     {
       id: 2,
       name: `${req.query.q} Standard`,
       amazonPrice: 599, 
       flipkartPrice: 549,
       ecoScore: 7,
       similarityScore: 85,
       image: '/placeholder.png'
     }
   ];

   res.json(mockProducts);
 } catch (error) {
   console.error('Server error:', error);
   res.status(500).json({ error: error.message });
 }
};

exports.getPriceHistory = async (req, res) => {
 try {
   const product = await Product.findById(req.params.id);
   res.json(product.priceHistory);
 } catch (error) {
   res.status(500).json({ error: error.message });
 }
};