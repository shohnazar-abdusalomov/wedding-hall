const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { issueOtp, verifyOtp } = require('../services/otp');

const isDev = process.env.NODE_ENV !== 'production';

function ownerToken(owner) {
  return generateToken({ id: owner._id, role: 'owner', firstName: owner.firstName, lastName: owner.lastName, email: owner.email });
}
function ownerPublic(owner) {
  return { id: owner._id, firstName: owner.firstName, lastName: owner.lastName, email: owner.email, role: 'owner' };
}
function userToken(user) {
  return generateToken({ id: user._id, role: 'user', firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email });
}
function userPublic(user) {
  return { id: user._id, firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email, role: 'user' };
}

// ---------------------------------------------------------------------------
// USER REGISTER — step 1: validate & send OTP to email
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { firstName, lastName, phone, email, password } = req.body;
    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ message: 'Barcha maydonlarni to\'ldiring (email shart)' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' });
    }
    if (await db.users.findOne({ phone, role: 'user' })) {
      return res.status(409).json({ message: 'Bu raqam allaqachon ro\'yxatdan o\'tgan' });
    }
    if (await db.users.findOne({ email, role: 'user' })) {
      return res.status(409).json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
    }

    const result = await issueOtp(db, { purpose: 'user-register', target: email.toLowerCase(), email, name: firstName });
    if (!result.ok) {
      return res.status(429).json({ message: `Iltimos, ${result.cooldown} soniyadan so'ng qayta urinib ko'ring` });
    }
    res.status(200).json({
      requireOtp: true,
      target: email.toLowerCase(),
      email,
      message: 'Tasdiqlash kodi emailingizga yuborildi',
      ...(isDev && result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// USER REGISTER — step 2: verify OTP, then create the account
router.post('/register/verify', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { firstName, lastName, phone, email, password, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email va kod kerak' });

    const v = await verifyOtp(db, { purpose: 'user-register', target: email.toLowerCase(), code: otp });
    if (!v.ok) return res.status(400).json({ message: otpErrorMessage(v) });

    // Re-check uniqueness in case of a race
    if (await db.users.findOne({ phone, role: 'user' })) {
      return res.status(409).json({ message: 'Bu raqam allaqachon ro\'yxatdan o\'tgan' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await db.users.insert({
      firstName, lastName, phone, email: email.toLowerCase(), emailVerified: true,
      password: hash, role: 'user', createdAt: new Date().toISOString(),
    });
    res.status(201).json({ token: userToken(user), user: userPublic(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// ---------------------------------------------------------------------------
// USER LOGIN — password login (phone or email) + optional OTP 2FA
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { phone, email, password, otpLogin } = req.body;
    const query = email ? { email: String(email).toLowerCase(), role: 'user' } : { phone, role: 'user' };
    const user = await db.users.findOne(query);
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Parol noto\'g\'ri' });

    // Optional email-OTP as a second factor (only if the user has a verified email)
    if (otpLogin && user.email) {
      const result = await issueOtp(db, { purpose: 'user-login', target: user._id, email: user.email, name: user.firstName });
      if (!result.ok) return res.status(429).json({ message: `Iltimos, ${result.cooldown} soniyadan so'ng qayta urinib ko'ring` });
      return res.status(200).json({
        requireOtp: true, target: user._id, email: maskEmail(user.email),
        message: 'Tasdiqlash kodi emailingizga yuborildi',
        ...(isDev && result.devCode ? { devCode: result.devCode } : {}),
      });
    }

    res.json({ token: userToken(user), user: userPublic(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// USER LOGIN — verify the 2FA OTP
router.post('/login/verify', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { target, otp } = req.body;
    const v = await verifyOtp(db, { purpose: 'user-login', target, code: otp });
    if (!v.ok) return res.status(400).json({ message: otpErrorMessage(v) });

    const user = await db.users.findOne({ _id: target, role: 'user' });
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    res.json({ token: userToken(user), user: userPublic(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// ---------------------------------------------------------------------------
// ADMIN LOGIN
// ---------------------------------------------------------------------------
router.post('/admin-login', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { username, password } = req.body;
    const admin = await db.users.findOne({ username, role: 'admin' });
    if (!admin) return res.status(404).json({ message: 'Admin topilmadi' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Parol noto\'g\'ri' });

    const token = generateToken({ id: admin._id, role: 'admin', firstName: admin.firstName, lastName: admin.lastName });
    res.json({ token, user: { id: admin._id, firstName: admin.firstName, lastName: admin.lastName, role: 'admin' } });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// ---------------------------------------------------------------------------
// OWNER LOGIN — password check, then always require email OTP
// ---------------------------------------------------------------------------
router.post('/owner-login', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { username, password } = req.body;
    const owner = await db.owners.findOne({ username });
    if (!owner) return res.status(404).json({ message: 'To\'yxona egasi topilmadi' });

    const valid = await bcrypt.compare(password, owner.password);
    if (!valid) return res.status(401).json({ message: 'Parol noto\'g\'ri' });

    const result = await issueOtp(db, { purpose: 'owner-login', target: owner._id, email: owner.email, name: owner.firstName });
    if (!result.ok) {
      return res.status(429).json({ message: `Iltimos, ${result.cooldown} soniyadan so'ng qayta urinib ko'ring` });
    }
    res.status(200).json({
      requireOtp: true, target: owner._id, email: maskEmail(owner.email),
      message: 'Tasdiqlash kodi emailingizga yuborildi',
      ...(isDev && result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// OWNER — verify OTP
router.post('/owner-login/verify', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { target, otp } = req.body;
    const v = await verifyOtp(db, { purpose: 'owner-login', target, code: otp });
    if (!v.ok) return res.status(400).json({ message: otpErrorMessage(v) });

    const owner = await db.owners.findOne({ _id: target });
    if (!owner) return res.status(404).json({ message: 'To\'yxona egasi topilmadi' });
    await db.owners.update({ _id: owner._id }, { $set: { otpVerified: true } });
    res.json({ token: ownerToken(owner), user: ownerPublic(owner) });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// ---------------------------------------------------------------------------
// Generic resend (re-issues the code for an in-progress flow)
// ---------------------------------------------------------------------------
router.post('/resend-otp', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { purpose, target } = req.body;
    const allowed = ['owner-login', 'user-login', 'user-register'];
    if (!allowed.includes(purpose) || !target) {
      return res.status(400).json({ message: 'Noto\'g\'ri so\'rov' });
    }

    let email, name;
    if (purpose === 'owner-login') {
      const owner = await db.owners.findOne({ _id: target });
      if (!owner) return res.status(404).json({ message: 'Topilmadi' });
      email = owner.email; name = owner.firstName;
    } else if (purpose === 'user-login') {
      const user = await db.users.findOne({ _id: target, role: 'user' });
      if (!user) return res.status(404).json({ message: 'Topilmadi' });
      email = user.email; name = user.firstName;
    } else {
      email = target; // user-register keys by email
    }

    const result = await issueOtp(db, { purpose, target, email, name });
    if (!result.ok) return res.status(429).json({ message: `Iltimos, ${result.cooldown} soniyadan so'ng qayta urinib ko'ring` });
    res.json({ message: 'Kod qayta yuborildi', ...(isDev && result.devCode ? { devCode: result.devCode } : {}) });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// ---------------------------------------------------------------------------
// Current user info
// ---------------------------------------------------------------------------
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = req.user.role === 'owner'
      ? await db.owners.findOne({ _id: req.user.id })
      : await db.users.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ message: 'Topilmadi' });
    const { password, ...safe } = user;
    res.json({ ...safe, role: req.user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi' });
  }
});

function maskEmail(email) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

function otpErrorMessage(v) {
  switch (v.reason) {
    case 'not_found': return 'Kod topilmadi yoki muddati tugagan. Qayta yuboring.';
    case 'expired': return 'Kod muddati tugadi. Qayta yuboring.';
    case 'too_many_attempts': return 'Juda ko\'p urinish. Yangi kod so\'rang.';
    case 'invalid': return v.remaining > 0 ? `Kod noto'g'ri. ${v.remaining} urinish qoldi.` : 'Kod noto\'g\'ri.';
    default: return 'Kod tasdiqlanmadi';
  }
}

module.exports = router;
