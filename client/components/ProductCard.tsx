import { Heart, Leaf, TrendingUp, Star } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from '@/components/ui/card';

export const ProductCard = ({ product }) => {
  if (!product || typeof product !== 'object') {
    console.error('Invalid product data:', product);
    return null;
  }

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

  const placeholderImage = "/api/placeholder/400/300";

  // Keep existing data normalization
  const normalizedProduct = {
    name: product.name || product.productName || 'Untitled Product',
    prices: {
      amazon: product.prices?.amazon || {},
      flipkart: product.prices?.flipkart || {}
    },
    images: {
      amazon: { primary: null, ...product.images?.amazon },
      flipkart: { primary: null, ...product.images?.flipkart }
    },
    urls: {
      amazon: product.urls?.amazon || '#',
      flipkart: product.urls?.flipkart || '#'
    },
    ratings: {
      amazon: product.ratings?.amazon || null,
      flipkart: product.ratings?.flipkart || null
    },
    badges: {
      climatePledge: Boolean(product.badges?.climatePledge),
      amazonChoice: Boolean(product.badges?.amazonChoice),
      bestSeller: Boolean(product.badges?.bestSeller)
    },
    isCommon: Boolean(product.isCommon),
    ecoScore: typeof product.ecoScore === 'number' ? product.ecoScore : 5,
    similarityScore: typeof product.similarityScore === 'number' ? product.similarityScore : null
  };

  const hasAmazonPricing = Boolean(normalizedProduct.prices.amazon?.current);
  const hasFlipkartPricing = Boolean(normalizedProduct.prices.flipkart?.current);

  const getProductImage = () => {
    if (imageError) return placeholderImage;
    const amazonImage = normalizedProduct.images.amazon.primary;
    const flipkartImage = normalizedProduct.images.flipkart.primary;
    return amazonImage || flipkartImage || placeholderImage;
  };

  const renderPriceRow = (platform) => {
    const priceData = normalizedProduct.prices[platform];
    const rating = normalizedProduct.ratings[platform];
    const url = normalizedProduct.urls[platform];
    
    if (!priceData?.current) {
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className="py-2 px-3 bg-gray-100 rounded text-sm text-gray-500">
            Price data unavailable for {platform}
          </div>
        );
      }
      return null;
    }

    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img 
              src={platform === 'amazon' 
                ? "https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg"
                : "https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/flipkart-095e08.svg"
              } 
              alt={platform} 
              className="h-5 w-5 object-contain"
              style={{ filter: platform === 'flipkart' ? 'brightness(0.4)' : 'none' }}
            />
            <span className="text-sm text-gray-700 capitalize">{platform}</span>
          </div>
          <span className="font-medium text-gray-900">
            {priceData.current ? `₹${priceData.current.toLocaleString()}` : 'Price unavailable'}
          </span>
        </div>
        {rating?.average && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <div className="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded">
              <Star className="h-3 w-3 fill-current text-green-600" />
              <span className="text-green-700">{rating.average}</span>
            </div>
            <span>({rating.count?.toLocaleString() || 0} ratings)</span>
          </div>
        )}
      </a>
    );
  };

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-video bg-gray-50">
        <img
          src={getProductImage()}
          alt={normalizedProduct.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain p-4"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {normalizedProduct.badges.climatePledge && (
            <div className="bg-green-500/90 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1">
              <Leaf className="h-3 w-3" />
              <span>Climate Pledge</span>
            </div>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
        >
          <Heart 
            className={`h-5 w-5 transition-colors ${
              isWishlisted ? "text-red-500 fill-red-500" : "text-gray-600"
            }`}
          />
        </button>
      </div>

      <CardContent>
        <h3 className="font-medium text-gray-900 mb-4 line-clamp-2">
          {normalizedProduct.name}
        </h3>

        {/* Prices */}
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <div className="space-y-2">
            {renderPriceRow('amazon')}
            {renderPriceRow('flipkart')}
          </div>
        </div>

        {/* Scores */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Leaf className="h-4 w-4 text-green-500" />
            <span>Eco Score: {normalizedProduct.ecoScore}/10</span>
          </div>
          {normalizedProduct.isCommon && normalizedProduct.similarityScore != null && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span>{(normalizedProduct.similarityScore || 0).toFixed(2)}% match</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;