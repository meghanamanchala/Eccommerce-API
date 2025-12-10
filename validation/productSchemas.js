// Validation schemas for product endpoints
const Joi = require('joi');

const productCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(5).max(500).required(),
  price: Joi.number().positive().required(),
  category: Joi.string().min(2).max(50).required(),
  brand: Joi.string().min(2).max(50).required(),
  stock: Joi.number().integer().min(0).default(0),
  tags: Joi.array().items(Joi.string()).default([])
});

const productUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().min(5).max(500),
  price: Joi.number().positive(),
  category: Joi.string().min(2).max(50),
  brand: Joi.string().min(2).max(50),
  stock: Joi.number().integer().min(0),
  tags: Joi.array().items(Joi.string())
});

module.exports = {
  productCreateSchema,
  productUpdateSchema
};
