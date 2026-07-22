const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const notificationRoutes = require('./routes/notification.routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
}));

// serve the demo client without static caching so updates show immediately
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  },
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/notifications', notificationRoutes);

app.use(errorMiddleware);

module.exports = app;
