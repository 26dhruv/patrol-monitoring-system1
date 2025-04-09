const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandlerMiddleware = require('./middleware/error-handler');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(cors());

// Import routes
const authRoutes = require('./routes/auth');
const patrolRoutes = require('./routes/patrol');
const userRoutes = require('./routes/user');
const locationRoutes = require('./routes/location');
const incidentRoutes = require('./routes/incident');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/patrol', patrolRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Patrol Monitoring System API is running');
});

// Error handler middleware
app.use(errorHandlerMiddleware);

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
      console.log('MongoDB Connected');
    });
  })
  .catch((error) => console.log(`${error} did not connect`)); 