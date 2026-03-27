const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Movie = require('../models/Movie');
const { auth, adminAuth } = require('../middleware/auth');
const { importMovieFromTMDB } = require('../utils/movieUtils');

// Get reviews for a movie
router.get('/movie/:movieId', async (req, res) => {
  try {
    let { movieId } = req.params;

    // Resolve TMDB ID to internal ObjectId if needed
    if (!movieId.match(/^[0-9a-fA-F]{24}$/)) {
      // Find movie by numeric ID or prefixed ID
      const movie = await Movie.findOne({
        $or: [
          { imdbId: movieId },
          { imdbId: `tmdb_movie_${movieId}` },
          { imdbId: `tmdb_series_${movieId}` }
        ]
      });
      if (!movie) return res.json([]); // Not imported yet = no reviews
      movieId = movie._id;
    }

    const reviews = await Review.find({ movie: movieId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add review
router.post('/', auth, async (req, res) => {
  try {
    let { movieId, rating, verdict, message } = req.body;

    // Resolve TMDB ID to internal ObjectId if needed
    if (!movieId.match(/^[0-9a-fA-F]{24}$/)) {
      let movie = await Movie.findOne({
        $or: [
          { imdbId: movieId },
          { imdbId: `tmdb_movie_${movieId}` },
          { imdbId: `tmdb_series_${movieId}` }
        ]
      });

      if (!movie) {
        // Auto-import if it's a TMDB ID
        const match = movieId.match(/^tmdb_(movie|series)_(\d+)$/);
        if (match) {
          try {
            movie = await importMovieFromTMDB(match[2], match[1]);
          } catch (err) {
            return res.status(400).json({ message: 'Failed to auto-import title for review. ' + err.message });
          }
        } else {
          return res.status(400).json({ message: 'This title must be imported before you can review it.' });
        }
      }
      movieId = movie._id;
    }

    // Check if already reviewed
    const existing = await Review.findOne({ movie: movieId, user: req.user._id });
    if (existing) return res.status(400).json({ message: 'You already reviewed this title' });

    const review = new Review({
      movie: movieId,
      user: req.user._id,
      rating,
      verdict,
      message
    });
    await review.save();
    await review.populate('user', 'name avatar');

    // Update movie average rating
    const allReviews = await Review.find({ movie: movieId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Movie.findByIdAndUpdate(movieId, {
      averageUserRating: Math.round(avg * 10) / 10,
      totalReviews: allReviews.length
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete review (admin or owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Not found' });
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await review.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all reviews
router.get('/all', adminAuth, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('movie', 'title')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
