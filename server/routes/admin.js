const router = require('express').Router();
const { authMiddleware, roleGuard } = require('../middleware/auth');

router.get('/stats', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const venues = await db.venues.count({});
    const approved = await db.venues.count({ status: 'tasdiqlangan' });
    const pending = await db.venues.count({ status: 'tasdiqlanmagan' });
    const bookings = await db.bookings.count({});
    const activeBookings = await db.bookings.count({ status: 'active' });
    const owners = await db.owners.count({});
    const users = await db.users.count({ role: 'user' });

    res.json({ venues, approved, pending, bookings, activeBookings, owners, users });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

module.exports = router;
