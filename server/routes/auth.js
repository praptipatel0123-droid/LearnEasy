const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (user) => jwt.sign(
  { id: user._id, firstName: user.firstName, grade: user.grade },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const exists = await User.findOne({ email: req.body.email });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    const user = await User.create(req.body);
    const userData = { token: sign(user), firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, city: user.city, state: user.state, country: user.country, grade: user.grade, board: user.board };
    res.status(201).json(userData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'No account found with this email.' });

    const match = await user.matchPassword(req.body.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password.' });

    res.json({ token: sign(user), firstName: user.firstName, grade: user.grade });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
