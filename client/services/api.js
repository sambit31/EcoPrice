export const searchProducts = async (query) => {
    try {
      console.log('Initiating search with query:', query);
      
      // Encode the query parameter properly
      const encodedQuery = encodeURIComponent(query);
      const url = `http://localhost:5000/api/products?query=${encodedQuery}`;
      
      console.log('Calling API:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      
      console.log('Raw API Response:', response);
      
      if (!response.ok) {
        // Try to get error details from response
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch (e) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('No products found for query:', query);
        return [];
      }
      
      console.log(`Found ${Array.isArray(data) ? data.length : 'unknown number of'} products`);
      return data;
      
    } catch (error) {
      console.error('Search failed:', {
        query,
        error: error.message,
        stack: error.stack
      });
      
      // Rethrow with more context
      throw new Error(`Failed to search products: ${error.message}`);
    }
};

// Optional: Add a timeout wrapper if needed
const timeoutPromise = (promise, timeout = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    )
  ]);
};

// Usage example with timeout:
// const data = await timeoutPromise(searchProducts(query));