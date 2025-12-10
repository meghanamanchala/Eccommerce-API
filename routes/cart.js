const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// In-memory cart storage (simulate session/database)
const carts = new Map(); // BUG: Using Map without persistence

const JWT_SECRET = 'ecommerce-secret-key';

// Mock product prices for cart calculations
const productPrices = {
  '1': 100,
  '2': 200,
  '3': 150,
  '4': 75,
  '5': 300
};

// Get cart
router.get('/', async (req, res) => {
  try {
    // BUG: No authentication check for cart operations
    const userId = req.get('x-user-id') || 'anonymous'; // BUG: Trusting client header
    
    const cart = carts.get(userId) || { items: [], total: 0 };
    
    // BUG: Recalculating total every time instead of caching
    let calculatedTotal = 0;
    cart.items.forEach(item => {
      // BUG: Potential race condition with price updates
      const currentPrice = productPrices[item.productId] || 0;
      calculatedTotal += currentPrice * item.quantity;
    });

    // BUG: Always updating total even if not changed
    cart.total = calculatedTotal;
    carts.set(userId, cart);

    res.set({
      'X-Cart-Items': cart.items.length.toString(),
      'X-Debug-UserId': userId // BUG: Exposing internal user ID
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

// Add to cart
router.post('/', async (req, res) => {
  try {
    const userId = req.get('x-user-id') || 'anonymous';
    const { productId, quantity = 1 } = req.body;
    
    // BUG: No validation of productId or quantity
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const cart = carts.get(userId) || { items: [], total: 0 };
    
    // BUG: No check if product exists in product catalog
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      // BUG: No check for maximum quantity limits
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        addedAt: new Date().toISOString(),
        // BUG: Storing price in cart (should fetch current price)
        price: productPrices[productId] || 0
      });
    }

    // BUG: Inefficient total recalculation
    cart.total = cart.items.reduce((sum, item) => {
      return sum + (productPrices[item.productId] || 0) * item.quantity;
    }, 0);

    carts.set(userId, cart);

    res.json({
      message: 'Item added to cart',
      cart,
      addedItem: { productId, quantity }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item
router.put('/', async (req, res) => {
  try {
    const userId = req.get('x-user-id') || 'anonymous';
    const { productId, quantity } = req.body;
    
    // BUG: No validation
    if (!productId || quantity < 0) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    const cart = carts.get(userId) || { items: [], total: 0 };
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (quantity === 0) {
      // BUG: Should use DELETE endpoint for removing items
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].updatedAt = new Date().toISOString();
    }

    // BUG: Recalculating total every time
    cart.total = cart.items.reduce((sum, item) => {
      return sum + (productPrices[item.productId] || 0) * item.quantity;
    }, 0);

    carts.set(userId, cart);

    res.json({
      message: 'Cart item updated',
      cart
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove from cart
router.delete('/', async (req, res) => {
  try {
    const userId = req.get('x-user-id') || 'anonymous';
    const { productId } = req.query;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const cart = carts.get(userId) || { items: [], total: 0 };
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    const removedItem = cart.items.splice(itemIndex, 1)[0];

    // BUG: Inefficient recalculation again
    cart.total = cart.items.reduce((sum, item) => {
      return sum + (productPrices[item.productId] || 0) * item.quantity;
    }, 0);

    carts.set(userId, cart);

    res.json({
      message: 'Item removed from cart',
      cart,
      removedItem
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
