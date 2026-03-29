const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// ── GET all users ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const users = await req.db.collection('users')
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET single user ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { passwordHash: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST create user ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { username, email, subscriptionTier } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'username and email are required' });
    }
    const existing = await req.db.collection('users').findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const newUser = {
      username,
      email,
      passwordHash: '$2b$10$placeholder',
      subscriptionTier: subscriptionTier || 'Free',
      dateJoined: new Date().toISOString().slice(0, 10),
      playlists: [],
      followedArtists: [],
      listeningSnapshots: []
    };
    const result = await req.db.collection('users').insertOne(newUser);
    const { passwordHash, ...safe } = newUser;
    res.status(201).json({ _id: result.insertedId, ...safe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT update user ──────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { username, email, subscriptionTier } = req.body;
    const updates = {};
    if (username)         updates.username         = username;
    if (email)            updates.email            = email;
    if (subscriptionTier) updates.subscriptionTier = subscriptionTier;

    const result = await req.db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updates },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH toggle subscription tier (Free ↔ Premium) ─────────────────────────
router.patch('/:id/toggle-tier', async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const nextTier = user.subscriptionTier === 'Free' ? 'Premium' : 'Free';
    const result = await req.db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { subscriptionTier: nextTier } },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE user ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await req.db.collection('users').deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0)
      return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
