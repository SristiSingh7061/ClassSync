require('dotenv').config();
const { Client } = require('pg');
const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
c.connect()
  .then(() => c.query('select now()'))
  .then((r) => { console.log('OK', r.rows[0]); return c.end(); })
  .catch((e) => console.log('ERR', e.code, e.message));