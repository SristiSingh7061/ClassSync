require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize } = require('./models');
require('./models/slotChange');           // registers the SlotChanges table
require('./models/substituteRequest');    // registers the SubstituteRequests table
const { initSocket } = require('./services/realtime');

const PORT = process.env.PORT || 5000;

(async () => {
  await sequelize.authenticate();
  console.log('Database connected');
  await sequelize.sync();                 // creates only MISSING tables, never alters existing ones
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => console.log(`ClassSync API running on :${PORT}`));
})().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
