const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { corsOrigin } = require('./services/origins');

const app = express();
app.set('trust proxy', 1);                 // Render / Vercel sit behind a proxy
app.use(helmet());
app.use(cors({ origin: corsOrigin() }));
app.use(express.json({ limit: '100kb' }));

// Brute-force protection: only FAILED login/register attempts are counted
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, skipSuccessfulRequests: true,
  standardHeaders: 'draft-7', legacyHeaders: false,
  message: { message: 'Too many failed attempts. Please try again in 15 minutes.' },
}));

app.use('/api', require('./routes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong on the server. Please try again shortly.'  // never leak DB errors in production
    : err.message || 'Server error';
  res.status(status).json({ message });
});
module.exports = app;
