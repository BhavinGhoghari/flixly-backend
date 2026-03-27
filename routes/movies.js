const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const { adminAuth } = require('../middleware/auth');

// Get all movies/series with filters
router.get('/', async (req, res) => {
  try {
    const { type, genre, search, featured, page = 1, limit = 20 } = req.query;
    const query = { status: 'active' };

    if (type) query.type = type;
    if (genre) query.genre = { $in: [genre] };
    if (featured) query.featured = true;
    if (search) query.title = { $regex: search, $options: 'i' };

    const total = await Movie.countDocuments(query);
    const movies = await Movie.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ movies, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single movie
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Create movie
router.post('/', adminAuth, async (req, res) => {
  try {
    const movie = new Movie(req.body);
    await movie.save();
    res.status(201).json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Update movie
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Delete movie
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
