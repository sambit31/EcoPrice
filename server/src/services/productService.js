const axios = require('axios');

class ProductServiceError extends Error {
  constructor(message, source, statusCode, details = null) {
    super(message);
    this.name = 'ProductServiceError';
    this.source = source;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const normalizePrice = (priceStr, currency = 'USD') => {
  try {
    if (typeof priceStr === 'number') return { amount: priceStr, currency };
    if (!priceStr) return { amount: 0, currency };
    
    const amount = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
    return { amount, currency };
  } catch (error) {
    console.warn('Price normalization failed:', error);
    return { amount: 0, currency };
  }
};

const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  // Common colors and their variations
  const colorMap = {
    black: ['midnight', 'graphite', 'space grey', 'space gray', 'cosmic black'],
    white: ['starlight', 'pearl', 'cream', 'arctic'],
    blue: ['navy', 'pacific', 'sierra blue', 'sky'],
    red: ['product red', 'crimson', 'burgundy', '(red)', 'wine'],
    purple: ['violet', 'lavender', 'mauve', 'lilac'],
    green: ['sage', 'forest', 'olive', 'alpine'],
    pink: ['rose', 'blush', 'coral'],
    gold: ['copper', 'champagne', 'bronze'],
    silver: ['platinum', 'chrome', 'metallic'],
    gray: ['grey', 'space gray', 'space grey', 'graphite']
  };

  // Function to extract color from string
  const extractColor = (str) => {
    const normalizedStr = str.toLowerCase();
    
    // First check for direct color matches
    for (const [color, variations] of Object.entries(colorMap)) {
      if (normalizedStr.includes(color)) return color;
      for (const variant of variations) {
        if (normalizedStr.includes(variant)) return color;
      }
    }
    return null;
  };

  // Convert strings to lowercase and remove special characters
  const normalize = (str) => {
    return str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanStr1 = normalize(str1);
  const cleanStr2 = normalize(str2);

  // Extract colors from both strings
  const color1 = extractColor(str1);
  const color2 = extractColor(str2);

  // Color matching logic
  if (color1 && color2 && color1 !== color2) {
    return 0; // Different colors - no match
  }

  // Get words from both strings (excluding color terms for base similarity)
  const words1 = cleanStr1.split(' ').filter(word => 
    !Object.keys(colorMap).includes(word) && 
    !Object.values(colorMap).flat().includes(word)
  );
  const words2 = cleanStr2.split(' ').filter(word => 
    !Object.keys(colorMap).includes(word) && 
    !Object.values(colorMap).flat().includes(word)
  );

  // Count matching words
  const commonWords = words1.filter(word => words2.includes(word));
  
  // Calculate word match percentage
  const matchPercentage = (commonWords.length * 2) / (words1.length + words2.length) * 100;

  // Bonus for matching words at the start (usually brand/model)
  const startingMatchBonus = words1[0] === words2[0] ? 10 : 0;

  // Bonus for sequence matches
  let sequenceBonus = 0;
  let maxSequence = 0;
  let currentSequence = 0;

  for (let i = 0; i < words1.length; i++) {
    if (words2.includes(words1[i])) {
      currentSequence++;
      maxSequence = Math.max(maxSequence, currentSequence);
    } else {
      currentSequence = 0;
    }
  }

  sequenceBonus = (maxSequence > 1) ? maxSequence * 5 : 0;

  // If one has color and other doesn't, apply a small penalty
  const colorPenalty = (color1 || color2) && !(color1 && color2) ? 10 : 0;

  // Combine scores with weights
  return Math.min(matchPercentage + startingMatchBonus + sequenceBonus - colorPenalty, 100);
};

const consolidateProducts = (amazonProducts, flipkartProducts) => {
  const consolidatedProducts = [];
  const processedFlipkartIds = new Set();

  const sortByPrice = products => products.sort((a, b) => 
    (a.pricing?.amount || 0) - (b.pricing?.amount || 0)
  );

  const sortedAmazon = sortByPrice(amazonProducts);
  const sortedFlipkart = sortByPrice(flipkartProducts);

  // Process Amazon products first
  sortedAmazon.forEach(amazonProduct => {
    const basePrice = amazonProduct.pricing?.amount || 0;
    const priceRange = basePrice * 0.3; // Reduced to 30% price difference threshold

    const matchCandidates = sortedFlipkart
      .filter(flipkartProduct => {
        if (processedFlipkartIds.has(flipkartProduct.id)) return false;
        
        const flipkartPrice = flipkartProduct.pricing?.amount || 0;
        if (flipkartPrice === 0) return false;
        
        const priceDiff = Math.abs(flipkartPrice - basePrice);
        const priceRatio = Math.min(flipkartPrice, basePrice) / Math.max(flipkartPrice, basePrice);
        
        // Price ratio should be at least 0.7 (70% similar)
        return priceDiff <= priceRange && priceRatio >= 0.7;
      })
      .map(flipkartProduct => ({
        product: flipkartProduct,
        similarity: calculateSimilarity(amazonProduct.name, flipkartProduct.name),
        priceDifference: Math.abs((flipkartProduct.pricing?.amount || 0) - basePrice)
      }))
      .filter(match => match.similarity >= 45) // Slightly higher threshold
      .sort((a, b) => {
        const getSimilarityScore = (match) => {
          const similarityWeight = 0.7;
          const priceWeight = 0.3;
          
          const priceRatio = Math.min(match.product.pricing?.amount || 0, basePrice) / 
                            Math.max(match.product.pricing?.amount || 0, basePrice);
          
          const priceScore = priceRatio * 100;
          
          return (similarityWeight * match.similarity) + 
                 (priceWeight * priceScore);
        };

        return getSimilarityScore(b) - getSimilarityScore(a);
      });

    if (matchCandidates.length > 0) {
      const bestMatch = matchCandidates[0];
      processedFlipkartIds.add(bestMatch.product.id);

      consolidatedProducts.push({
        id: `${amazonProduct.id}-${bestMatch.product.id}`,
        name: amazonProduct.name,
        description: amazonProduct.description || bestMatch.product.description || '',
        brand: amazonProduct.brand || bestMatch.product.brand,
        prices: {
          amazon: {
            current: amazonProduct.pricing?.amount || 0,
            original: amazonProduct.pricing?.original || 0,
            savings: amazonProduct.pricing?.savings || 0,
            currency: amazonProduct.pricing?.currency || 'INR'
          },
          flipkart: {
            current: bestMatch.product.pricing?.amount || 0,
            original: bestMatch.product.pricing?.original || 0,
            savings: bestMatch.product.pricing?.savings || 0,
            currency: bestMatch.product.pricing?.currency || 'INR'
          }
        },
        urls: {
          amazon: amazonProduct.url || `https://www.amazon.in/dp/${amazonProduct.id}`,
          flipkart: bestMatch.product.url || `https://www.flipkart.com/p/${bestMatch.product.id}`
        },
        images: {
          amazon: amazonProduct.images,
          flipkart: bestMatch.product.images
        },
        ratings: {
          amazon: amazonProduct.rating,
          flipkart: bestMatch.product.rating
        },
        badges: {
          climatePledge: amazonProduct.badges?.climatePledge || false,
          amazonChoice: amazonProduct.badges?.amazonChoice || false,
          bestSeller: amazonProduct.badges?.bestSeller || false
        },
        isCommon: true,
        similarityScore: bestMatch.similarity,
        ecoScore: calculateEcoScore(amazonProduct, bestMatch.product)
      });
    } else {
      // Add Amazon-only product (unchanged)
      consolidatedProducts.push({
        id: amazonProduct.id,
        name: amazonProduct.name,
        description: amazonProduct.description || '',
        brand: amazonProduct.brand,
        prices: {
          amazon: {
            current: amazonProduct.pricing?.amount || 0,
            original: amazonProduct.pricing?.original || 0,
            savings: amazonProduct.pricing?.savings || 0,
            currency: amazonProduct.pricing?.currency || 'INR'
          },
          flipkart: null
        },
        urls: {
          amazon: amazonProduct.url || `https://www.amazon.in/dp/${amazonProduct.id}`,
          flipkart: null
        },
        images: {
          amazon: amazonProduct.images,
          flipkart: null
        },
        ratings: {
          amazon: amazonProduct.rating,
          flipkart: null
        },
        badges: amazonProduct.badges || {},
        isCommon: false,
        similarityScore: 0,
        ecoScore: calculateEcoScore(amazonProduct)
      });
    }
  });

  // Add remaining Flipkart products (unchanged)
  sortedFlipkart
    .filter(product => !processedFlipkartIds.has(product.id))
    .forEach(product => {
      consolidatedProducts.push({
        id: product.id,
        name: product.name,
        description: product.description || '',
        brand: product.brand,
        prices: {
          amazon: null,
          flipkart: {
            current: product.pricing?.amount || 0,
            original: product.pricing?.original || 0,
            savings: product.pricing?.savings || 0,
            currency: product.pricing?.currency || 'INR'
          }
        },
        urls: {
          amazon: null,
          flipkart: product.url || `https://www.flipkart.com/p/${product.id}`
        },
        images: {
          amazon: null,
          flipkart: product.images
        },
        ratings: {
          amazon: null,
          flipkart: product.rating
        },
        badges: {},
        isCommon: false,
        similarityScore: 0,
        ecoScore: calculateEcoScore(null, product)
      });
    });

  return consolidatedProducts;
};

const calculateEcoScore = (amazonProduct, flipkartProduct = null) => {
  let score = 5; // Base score

  if (amazonProduct?.badges?.climatePledge) {
    score += 3;
  }

  // Add additional eco-scoring logic here based on product attributes
  // Example: packaging, shipping distance, manufacturer reputation, etc.

  return Math.min(score, 10); // Cap at 10
};

const handleApiError = (error, platform) => {
  console.error(`${platform} API error:`, error);
  
  if (error.response) {
    return new ProductServiceError(
      `${platform} API error: ${error.response.status}`,
      platform.toLowerCase(),
      error.response.status,
      error.response.data
    );
  }
  
  return new ProductServiceError(
    `${platform} API error: ${error.message}`,
    platform.toLowerCase(),
    500
  );
};

const fetchAmazonProducts = async (query, country, page) => {
  try {
    const response = await axios.request({
      method: 'GET',
      url: 'https://real-time-amazon-data.p.rapidapi.com/search',
      params: { query, country, page },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'real-time-amazon-data.p.rapidapi.com'
      },
      timeout: 10000
    });

    const products = response.data?.data?.products || [];
    return products.map(product => ({
      id: product.asin,
      platform: 'amazon',
      name: product.product_title,
      brand: product.brand,
      description: product.description || '',
      pricing: {
        amount: normalizePrice(product.product_price, product.currency).amount,
        original: normalizePrice(product.product_original_price, product.currency).amount,
        savings: normalizePrice(product.product_original_price, product.currency).amount - 
                normalizePrice(product.product_price, product.currency).amount,
        currency: product.currency || 'USD'
      },
      url: `https://www.amazon.in/dp/${product.asin}`,
      images: {
        primary: product.product_photo,
        gallery: Array.isArray(product.images) ? product.images : []
      },
      rating: {
        average: parseFloat(product.product_star_rating) || 0,
        count: parseInt(product.product_num_ratings) || 0
      },
      badges: {
        bestSeller: Boolean(product.is_best_seller),
        amazonChoice: Boolean(product.is_amazon_choice),
        climatePledge: Boolean(product.climate_pledge_friendly)
      }
    }));
  } catch (error) {
    throw handleApiError(error, 'Amazon');
  }
};

const fetchFlipkartProducts = async (query, page = '1') => {
  try {
    const response = await axios.request({
      method: 'GET',
      url: 'https://real-time-flipkart-api.p.rapidapi.com/product-search',
      params: {
        q: query,
        page,
        sort_by: 'popularity'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'real-time-flipkart-api.p.rapidapi.com'
      },
      timeout: 10000
    });

    const products = response.data?.products || [];
    return products.map(product => ({
      id: product.pid || `flipkart-${Date.now()}`,
      platform: 'flipkart',
      name: product.title || product.name,
      brand: product.brand,
      description: product.subTitle || '',
      pricing: {
        amount: normalizePrice(product.price, 'INR').amount,
        original: normalizePrice(product.mrp, 'INR').amount,
        savings: normalizePrice(product.mrp, 'INR').amount - 
                normalizePrice(product.price, 'INR').amount,
        currency: 'INR'
      },
      url: product.url || `https://www.flipkart.com/p/${product.pid}`,
      images: {
        primary: product.images?.[0] || null,
        gallery: product.images || []
      },
      rating: {
        average: product.rating?.average || 0,
        count: product.rating?.count || 0,
        breakup: product.rating?.breakup || {}
      },
      availability: {
        status: product.stock || 'IN_STOCK',
        delivery: null
      }
    }));
  } catch (error) {
    throw handleApiError(error, 'Flipkart');
  }
};

const fetchProducts = async (query, options = {}) => {
  const {
    page = '1',
    limit = 20,
    includeEcoMetrics = true,
    platformsToSearch = ['amazon', 'flipkart'],
    currency = 'INR'
  } = options;

  if (!query) {
    throw new ProductServiceError('Query parameter is required', 'validation', 400);
  }

  try {
    const startTime = Date.now();
    
    // Prepare platform fetchers
    const platformFetchers = {
      amazon: () => fetchAmazonProducts(query, currency === 'USD' ? 'US' : 'IN', page),
      flipkart: () => fetchFlipkartProducts(query, page)
    };

    // Fetch products from all platforms concurrently
    const platformResults = await Promise.allSettled(
      platformsToSearch.map(platform => 
        platformFetchers[platform]?.() || Promise.resolve([])
      )
    );

    // Extract products from each platform
    const amazonProducts = platformResults[0]?.status === 'fulfilled' ? platformResults[0].value : [];
    const flipkartProducts = platformResults[1]?.status === 'fulfilled' ? platformResults[1].value : [];

    // Consolidate and process products
    const consolidatedProducts = consolidateProducts(amazonProducts, flipkartProducts);
    
    // Sort by similarity score and apply limit
    const sortedProducts = consolidatedProducts
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return {
      success: true,
      count: sortedProducts.length,
      products: sortedProducts,
      metadata: {
        query,
        page: parseInt(page),
        limit,
        currency,
        timestamp: new Date().toISOString(),
        stats: {
          total: sortedProducts.length,
          common: sortedProducts.filter(p => p.isCommon).length,
          amazonOnly: sortedProducts.filter(p => p.prices.amazon && !p.prices.flipkart).length,
          flipkartOnly: sortedProducts.filter(p => p.prices.flipkart && !p.prices.amazon).length,
          withClimatePledge: sortedProducts.filter(p => p.badges?.climatePledge).length
        },
        platformResults: platformsToSearch.reduce((acc, platform, index) => {
          acc[platform] = {
            status: platformResults[index].status,
            itemCount: platformResults[index].status === 'fulfilled' ? 
              platformResults[index].value.length : 0,
            error: platformResults[index].status === 'rejected' ? 
              platformResults[index].reason.message : null
          };
          return acc;
        }, {}),
        performance: {
          responseTime: Date.now() - startTime,
          cacheHit: false, // Future implementation
          dataSource: 'api'
        },
        filters: {
          applied: {
            platforms: platformsToSearch,
            currency,
            page,
            limit
          },
          available: {
            sortBy: ['price', 'rating', 'eco_score', 'relevance'],
            priceRange: calculatePriceRange(sortedProducts),
            brands: extractUniqueBrands(sortedProducts)
          }
        }
      }
    };
  } catch (error) {
    throw new ProductServiceError(
      `Failed to fetch products: ${error.message}`,
      'service',
      error.response?.status || 500,
      {
        query,
        options,
        stack: error.stack,
        originalError: error.message
      }
    );
  }
};

// Helper functions for metadata
const calculatePriceRange = (products) => {
  const prices = products.flatMap(p => [
    p.prices?.amazon?.current,
    p.prices?.flipkart?.current
  ]).filter(Boolean);

  return {
    min: Math.min(...prices) || 0,
    max: Math.max(...prices) || 0,
    average: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  };
};

const extractUniqueBrands = (products) => {
  return [...new Set(products.map(p => p.brand).filter(Boolean))];
};

// Cache management (placeholder for future implementation)
const cache = {
  get: async (key) => null,
  set: async (key, value, ttl) => {},
  clear: async () => {}
};

// Rate limiting helper
const rateLimiter = {
  checkLimit: async (ip) => true,
  increment: async (ip) => {}
};

// Validation helpers
const validateOptions = (options) => {
  const {
    page,
    limit,
    platformsToSearch,
    currency
  } = options;

  const errors = [];

  if (page && (isNaN(page) || page < 1)) {
    errors.push('Page must be a positive number');
  }

  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    errors.push('Limit must be between 1 and 100');
  }

  if (platformsToSearch && !Array.isArray(platformsToSearch)) {
    errors.push('platformsToSearch must be an array');
  }

  if (currency && !['USD', 'INR'].includes(currency)) {
    errors.push('Currency must be either USD or INR');
  }

  return errors;
};

module.exports = {
  fetchProducts,
  ProductServiceError,
};