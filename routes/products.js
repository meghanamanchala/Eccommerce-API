
const express = require('express');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const authenticateJWT = require('../middleware/authenticateJWT');
const { productCreateSchema, productUpdateSchema } = require('../validation/productSchemas');

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

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware no longer needed for product generation
// Products are generated and cached at module load
// router.use((req, res, next) => { next(); });

// Get all products
router.get('/', async (req, res) => {
  try {
    // Enforce safe pagination defaults and limits
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    limit = Math.min(limit, 100); // Max 100 per page

    const search = req.query.search;
    const category = req.query.category;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';

    // Avoid unnecessary array copy, filter in-place
    let filteredProducts = products;

    // Optimized search: lowercase search term once
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }

    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category === category);
    }

    // Efficient sorting (lodash is fine for this scale)
    filteredProducts = _.orderBy(filteredProducts, [sortBy], [sortOrder]);

    // Pagination
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);

    res.set({
      'X-Total-Count': totalItems.toString()
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
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    // Input validation: productId must be a positive integer string
    if (!/^[1-9][0-9]*$/.test(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    // Reject malicious input
    if (productId.includes('<script>') || productId.toUpperCase().includes('DROP')) {
      return res.status(400).json({ error: 'Malicious product ID detected' });
    }
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { error, value } = productCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Invalid input', details: error.details.map(d => d.message) });
    }
    const productData = value;
    const newId = (Math.max(...products.map(p => parseInt(p.id))) + 1).toString();
    const newProduct = {
      id: newId,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      category: productData.category,
      brand: productData.brand,
      stock: productData.stock || 0,
      rating: 0,
      tags: productData.tags || [],
      createdAt: new Date().toISOString(),
      costPrice: productData.price * 0.7,
      supplier: 'Unknown',
      internalNotes: '',
      adminOnly: false
    };
    products.push(newProduct);
    res.status(201).json({
      message: 'Product created successfully',
      product: {
        id: newProduct.id,
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        category: newProduct.category,
        brand: newProduct.brand,
        stock: newProduct.stock,
        rating: newProduct.rating,
        tags: newProduct.tags,
        createdAt: newProduct.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:productId', authenticateJWT, async (req, res) => {
  try {
    const { productId } = req.params;
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const { error, value } = productUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Invalid input', details: error.details.map(d => d.message) });
    }
    products[productIndex] = { ...products[productIndex], ...value };
    const updated = products[productIndex];
    res.json({
      message: 'Product updated successfully',
      product: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        price: updated.price,
        category: updated.category,
        brand: updated.brand,
        stock: updated.stock,
        rating: updated.rating,
        tags: updated.tags,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:productId', authenticateJWT, async (req, res) => {
  try {
    const { productId } = req.params;
    // Input validation: productId must be a positive integer string
    if (!/^[1-9][0-9]*$/.test(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    // Require admin role for deletion
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required to delete products' });
    }
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    products.splice(productIndex, 1);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
