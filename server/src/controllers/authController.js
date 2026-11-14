const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const AVATAR_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Rose
  '#7C3AED', // Violet
  '#2563EB', // Blue
  '#DB2777', // Pink
  '#0D9488'  // Teal
];

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, avatar_color)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name.trim(), email.toLowerCase().trim(), passwordHash, avatarColor);

    const user = { id, name: name.trim(), email: email.toLowerCase().trim(), avatar_color: avatarColor };
    const token = generateToken(user);

    return res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_color: user.avatar_color
    };
    const token = generateToken(safeUser);

    return res.json({ user: safeUser, token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

function demoLogin(req, res) {
  try {
    const db = getDb();
    let demoUser = db.prepare("SELECT * FROM users WHERE email = 'alex@studentflat.com'").get();

    if (!demoUser) {
      // Run seeder automatically if demo user is missing
      const { runSeed } = require('../seed');
      runSeed();
      demoUser = db.prepare("SELECT * FROM users WHERE email = 'alex@studentflat.com'").get();
    }

    const safeUser = {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      avatar_color: demoUser.avatar_color
    };
    const token = generateToken(safeUser);

    return res.json({ user: safeUser, token, isDemo: true });
  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ error: 'Failed to initialize demo login' });
  }
}

function getMe(req, res) {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

module.exports = {
  register,
  login,
  demoLogin,
  getMe
};

