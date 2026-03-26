const express = require('express');
const router = express.Router();

const { getFavorites, addFavorite, removeFavorite, toggleFavorite } = require('../controllers/favoritesController');
const { authenticate } = require('../middleware/auth');

// All favorites routes require authentication
router.use(authenticate);

// GET /api/favorites
router.get('/', getFavorites);

// POST /api/favorites/:listingId/toggle
router.post('/:listingId/toggle', toggleFavorite);

// POST /api/favorites/:listingId
router.post('/:listingId', addFavorite);

// DELETE /api/favorites/:listingId
router.delete('/:listingId', removeFavorite);

module.exports = router;
