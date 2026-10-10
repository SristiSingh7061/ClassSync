require('dotenv').config();
const { Client } = require('pg');

const u = new URL(process.env.DATABASE_URL);
const c = new Client({
  host: u.hostname,
  port: 5432,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

c.connect()
  .then(() => c.query('select now()'))
  .then((r) => { console.log('OK', r.rows[0]); return c.end(); })
  .catch((e) => console.log('ERR', e.code, e.message));