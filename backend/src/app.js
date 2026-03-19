const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const leagueRoutes = require('./routes/leagueRoutes');
const apiCenterRoutes = require('./routes/apiCenterRoutes');
const playerProxyRoutes = require('./routes/playerProxyRoutes');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const { getFrontendOrigins } = require('./config/env');

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = getFrontendOrigins();

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error('Origin not allowed by CORS policy');
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/api-center', apiCenterRoutes);
app.use('/api/player', playerProxyRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
