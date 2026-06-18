const https = require('https');
const http = require('http');

const PROXY = 'https://site-monitor-v3-proxy.onrender.com';

function api(action, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(PROXY + '/action/' + action);
    const data = JSON.stringify(Object.assign({ database: 'site_monitor', collection: 'units' }, payload));
    const opts = {
      hostname: url.hostname, port: 443, path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { reject(new Error(body)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Reading all documents from old units collection...');
  let all = [];
  let skip = 0;
  const limit = 5000;

  while (true) {
    const result = await api('find', { filter: {}, limit, skip });
    const docs = result.documents || [];
    if (docs.length === 0) break;
    all = all.concat(docs);
    console.log(`  Fetched ${all.length} documents...`);
    skip += limit;
  }

  console.log(`Total fetched: ${all.length}`);

  const units = [];
  const activities = [];
  const users = [];
  const announcements = [];

  for (const doc of all) {
    if (doc.scope && doc.activity) {
      const { _id, ...rest } = doc;
      activities.push(rest);
    } else if (doc.email) {
      const { _id, ...rest } = doc;
      users.push(rest);
    } else if (doc.title && !doc.unitId) {
      const { _id, ...rest } = doc;
      announcements.push(rest);
    } else if (doc.unitId) {
      const { _id, ...rest } = doc;
      units.push(rest);
    }
  }

  console.log(`\nBreakdown:`);
  console.log(`  Units:         ${units.length}`);
  console.log(`  Activities:    ${activities.length}`);
  console.log(`  Users:         ${users.length}`);
  console.log(`  Announcements: ${announcements.length}`);

  // Insert into proper collections
  for (const [coll, docs] of [['units', units], ['activities', activities], ['users', users], ['announcements', announcements]]) {
    if (docs.length === 0) { console.log(`\n${coll}: nothing to insert`); continue; }
    console.log(`\n${coll}: inserting ${docs.length} documents...`);
    for (let i = 0; i < docs.length; i += 100) {
      const batch = docs.slice(i, i + 100);
      try {
        await api('insertMany', { collection: coll, documents: batch });
        process.stdout.write('.');
      } catch (e) {
        console.error(`\nError inserting batch ${i / 100}: ${e.message}`);
      }
    }
    console.log(' done');
  }

  // Clear old mixed collection
  console.log('\nClearing old units collection...');
  const del = await api('deleteMany', { collection: 'units', filter: {} });
  console.log(`Deleted ${del.deletedCount || 0} documents from old collection`);

  console.log('\nMigration complete!');
}

run().catch(console.error);
