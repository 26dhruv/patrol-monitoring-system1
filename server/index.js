const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandlerMiddleware = require('./middleware/error-handler');
const PatrolStatusManager = require('./services/patrolStatusManager');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;

// Initialize patrol status manager
const patrolStatusManager = new PatrolStatusManager();

// Middleware
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(cors());

// Import routes
const authRoutes = require('./routes/auth');
const patrolRoutes = require('./routes/patrol');
const patrolRouteRoutes = require('./routes/patrolRoute');
const userRoutes = require('./routes/user');
const locationRoutes = require('./routes/location');
const incidentRoutes = require('./routes/incident');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');
const aiSchedulerRoutes = require('./routes/aiScheduler');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/patrol', patrolRoutes);
app.use('/api/patrol-routes', patrolRouteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai-scheduler', aiSchedulerRoutes);

// Serve static files from the React app build directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
} else {
  // Root route for development
  app.get('/', (req, res) => {
    res.send('Patrol Monitoring System API is running');
  });
}

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
      
      // Start the patrol status scheduler
      patrolStatusManager.startStatusScheduler();
    });
  })
  .catch((error) => console.log(`${error} did not connect`)); 