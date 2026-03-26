const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const FREE_LISTING_LIMIT = 4;

const formatListing = (listing, userId = null) => ({
  ...listing,
  isFavorited: listing.favorites
    ? listing.favorites.some((f) => f.userId === userId)
    : false,
  favorites: undefined,
});

// GET /api/listings - public, with filters & pagination
const getListings = async (req, res, next) => {
  try {
    const {
      location,
      houseType,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true };

    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (houseType) where.houseType = houseType;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseInt(minPrice);
      if (maxPrice) where.price.lte = parseInt(maxPrice);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { landlordName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['createdAt', 'price', 'views'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const userId = req.user?.id || null;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortField]: sortDir },
        include: {
          images: { take: 1 },
          user: { select: { name: true } },
          favorites: userId ? { where: { userId }, select: { userId: true } } : false,
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const formattedListings = listings.map((l) => formatListing(l, userId));

    res.json({
      listings: formattedListings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum < Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/listings/:id - public
const getListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const listing = await prisma.listing.findUnique({
      where: { id: parseInt(id), isActive: true },
      include: {
        images: true,
        user: { select: { name: true, email: true } },
        favorites: userId ? { where: { userId }, select: { userId: true } } : false,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    // Increment view count
    await prisma.listing.update({
      where: { id: parseInt(id) },
      data: { views: { increment: 1 } },
    });

    const formatted = formatListing(listing, userId);

    // Only show landlord contact if user is logged in
    if (!userId) {
      formatted.landlordPhone = null;
    }

    res.json({ listing: formatted });
  } catch (err) {
    next(err);
  }
};

// POST /api/listings - landlord only
const createListing = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded files on validation error
      if (req.files) {
        req.files.forEach((f) => fs.unlink(f.path, () => {}));
      }
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isPremium: true, role: true },
    });

    // Check listing limit for non-premium landlords
    if (!user.isPremium) {
      const listingCount = await prisma.listing.count({
        where: { userId: req.user.id, isActive: true },
      });
      if (listingCount >= FREE_LISTING_LIMIT) {
        if (req.files) {
          req.files.forEach((f) => fs.unlink(f.path, () => {}));
        }
        return res.status(403).json({
          error: 'Free tier limit reached.',
          upgradeMessage: `You've reached the ${FREE_LISTING_LIMIT}-listing limit. Upgrade to Premium via WhatsApp: +254718959781`,
          isPremiumRequired: true,
        });
      }
    }

    const { title, price, location, houseType, description, amenities, landlordName, landlordPhone } = req.body;

    const parsedAmenities = typeof amenities === 'string'
      ? JSON.parse(amenities)
      : Array.isArray(amenities) ? amenities : [];

    const listing = await prisma.listing.create({
      data: {
        title,
        price: parseInt(price),
        location,
        houseType,
        description,
        amenities: parsedAmenities,
        landlordName,
        landlordPhone,
        userId: req.user.id,
        images: req.files && req.files.length > 0
          ? {
              create: req.files.map((file) => ({
                path: `/uploads/${file.filename}`,
                filename: file.filename,
              })),
            }
          : undefined,
      },
      include: { images: true },
    });

    res.status(201).json({ message: 'Listing created successfully.', listing });
  } catch (err) {
    if (req.files) {
      req.files.forEach((f) => fs.unlink(f.path, () => {}));
    }
    next(err);
  }
};

// PUT /api/listings/:id - listing owner only
const updateListing = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files) req.files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const listingId = parseInt(id);

    const existing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { images: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      if (req.files) req.files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(403).json({ error: 'You can only edit your own listings.' });
    }

    const { title, price, location, houseType, description, amenities, landlordName, landlordPhone, removeImages } = req.body;

    const parsedAmenities = typeof amenities === 'string'
      ? JSON.parse(amenities)
      : Array.isArray(amenities) ? amenities : [];

    // Handle image removal
    if (removeImages) {
      const removeIds = typeof removeImages === 'string' ? JSON.parse(removeImages) : removeImages;
      const imagesToRemove = existing.images.filter((img) => removeIds.includes(img.id));
      for (const img of imagesToRemove) {
        const filePath = path.join(__dirname, '..', '..', 'uploads', img.filename);
        fs.unlink(filePath, () => {});
      }
      await prisma.image.deleteMany({ where: { id: { in: removeIds } } });
    }

    const updateData = {
      title,
      price: parseInt(price),
      location,
      houseType,
      description,
      amenities: parsedAmenities,
      landlordName,
      landlordPhone,
    };

    if (req.files && req.files.length > 0) {
      updateData.images = {
        create: req.files.map((file) => ({
          path: `/uploads/${file.filename}`,
          filename: file.filename,
        })),
      };
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: updateData,
      include: { images: true },
    });

    res.json({ message: 'Listing updated successfully.', listing });
  } catch (err) {
    if (req.files) req.files.forEach((f) => fs.unlink(f.path, () => {}));
    next(err);
  }
};

// DELETE /api/listings/:id - listing owner only
const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listingId = parseInt(id);

    const existing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { images: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own listings.' });
    }

    // Delete associated image files
    for (const img of existing.images) {
      const filePath = path.join(__dirname, '..', '..', 'uploads', img.filename);
      fs.unlink(filePath, () => {});
    }

    await prisma.listing.delete({ where: { id: listingId } });

    res.json({ message: 'Listing deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/listings/my/listings - landlord's own listings
const getMyListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: { userId: req.user.id },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { take: 1 },
          _count: { select: { favorites: true } },
        },
      }),
      prisma.listing.count({ where: { userId: req.user.id } }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isPremium: true },
    });

    res.json({
      listings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      meta: {
        isPremium: user.isPremium,
        listingCount: total,
        listingLimit: user.isPremium ? null : FREE_LISTING_LIMIT,
        canCreate: user.isPremium || total < FREE_LISTING_LIMIT,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/listings/locations - get all unique locations
const getLocations = async (req, res, next) => {
  try {
    const locations = await prisma.listing.findMany({
      where: { isActive: true },
      select: { location: true },
      distinct: ['location'],
      orderBy: { location: 'asc' },
    });
    res.json({ locations: locations.map((l) => l.location) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getLocations,
};
