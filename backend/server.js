/**
 * Tirap Performance Index — Express API entry point (port 3001).
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { corsOrigin, jwtSecret } = require('./config');
const { authenticate } = require('./middleware/auth');
const { loginLimiter, apiLimiter } = require('./middleware/rateLimit');

const isProduction = process.env.NODE_ENV === 'production';
const WEAK_SECRETS = new Set([
  'tpi-dev-secret-change-in-production',
  'change-me-to-a-long-random-string',
  'secret',
  'jwt-secret'
]);

if (isProduction && (!jwtSecret || WEAK_SECRETS.has(jwtSecret) || jwtSecret.length < 32)) {
  console.error('FATAL: Set a strong JWT_SECRET (32+ chars) in production.');
  process.exit(1);
}

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dept', authenticate, require('./routes/dept'));
app.use('/api/dashboard', authenticate, require('./routes/dashboard'));

app.get('/', (_req, res) => {
  res.send('Tirap Performance Index API');
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`TPI API running on port ${port} (CORS: ${corsOrigin})`);
});
