const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'site_monitor';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'units';

let db;

async function connectToMongo() {
  if (!MONGO_URI) {
    console.error('MONGODB_URI not set. Copy .env.example to .env and fill in your connection string.');
    process.exit(1);
  }
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB Atlas:', DB_NAME);
}

function getCollection(payload) {
  const collName = payload.collection || COLLECTION_NAME;
  return db.collection(collName);
}

// POST /action/find
app.post('/action/find', async (req, res) => {
  try {
    const { filter, limit, sort } = req.body;
    const collection = getCollection(req.body);
    const docs = await collection.find(filter || {}).limit(limit || 50).sort(sort || {}).toArray();
    res.json({ documents: docs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/findOne
app.post('/action/findOne', async (req, res) => {
  try {
    const { filter } = req.body;
    const collection = getCollection(req.body);
    const doc = await collection.findOne(filter || {});
    res.json({ document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/insertOne
app.post('/action/insertOne', async (req, res) => {
  try {
    const { document } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.insertOne(document);
    res.json({ insertedId: result.insertedId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/insertMany
app.post('/action/insertMany', async (req, res) => {
  try {
    const { documents } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.insertMany(documents);
    res.json({ insertedIds: result.insertedIds });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/updateOne
app.post('/action/updateOne', async (req, res) => {
  try {
    const { filter, update } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.updateOne(filter || {}, update || {});
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/updateMany
app.post('/action/updateMany', async (req, res) => {
  try {
    const { filter, update } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.updateMany(filter || {}, update || {});
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/deleteOne
app.post('/action/deleteOne', async (req, res) => {
  try {
    const { filter } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.deleteOne(filter || {});
    res.json({ deletedCount: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/deleteMany
app.post('/action/deleteMany', async (req, res) => {
  try {
    const { filter } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.deleteMany(filter || {});
    res.json({ deletedCount: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /action/aggregate
app.post('/action/aggregate', async (req, res) => {
  try {
    const pipeline = req.body.pipeline || [];
    const collection = getCollection(req.body);
    const docs = await collection.aggregate(pipeline).toArray();
    res.json({ documents: docs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: !!db });
});

connectToMongo().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
