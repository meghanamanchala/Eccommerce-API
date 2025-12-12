
const express = require('express');
const jwt = require('jsonwebtoken');
const authenticateJWT = require('../middleware/authenticateJWT');
const { loadCarts, saveCarts } = require('../utils/cartPersistence');

const router = express.Router();

// Persistent cart storage
let carts = loadCarts();

const JWT_SECRET = 'ecommerce-secret-key';

// Mock product prices for cart calculations
const productPrices = {
  '1': 100,
  '2': 200,
  '3': 150,
  '4': 75,
  '5': 300
};

// Get cart (requires authentication)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const cart = carts.get(userId) || { items: [], total: 0 };
    let calculatedTotal = 0;
    cart.items.forEach(item => {
      const currentPrice = productPrices[item.productId] || 0;
      calculatedTotal += currentPrice * item.quantity;
    });
    cart.total = calculatedTotal;
    carts.set(userId, cart);
    saveCarts(carts);
    res.set({
      'X-Cart-Items': cart.items.length.toString()
    });
    res.json({
      cart,
      metadata: {
        lastUpdated: new Date().toISOString(),
        itemCount: cart.items.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add to cart (requires authentication)
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const { productId, quantity } = req.body;
    // Validate productId and quantity
    if (!productId || typeof productId !== 'string' || !/^[1-9][0-9]*$/.test(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 100) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 100' });
    }
    // Check if product exists (simulate by checking productPrices or ideally from products array)
    if (!productPrices[productId]) {
      return res.status(404).json({ error: 'Product does not exist' });
    }
    const cart = carts.get(userId) || { items: [], total: 0 };
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity = Math.min(cart.items[existingItemIndex].quantity + qty, 100);
    } else {
      cart.items.push({
        productId,
        quantity: qty,
        addedAt: new Date().toISOString()
      });
    }
    // Recalculate total
    cart.total = cart.items.reduce((sum, item) => {
      return sum + (productPrices[item.productId] || 0) * item.quantity;
    }, 0);
    carts.set(userId, cart);
    saveCarts(carts);
    res.json({ message: 'Item added to cart', cart });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add to cart (requires authentication)
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    const qty = parseInt(quantity) || 1;
    const cart = carts.get(userId) || { items: [], total: 0 };
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += qty;
    } else {
      cart.items.push({
        productId,
        quantity: qty
      });
    }
    carts.set(userId, cart);
    saveCarts(carts);
    res.json({ message: 'Item added to cart', cart });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove from cart (requires authentication)
router.delete('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const { productId } = req.query;
    if (!productId || typeof productId !== 'string' || !/^[1-9][0-9]*$/.test(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const cart = carts.get(userId) || { items: [], total: 0 };
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    const removedItem = cart.items.splice(itemIndex, 1)[0];
    cart.total = cart.items.reduce((sum, item) => {
      return sum + (productPrices[item.productId] || 0) * item.quantity;
    }, 0);
    carts.set(userId, cart);
    saveCarts(carts);
    res.json({ message: 'Item removed from cart', cart, removedItem });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
