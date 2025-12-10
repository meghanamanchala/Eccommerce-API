const express = require('express');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Large product dataset generated once and cached in memory
const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Beauty'];
const brands = ['BrandA', 'BrandB', 'BrandC', 'BrandD', 'BrandE'];
let products = [];
function generateProducts() {
  const arr = [];
  for (let i = 1; i <= 1000; i++) {
    arr.push({
      id: i.toString(),
      name: `Product ${i}`,
      description: `This is product number ${i} with amazing features`,
      price: Math.floor(Math.random() * 1000) + 10,
      category: categories[Math.floor(Math.random() * categories.length)],
      brand: brands[Math.floor(Math.random() * brands.length)],
      stock: Math.floor(Math.random() * 100),
      rating: (Math.random() * 5).toFixed(1),
      tags: [`tag${i}`, `feature${i % 10}`],
      createdAt: new Date().toISOString(),
      costPrice: Math.floor(Math.random() * 500) + 5,
      supplier: `Supplier ${i % 20}`,
      internalNotes: `Internal notes for product ${i}`,
      adminOnly: Math.random() > 0.9
    });
  }
  return arr;
}
// Generate and cache products at module load
products = generateProducts();

const JWT_SECRET = 'ecommerce-secret-key'; // BUG: Hardcoded secret

// Middleware no longer needed for product generation
// Products are generated and cached at module load
// router.use((req, res, next) => { next(); });

// Get all products
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // BUG: Default limit too high
    const search = req.query.search;
    const category = req.query.category;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';

    let filteredProducts = [...products]; // BUG: Not efficient, copying entire array

    // BUG: Inefficient search - linear search through all products
    if (search) {
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }

    // BUG: Inefficient sorting
    filteredProducts = _.orderBy(filteredProducts, [sortBy], [sortOrder]);

    // BUG: No pagination validation
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);

    res.set({
      'X-Total-Count': filteredProducts.length.toString(),
      'X-Performance-Warning': 'This endpoint is slow, needs optimization', // HINT
      'X-Secret-Query': 'try ?admin=true'
    });

    res.json({
      products: paginatedProducts.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        brand: product.brand,
        stock: product.stock,
        rating: product.rating,
        tags: product.tags
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredProducts.length / limit),
        totalItems: filteredProducts.length,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    // BUG: Exposing internal error details
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message, // BUG: Exposing error details
      stack: error.stack // BUG: Exposing stack trace
    });
  }
});

// Get product by ID
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // BUG: No input validation - could cause issues with malicious input
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // BUG: SQL injection-like vulnerability simulation
    if (productId.includes('<script>') || productId.includes('DROP')) {
      // BUG: Still processing the request instead of rejecting it
      console.log('Potential attack detected:', productId);
    }

    // Always return only public product fields
    const responseData = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      brand: product.brand,
      stock: product.stock,
      rating: product.rating,
      tags: product.tags,
      createdAt: product.createdAt
    };
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    // BUG: No authentication check
    // BUG: No input validation
    const productData = req.body;
    
    const newId = (Math.max(...products.map(p => parseInt(p.id))) + 1).toString();
    
    const newProduct = {
      id: newId,
      name: productData.name,
      description: productData.description,
      price: productData.price, // BUG: No validation for positive numbers
      category: productData.category,
      brand: productData.brand,
      stock: productData.stock || 0,
      rating: 0,
      tags: productData.tags || [],
      createdAt: new Date().toISOString(),
      // BUG: Adding internal fields without validation
      costPrice: productData.costPrice || productData.price * 0.7,
      supplier: productData.supplier || 'Unknown',
      internalNotes: productData.internalNotes || '',
      adminOnly: productData.adminOnly || false
    };

    products.push(newProduct);

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct // BUG: Returning all internal data
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update product
router.put('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;
    
    // BUG: No authentication check
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // BUG: No validation of update data
    // BUG: Allowing arbitrary field updates
    products[productIndex] = { ...products[productIndex], ...updateData };

    res.json({
      message: 'Product updated successfully',
      product: products[productIndex] // BUG: Returning all data
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Delete product
router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // BUG: No authentication check
    // BUG: No admin role check for deletion
    
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    products.splice(productIndex, 1);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
