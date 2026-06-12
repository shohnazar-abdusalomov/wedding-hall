require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Datastore = require('nedb-promises');

const app = express();
const PORT = 5000;

// Ensure directories
['data', 'uploads'].forEach(d => {
  const dir = path.join(__dirname, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Databases
const db = {
  users: Datastore.create({ filename: path.join(__dirname, 'data/users.db'), autoload: true }),
  owners: Datastore.create({ filename: path.join(__dirname, 'data/owners.db'), autoload: true }),
  venues: Datastore.create({ filename: path.join(__dirname, 'data/venues.db'), autoload: true }),
  bookings: Datastore.create({ filename: path.join(__dirname, 'data/bookings.db'), autoload: true }),
  otps: Datastore.create({ filename: path.join(__dirname, 'data/otps.db'), autoload: true }),
};

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make db & upload available to routes
app.locals.db = db;
app.locals.upload = upload;

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/admin', require('./routes/admin'));

// Seed default admin
const bcrypt = require('bcryptjs');
(async () => {
  const existing = await db.users.findOne({ role: 'admin' });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.users.insert({
      firstName: 'Admin',
      lastName: 'Adminov',
      username: 'admin',
      password: hash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    console.log('Default admin created: admin / admin123');
  }
})();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
