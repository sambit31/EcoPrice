'use client'

import React, { useState } from 'react';
import { Search, ChevronUp, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProductCard } from '../components/ProductCard';
import { searchProducts } from '../services/api';

export const Home = () => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [debug, setDebug] = useState(null);
  const [sortOption, setSortOption] = useState('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_low_high', label: 'Price: Low to High' },
    { value: 'price_high_low', label: 'Price: High to Low' },
    { value: 'eco_rating', label: 'Eco Rating' },
    { value: 'savings', label: 'Best Savings' }
  ];

  const sortProducts = (products) => {
    const sorted = [...products];
    
    switch (sortOption) {
      case 'price_low_high':
        return sorted.sort((a, b) => {
          const aPrice = Math.min(a.prices?.amazon?.current || Infinity, a.prices?.flipkart?.current || Infinity);
          const bPrice = Math.min(b.prices?.amazon?.current || Infinity, b.prices?.flipkart?.current || Infinity);
          return aPrice - bPrice;
        });
        
      case 'price_high_low':
        return sorted.sort((a, b) => {
          const aPrice = Math.min(a.prices?.amazon?.current || -Infinity, a.prices?.flipkart?.current || -Infinity);
          const bPrice = Math.min(b.prices?.amazon?.current || -Infinity, b.prices?.flipkart?.current || -Infinity);
          return bPrice - aPrice;
        });
        
      case 'eco_rating':
        return sorted.sort((a, b) => (b.ecoRating || 0) - (a.ecoRating || 0));
        
      case 'savings':
        return sorted.sort((a, b) => {
          const aSavings = calculateSavings(a);
          const bSavings = calculateSavings(b);
          return bSavings - aSavings;
        });
        
      default:
        return sorted;
    }
  };

  const calculateSavings = (product) => {
    const amazonPrice = product.prices?.amazon?.current;
    const flipkartPrice = product.prices?.flipkart?.current;
    if (!amazonPrice || !flipkartPrice) return 0;
    return Math.abs(amazonPrice - flipkartPrice) / Math.max(amazonPrice, flipkartPrice) * 100;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setDebug(null);
    
    try {
      const response = await searchProducts(query, {
        includeEcoMetrics: true,
        currency: 'INR',
        limit: 20
      });
      
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid API response format');
      }

      if (!Array.isArray(response.products)) {
        console.error('Products is not an array:', response.products);
        throw new Error('Invalid products data received');
      }

      setDebug({
        totalProducts: response.products.length,
        productsWithPrices: response.products.filter(p => p.prices?.amazon?.current || p.prices?.flipkart?.current).length,
        productsWithImages: response.products.filter(p => p.images?.amazon?.primary || p.images?.flipkart?.primary).length,
        productsWithUrls: response.products.filter(p => p.urls?.amazon || p.urls?.flipkart).length,
      });

      const transformedProducts = response.products.map(product => ({
        ...product,
        prices: {
          amazon: product.prices?.amazon || null,
          flipkart: product.prices?.flipkart || null
        },
        images: {
          amazon: { primary: product.images?.amazon?.primary || null },
          flipkart: { primary: product.images?.flipkart?.primary || null }
        },
        urls: {
          amazon: product.urls?.amazon || null,
          flipkart: product.urls?.flipkart || null
        }
      }));

      setProducts(transformedProducts);
      setMetadata(response.metadata);

    } catch (error) {
      console.error('Search error:', error);
      setError(error.message || 'Failed to fetch products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-50 to-blue-50">
      <nav className="w-full bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              EcoPrice
            </h1>
            <div className="flex gap-4">
              <a href="#" className="text-green-600 hover:text-green-700">About</a>
              <a href="#" className="text-green-600 hover:text-green-700">Contact</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-2xl mx-auto mb-12">
          <CardHeader>
            <CardTitle>Compare eco-friendly products across platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for products..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </CardContent>
        </Card>

        {metadata && !loading && !error && products.length > 0 && (
          <Card className="max-w-7xl mx-auto mb-8">
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-grow">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600">Climate Pledge</p>
                    <p className="text-2xl font-semibold">{metadata.stats.withClimatePledge}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600">Best Savings</p>
                    <p className="text-2xl font-semibold text-green-600">
                      Up to {Math.max(...products.map(p => calculateSavings(p))).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative inline-block text-left mb-6">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Sort by: {sortOptions.find(opt => opt.value === sortOption)?.label}
                  </button>
                </div>

                {showSortMenu && (
                  <div className="origin-top-right absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortOption(option.value);
                            setShowSortMenu(false);
                          }}
                          className={`${
                            sortOption === option.value ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                          } block px-4 py-2 text-sm w-full text-left hover:bg-gray-50`}
                          role="menuitem"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* {process.env.NODE_ENV === 'development' && debug && (
          <Card className="max-w-2xl mx-auto mb-8">
            <CardHeader>
              <CardTitle>Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )} */}

        {!loading && !error && products.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Search for eco-friendly products to compare prices</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {sortProducts(products).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {showScrollTop && (
        <button 
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-colors z-50"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}

      <footer className="bg-white mt-12 py-8 text-center text-gray-600">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} EcoPrice. Save money, save planet.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;