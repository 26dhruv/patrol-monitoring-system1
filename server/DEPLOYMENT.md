# Backend Deployment Guide

## Free Hosting Options

### 1. Render (Recommended)

**Steps:**
1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub repository
3. Create a new Web Service
4. Select your repository and server folder
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

**Environment Variables to set in Render:**
```
PORT=5001
NODE_ENV=production
MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=24h
```

### 2. Railway

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Connect GitHub and select your repository
3. Add environment variables
4. Deploy automatically

### 3. Heroku

**Steps:**
1. Install Heroku CLI
2. Run: `heroku create your-app-name`
3. Add MongoDB addon: `heroku addons:create mongolab`
4. Deploy: `git push heroku main`

## Database Setup (MongoDB Atlas)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free account
3. Create a new cluster (free tier)
4. Get your connection string
5. Replace `MONGO_URI` in your environment variables

## Environment Variables Template

Create a `.env` file with:
```
PORT=5001
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_secure_secret_key
JWT_EXPIRE=24h
CORS_ORIGIN=https://your-frontend-domain.com
```

## Pre-deployment Checklist

- [ ] All environment variables are configured
- [ ] MongoDB Atlas cluster is set up
- [ ] CORS is properly configured for your frontend domain
- [ ] All dependencies are in package.json
- [ ] Start script is working locally

## Post-deployment

1. Test your API endpoints
2. Update your frontend to use the new API URL
3. Monitor logs for any errors
4. Set up custom domain if needed

## Troubleshooting

- **Port issues**: Make sure to use `process.env.PORT` (Render/Railway set this automatically)
- **MongoDB connection**: Check your connection string and network access
- **CORS errors**: Update CORS_ORIGIN to your frontend domain
- **Build failures**: Check your package.json and dependencies 