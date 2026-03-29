const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'streamiq';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let db;

MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db(DB_NAME);
    console.log(`✅ Connected to MongoDB — database: ${DB_NAME}`);
    app.listen(PORT, () =>
      console.log(`🚀 StreamIQ running at http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// Attach db to every request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Mount routes
app.use('/api/users',   require('./routes/users'));
app.use('/api/artists', require('./routes/artists'));
app.use('/api/history', require('./routes/history'));

// Serve the single-page frontend
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

module.exports = app;
