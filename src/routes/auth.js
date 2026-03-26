const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required.'),
    body('role').optional().isIn(['TENANT', 'LANDLORD']).withMessage('Role must be TENANT or LANDLORD.'),
  ],
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  login
);

// GET /api/auth/profile
router.get('/profile', authenticate, getProfile);

// PUT /api/auth/profile
router.put(
  '/profile',
  authenticate,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
    body('phone').optional({ nullable: true }).isMobilePhone().withMessage('Valid phone number required.'),
  ],
  updateProfile
);

// PUT /api/auth/change-password
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
  ],
  changePassword
);

module.exports = router;
