// CLIENT_URL can hold one site or several, comma separated:
//   CLIENT_URL=https://classsync.vercel.app,http://localhost:5173
const parseOrigins = (value) => (value || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
const corsOrigin = (value = process.env.CLIENT_URL) => { const list = parseOrigins(value); return list.length ? list : '*'; };
module.exports = { parseOrigins, corsOrigin };
