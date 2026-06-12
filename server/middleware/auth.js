const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'toyxona_secret_key_2026';

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token topilmadi' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token yaroqsiz' });
  }
}

function roleGuard(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }
    next();
  };
}

module.exports = { generateToken, authMiddleware, roleGuard, SECRET };
