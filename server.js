const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const productsRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const secretProductRoutes = require('./routes/product_secret_endpoint');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Custom headers for puzzle hints
app.use((req, res, next) => {
  res.set({
    'X-API-Version': 'v2.0',
    'X-Puzzle-Hint': 'base64_decode_this_cHJvZHVjdF9zZWNyZXRfZW5kcG9pbnQ=',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  next();
});

// Routes
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/product_secret_endpoint', secretProductRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🛒 Assessment 2: E-commerce Product API running on http://localhost:${PORT}`);
  console.log(`📋 View instructions: http://localhost:${PORT}`);
  console.log(`⚡ Performance challenges await!`);
});
