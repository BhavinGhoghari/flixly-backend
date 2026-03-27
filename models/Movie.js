const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['movie', 'series'], required: true },
  description: { type: String, required: true },
  genre: [{ type: String }],
  releaseYear: { type: Number },
  duration: { type: String }, // e.g. "2h 30m" for movies, "Season 1-3" for series
  rating: { type: Number, default: 0 }, // IMDB-style rating
  cast: [{ name: String, role: String }],
  director: { type: String },
  language: { type: String, default: 'English' },
  country: { type: String },
  trailerUrl: { type: String }, // YouTube embed URL
  posterUrl: { type: String },
  backdropUrl: { type: String },
  imdbId: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  featured: { type: Boolean, default: false },
  totalSeasons: { type: Number }, // for series
  totalEpisodes: { type: Number }, // for series
  ageRating: { type: String, default: 'PG-13' },
  tags: [{ type: String }],
  averageUserRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movie', movieSchema);
