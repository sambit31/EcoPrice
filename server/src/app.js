require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { limiter } = require('./utils/middleware');
const productRoutes = require('./routes/productRoutes');

const app = express();

// Basic Middleware
app.use(cors({
 origin: 'http://localhost:3000', // Add your React app URL
 methods: ['GET', 'POST'],
 allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
 console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`, {
   query: req.query,
   body: req.body
 });
 next();
});

// Base API route
app.get('/api', (req, res) => {
 res.json({
   status: 'success',
   message: 'API is running',
   endpoints: {
     products: '/api/products?query=your_search_query'
   }
 });
});

// Product routes
app.use('/api', productRoutes);

// Error handling middleware for axios/API errors
app.use((err, req, res, next) => {
 if (err.isAxiosError) {
   console.error('External API Error:', {
     message: err.message,
     code: err.code,
     response: err.response?.data,
     status: err.response?.status
   });
   return res.status(502).json({
     error: 'External API Error',
     message: 'Failed to fetch data from external service',
     details: process.env.NODE_ENV === 'development' ? err.message : undefined
   });
 }
 next(err);
});

// General error handling middleware
app.use((err, req, res, next) => {
 console.error('Global error handler:', {
   error: err,
   stack: err.stack,
   path: req.path,
   query: req.query
 });
 
 // API errors
 if (err.response) {
   console.error('API Response Error:', {
     status: err.response.status,
     data: err.response.data,
     headers: err.response.headers,
   });
 }

 // MongoDB errors
 if (err instanceof mongoose.Error) {
   console.error('MongoDB Error:', err);
   return res.status(500).json({
     error: 'Database error',
     message: 'An error occurred while accessing the database',
     path: req.path,
     timestamp: new Date().toISOString()
   });
 }

 // Default error response
 res.status(err.status || 500).json({
   error: err.message || 'Internal Server Error',
   path: req.path,
   timestamp: new Date().toISOString(),
   requestId: req.id // Add this if you want to track specific requests
 });
});

// 404 handler
app.use((req, res) => {
 console.log(`404 Not Found: ${req.method} ${req.url}`);
 res.status(404).json({
   error: 'Not Found',
   message: `Route ${req.method} ${req.url} not found`,
   path: req.path,
   timestamp: new Date().toISOString()
 });
});

// MongoDB connection with retry logic
const connectDB = async () => {
 try {
   await mongoose.connect(process.env.MONGODB_URI, {
     // Add these options for better stability
     useNewUrlParser: true,
     useUnifiedTopology: true,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
   });
   console.log('MongoDB connected successfully');
 } catch (err) {
   console.error('MongoDB connection error:', err);
   // Retry connection after 5 seconds
   setTimeout(connectDB, 5000);
 }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
 console.log('MongoDB disconnected! Attempting to reconnect...');
 connectDB();
});

mongoose.connection.on('error', (err) => {
 console.error('MongoDB error:', err);
});

// Initialize server
const startServer = async () => {
 try {
   await connectDB();
   const PORT = process.env.PORT || 5000;
   app.listen(PORT, () => {
     console.log('=================================');
     console.log(`🚀 Server running on port ${PORT}`);
     console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
     console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
     console.log('=================================');
   });
 } catch (err) {
   console.error('Server startup error:', err);
   process.exit(1);
 }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
 console.error('❌ Uncaught Exception:', err);
 process.exit(1);
});

process.on('unhandledRejection', (err) => {
 console.error('❌ Unhandled Rejection:', err);
 process.exit(1);
});

// Start the server
startServer();

module.exports = app;