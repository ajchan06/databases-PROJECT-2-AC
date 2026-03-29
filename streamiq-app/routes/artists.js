const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// ── GET all artists ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { genre } = req.query;
    const filter = genre
      ? { primaryGenre: { $regex: genre, $options: 'i' } }
      : {};
    const artists = await req.db.collection('artists').find(filter).toArray();
    res.json(artists);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET single artist ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const artist = await req.db.collection('artists').findOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST create artist ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, country, primaryGenre, bio } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const newArtist = {
      name,
      country: country || '',
      primaryGenre: primaryGenre || 'Unknown',
      bio: bio || '',
      albums: []
    };
    const result = await req.db.collection('artists').insertOne(newArtist);
    res.status(201).json({ _id: result.insertedId, ...newArtist });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT update artist ────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, country, primaryGenre, bio } = req.body;
    const updates = {};
    if (name)         updates.name         = name;
    if (country)      updates.country      = country;
    if (primaryGenre) updates.primaryGenre = primaryGenre;
    if (bio !== undefined) updates.bio     = bio;

    const result = await req.db.collection('artists').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Artist not found' });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH toggle isExplicit on ALL songs in a specific album ─────────────────
// Body: { albumTitle: "Concrete Jungle" }
// This is the same boolean-toggle requirement fulfilled in queries.js Query 4
router.patch('/:id/toggle-explicit', async (req, res) => {
  try {
    const { albumTitle } = req.body;
    if (!albumTitle)
      return res.status(400).json({ error: 'albumTitle is required' });

    // Pipeline update: map over albums, flip isExplicit on matching album's songs
    const result = await req.db.collection('artists').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), 'albums.title': albumTitle },
      [
        {
          $set: {
            albums: {
              $map: {
                input: '$albums',
                as: 'album',
                in: {
                  $cond: {
                    if: { $eq: ['$$album.title', albumTitle] },
                    then: {
                      $mergeObjects: [
                        '$$album',
                        {
                          songs: {
                            $map: {
                              input: '$$album.songs',
                              as: 'song',
                              in: {
                                $mergeObjects: [
                                  '$$song',
                                  { isExplicit: { $not: '$$song.isExplicit' } }
                                ]
                              }
                            }
                          }
                        }
                      ]
                    },
                    else: '$$album'
                  }
                }
              }
            }
          }
        }
      ],
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Artist or album not found' });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE artist ────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await req.db.collection('artists').deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0)
      return res.status(404).json({ error: 'Artist not found' });
    res.json({ message: 'Artist deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
