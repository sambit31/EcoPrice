const stringSimilarity = require('string-similarity');

exports.calculateSimilarity = (product1, product2) => {
  const nameSimilarity = stringSimilarity.compareTwoStrings(
    product1.name.toLowerCase(),
    product2.name.toLowerCase()
  );
  
  const priceDiff = Math.abs(product1.price - product2.price) / Math.max(product1.price, product2.price);
  const ecoScoreDiff = Math.abs(product1.ecoScore - product2.ecoScore) / 10;
  
  return Math.round((nameSimilarity * 0.5 + (1 - priceDiff) * 0.3 + (1 - ecoScoreDiff) * 0.2) * 100);
};