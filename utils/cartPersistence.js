const fs = require('fs');
const path = require('path');

const CARTS_FILE = path.join(__dirname, '../data/carts.json');

function loadCarts() {
  try {
    if (fs.existsSync(CARTS_FILE)) {
      const data = fs.readFileSync(CARTS_FILE, 'utf-8');
      return new Map(JSON.parse(data));
    }
  } catch (e) {
    // ignore
  }
  return new Map();
}

function saveCarts(carts) {
  try {
    const arr = Array.from(carts.entries());
    fs.writeFileSync(CARTS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (e) {
    // ignore
  }
}

module.exports = { loadCarts, saveCarts };
