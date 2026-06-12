const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { authMiddleware, roleGuard } = require('../middleware/auth');

// Get all owners (admin)
router.get('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const owners = await db.owners.find({});
    const safe = owners.map(({ password, ...rest }) => rest);
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Create owner (admin)
router.post('/', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { firstName, lastName, email, username, password } = req.body;
    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ message: 'Barcha maydonlarni to\'ldiring' });
    }
    const exists = await db.owners.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(409).json({ message: 'Bu username yoki email allaqachon mavjud' });

    const hash = await bcrypt.hash(password, 10);
    const owner = await db.owners.insert({
      firstName, lastName, email, username, password: hash,
      otpVerified: false,
      createdAt: new Date().toISOString(),
    });
    const { password: _, ...safe } = owner;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Delete owner (admin)
router.delete('/:id', authMiddleware, roleGuard('admin'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.owners.remove({ _id: req.params.id });
    res.json({ message: 'O\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

module.exports = router;
