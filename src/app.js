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

// serve the demo client
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/notifications', notificationRoutes);

app.use(errorMiddleware);

module.exports = app;
