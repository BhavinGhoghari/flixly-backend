const mongoose = require('mongoose');
require('dotenv').config();
const Movie = require('./models/Movie');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const result = await Movie.updateOne(
      { imdbId: 'tmdb_875828' },
      { $set: { imdbId: 'tmdb_movie_875828' } }
    );
    
    console.log('Update result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
