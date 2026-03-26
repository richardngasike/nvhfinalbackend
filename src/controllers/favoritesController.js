const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/favorites - get user's favorites
const getFavorites = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            include: { images: { take: 1 } },
          },
        },
      }),
      prisma.favorite.count({ where: { userId: req.user.id } }),
    ]);

    const listings = favorites
      .filter((f) => f.listing)
      .map((f) => ({ ...f.listing, isFavorited: true }));

    res.json({
      listings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/favorites/:listingId - add to favorites
const addFavorite = async (req, res, next) => {
  try {
    const listingId = parseInt(req.params.listingId);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId, isActive: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const favorite = await prisma.favorite.create({
      data: { userId: req.user.id, listingId },
    });

    res.status(201).json({ message: 'Added to favorites.', favorite });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already in favorites.' });
    }
    next(err);
  }
};

// DELETE /api/favorites/:listingId - remove from favorites
const removeFavorite = async (req, res, next) => {
  try {
    const listingId = parseInt(req.params.listingId);

    const favorite = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: req.user.id, listingId } },
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found.' });
    }

    await prisma.favorite.delete({
      where: { userId_listingId: { userId: req.user.id, listingId } },
    });

    res.json({ message: 'Removed from favorites.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/favorites/:listingId/toggle - toggle favorite
const toggleFavorite = async (req, res, next) => {
  try {
    const listingId = parseInt(req.params.listingId);

    const existing = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: req.user.id, listingId } },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { userId_listingId: { userId: req.user.id, listingId } },
      });
      return res.json({ isFavorited: false, message: 'Removed from favorites.' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    await prisma.favorite.create({ data: { userId: req.user.id, listingId } });
    res.json({ isFavorited: true, message: 'Added to favorites.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite, toggleFavorite };
