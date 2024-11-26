const express = require('express');
const router = express.Router();
const { fetchProducts, ProductServiceError } = require('../services/productService');

router.get('/products', async (req, res) => {
  const { 
    query,
    page = '1',
    currency = 'USD'  // Optional currency preference
  } = req.query;
  
  console.log('Received product search request:', { 
    query, 
    page,
    currency
  });
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_QUERY',
        message: 'Missing query parameter'
      }
    });
  }

  try {
    console.log('Attempting to fetch products for query:', query);
    const result = await fetchProducts(query, page);
    
    console.log(`Successfully fetched ${result.count} products`);
    res.json(result);

  } catch (error) {
    console.error('Product fetch error:', {
      name: error.name,
      message: error.message,
      source: error.source,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    if (error instanceof ProductServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.source.toUpperCase(),
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.details : undefined
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;