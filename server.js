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

let db = null;
let mongoError = null;

async function connectToMongo() {
  if (!MONGO_URI) {
    mongoError = 'MONGODB_URI env var not set';
    console.error(mongoError);
    return;
  }
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB Atlas:', DB_NAME);
  } catch (e) {
    mongoError = e.message;
    console.error('MongoDB connection failed:', e.message);
  }
}

function getCollection(payload) {
  const collName = payload.collection || COLLECTION_NAME;
  return db.collection(collName);
}

function requireDb(req, res, next) {
  if (!db) {
    return res.status(503).json({ error: 'Database not connected', detail: mongoError || 'unknown' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({ status: db ? 'connected' : 'error', db: !!db, error: mongoError });
});

app.get('/', (req, res) => {
  res.json({ service: 'Site Monitor v3 Proxy', status: db ? 'connected' : 'connecting...', error: mongoError });
});

app.post('/action/find', requireDb, async (req, res) => {
  try {
    const { filter, limit, sort } = req.body;
    const collection = getCollection(req.body);
    const docs = await collection.find(filter || {}).limit(limit || 50).sort(sort || {}).toArray();
    res.json({ documents: docs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/findOne', requireDb, async (req, res) => {
  try {
    const { filter } = req.body;
    const collection = getCollection(req.body);
    const doc = await collection.findOne(filter || {});
    res.json({ document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/insertOne', requireDb, async (req, res) => {
  try {
    const { document } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.insertOne(document);
    res.json({ insertedId: result.insertedId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/insertMany', requireDb, async (req, res) => {
  try {
    const { documents } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.insertMany(documents);
    res.json({ insertedIds: result.insertedIds });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/updateOne', requireDb, async (req, res) => {
  try {
    const { filter, update } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.updateOne(filter || {}, update || {});
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/updateMany', requireDb, async (req, res) => {
  try {
    const { filter, update } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.updateMany(filter || {}, update || {});
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/deleteOne', requireDb, async (req, res) => {
  try {
    const { filter } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.deleteOne(filter || {});
    res.json({ deletedCount: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/deleteMany', requireDb, async (req, res) => {
  try {
    const { filter } = req.body;
    const collection = getCollection(req.body);
    const result = await collection.deleteMany(filter || {});
    res.json({ deletedCount: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/action/aggregate', requireDb, async (req, res) => {
  try {
    const pipeline = req.body.pipeline || [];
    const collection = getCollection(req.body);
    const docs = await collection.aggregate(pipeline).toArray();
    res.json({ documents: docs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

connectToMongo();
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
