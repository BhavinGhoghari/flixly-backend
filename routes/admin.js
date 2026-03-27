const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Movie = require('../models/Movie');
const Review = require('../models/Review');
const { adminAuth } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [totalMovies, totalSeries, totalUsers, totalReviews] = await Promise.all([
      Movie.countDocuments({ type: 'movie' }),
      Movie.countDocuments({ type: 'series' }),
      User.countDocuments({ role: 'user' }),
      Review.countDocuments()
    ]);
    res.json({ totalMovies, totalSeries, totalUsers, totalReviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
