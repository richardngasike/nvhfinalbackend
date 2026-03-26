const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getLocations,
} = require('../controllers/listingsController');

const { authenticate, requireLandlord, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const listingValidation = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters.'),
  body('price').isInt({ min: 1 }).withMessage('Price must be a positive number.'),
  body('location').trim().notEmpty().withMessage('Location is required.'),
  body('houseType')
    .isIn(['SINGLE_ROOM', 'BEDSITTER', 'ONE_BEDROOM', 'TWO_BEDROOM', 'THREE_BEDROOM', 'FOUR_BEDROOM_PLUS'])
    .withMessage('Invalid house type.'),
  body('description').trim().isLength({ min: 20, max: 2000 }).withMessage('Description must be 20-2000 characters.'),
  body('landlordName').trim().isLength({ min: 2, max: 100 }).withMessage('Landlord name required.'),
  body('landlordPhone').trim().notEmpty().withMessage('Landlord phone is required.'),
];

// GET /api/listings - public with optional auth for favorites
router.get('/', optionalAuth, getListings);

// GET /api/listings/locations - public
router.get('/locations', getLocations);

// GET /api/listings/my/listings - authenticated landlord
router.get('/my/listings', authenticate, requireLandlord, getMyListings);

// GET /api/listings/:id - public with optional auth
router.get('/:id', optionalAuth, getListing);

// POST /api/listings - landlord only
router.post(
  '/',
  authenticate,
  requireLandlord,
  upload.array('images', 5),
  listingValidation,
  createListing
);

// PUT /api/listings/:id - listing owner only
router.put(
  '/:id',
  authenticate,
  requireLandlord,
  upload.array('images', 5),
  listingValidation,
  updateListing
);

// DELETE /api/listings/:id - listing owner only
router.delete('/:id', authenticate, deleteListing);

module.exports = router;
