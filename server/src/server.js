require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  await sequelize.authenticate();
  console.log('Database connected');
  app.listen(PORT, () => console.log(`ClassSync API running on :${PORT}`));
})().catch((e) => {
  console.error('Startup failed:', e.message);
  process.exit(1);
});