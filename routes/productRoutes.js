const express = require('express');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getCategories } = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/categories', getCategories); // Place static paths before dynamic ones
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
