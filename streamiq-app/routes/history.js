const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// ── GET listen history (filterable by username) ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { username, limit = 50 } = req.query;
    const filter = username ? { username } : {};
    const history = await req.db.collection('listenHistory')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .toArray();
    res.json(history);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET count for a specific user (Query 3 from queries.js) ──────────────────
router.get('/count/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const total = await req.db.collection('listenHistory')
      .countDocuments({ username });

    const monthly = await req.db.collection('listenHistory').aggregate([
      { $match: { username } },
      {
        $group: {
          _id: { $substr: [{ $dateToString: { format: '%Y-%m', date: '$timestamp' } }, 0, 7] },
          listens: { $sum: 1 },
          totalMinutes: { $sum: { $divide: ['$playDuration', 60] } }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', listens: 1, totalMinutes: { $round: ['$totalMinutes', 1] } } }
    ]).toArray();

    res.json({ username, total, monthly });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST log a new listen event ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { username, userID, playDuration, songID, title, artistName, albumTitle } = req.body;
    if (!username || !songID || !title) {
      return res.status(400).json({ error: 'username, songID, and title are required' });
    }

    const event = {
      timestamp: new Date(),
      playDuration: Number(playDuration) || 0,
      userID: userID || null,
      username,
      song: {
        songID: Number(songID),
        title,
        artistName: artistName || '',
        albumTitle: albumTitle || ''
      }
    };
    const result = await req.db.collection('listenHistory').insertOne(event);
    res.status(201).json({ _id: result.insertedId, ...event });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE a listen event ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await req.db.collection('listenHistory').deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0)
      return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Listen event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
