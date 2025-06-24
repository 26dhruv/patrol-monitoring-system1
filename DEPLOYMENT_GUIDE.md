# Deployment Guide - Patrol Monitoring System

This guide covers multiple deployment options for your patrol monitoring system, including both the backend API and frontend client.

## 🚀 Quick Deployment Options

### Option 1: Render (Recommended for Beginners)
### Option 2: Railway
### Option 3: Heroku
### Option 4: Vercel + Railway
### Option 5: DigitalOcean App Platform

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] MongoDB database (MongoDB Atlas recommended)
- [ ] Environment variables configured
- [ ] API endpoints tested locally
- [ ] Frontend builds successfully
- [ ] CORS settings updated for production

---

## 🔧 Environment Variables Setup

### Backend (.env)
```env
NODE_ENV=production
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com/api
```

---

## 🎯 Option 1: Render (Recommended)

Render is a modern cloud platform that's perfect for full-stack applications.

### Backend Deployment on Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # In your server directory
   cd patrol-monitoring-system/server
   ```

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository
   - Configure:
     - **Name**: `patrol-api`
     - **Root Directory**: `patrol-monitoring-system/server`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment Variables**:
       ```
       NODE_ENV=production
       MONGO_URI=your_mongodb_atlas_connection_string
       JWT_SECRET=your_secure_jwt_secret
       JWT_EXPIRE=30d
       ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (usually 2-3 minutes)

### Frontend Deployment on Render

1. **Create Static Site**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `patrol-client`
     - **Root Directory**: `patrol-monitoring-system/client`
     - **Build Command**: `npm run build`
     - **Publish Directory**: `dist`
     - **Environment Variables**:
       ```
       VITE_API_URL=https://your-backend-url.onrender.com/api
       ```

2. **Deploy**
   - Click "Create Static Site"

---

## 🚂 Option 2: Railway

Railway is another excellent option with automatic deployments.

### Backend Deployment on Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Configure:
     - **Root Directory**: `patrol-monitoring-system/server`
     - **Environment Variables**:
       ```
       NODE_ENV=production
       MONGO_URI=your_mongodb_atlas_connection_string
       JWT_SECRET=your_secure_jwt_secret
       JWT_EXPIRE=30d
       ```

3. **Deploy**
   - Railway will automatically detect Node.js and deploy

### Frontend Deployment on Railway

1. **Add Frontend Service**
   - In your Railway project, click "New Service" → "GitHub Repo"
   - Select the same repository
   - Configure:
     - **Root Directory**: `patrol-monitoring-system/client`
     - **Build Command**: `npm run build`
     - **Start Command**: `npm run preview`
     - **Environment Variables**:
       ```
       VITE_API_URL=https://your-backend-url.railway.app/api
       ```

---

## 🎪 Option 3: Heroku

### Backend Deployment on Heroku

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd patrol-monitoring-system/server
   heroku create your-patrol-api
   ```

4. **Add MongoDB**
   ```bash
   heroku addons:create mongolab:sandbox
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_secure_jwt_secret
   heroku config:set JWT_EXPIRE=30d
   ```

6. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Frontend Deployment on Heroku

1. **Create Static Buildpack**
   ```bash
   cd patrol-monitoring-system/client
   heroku create your-patrol-client --buildpack https://github.com/heroku/heroku-buildpack-static.git
   ```

2. **Create static.json**
   ```json
   {
     "root": "dist",
     "routes": {
       "/**": "index.html"
     }
   }
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set VITE_API_URL=https://your-backend-url.herokuapp.com/api
   ```

4. **Deploy**
   ```bash
   npm run build
   git add .
   git commit -m "Build for production"
   git push heroku main
   ```

---

## ⚡ Option 4: Vercel + Railway (Best Performance)

### Backend on Railway
Follow the Railway backend deployment steps above.

### Frontend on Vercel

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Deploy Frontend**
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `patrol-monitoring-system/client`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Environment Variables**:
       ```
       VITE_API_URL=https://your-backend-url.railway.app/api
       ```

3. **Deploy**
   - Click "Deploy"

---

## 🌊 Option 5: DigitalOcean App Platform

### Backend Deployment

1. **Create DigitalOcean Account**
   - Go to [digitalocean.com](https://digitalocean.com)
   - Sign up

2. **Create App**
   - Go to "Apps" → "Create App"
   - Connect your GitHub repository
   - Configure:
     - **Source Directory**: `patrol-monitoring-system/server`
     - **Build Command**: `npm install`
     - **Run Command**: `npm start`
     - **Environment Variables**:
       ```
       NODE_ENV=production
       MONGO_URI=your_mongodb_atlas_connection_string
       JWT_SECRET=your_secure_jwt_secret
       JWT_EXPIRE=30d
       ```

### Frontend Deployment

1. **Create Another App**
   - Create a new app for the frontend
   - Configure:
     - **Source Directory**: `patrol-monitoring-system/client`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Environment Variables**:
       ```
       VITE_API_URL=https://your-backend-app-url.ondigitalocean.app/api
       ```

---

## 🗄️ Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for free tier

2. **Create Cluster**
   - Choose "Shared" → "M0 Free"
   - Select cloud provider and region
   - Click "Create"

3. **Configure Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Add `0.0.0.0/0` for all IPs (or your deployment IP)

4. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username and password

5. **Get Connection String**
   - Go to "Clusters" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

---

## 🔄 Update Frontend API Configuration

After deploying your backend, update your frontend's API configuration:

1. **Update Environment Variables**
   ```env
   # .env.production
   VITE_API_URL=https://your-backend-url.com/api
   ```

2. **Update CORS in Backend**
   ```javascript
   // In server/index.js
   app.use(cors({
     origin: ['https://your-frontend-url.com', 'http://localhost:5173'],
     credentials: true
   }));
   ```

---

## 🧪 Testing Your Deployment

1. **Test Backend API**
   ```bash
   curl https://your-backend-url.com/api/auth/me
   ```

2. **Test Frontend**
   - Visit your frontend URL
   - Try logging in
   - Test all major features

3. **Check Logs**
   - Monitor deployment logs for errors
   - Check application logs for issues

---

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure CORS is properly configured
   - Check that frontend URL is in allowed origins

2. **Database Connection Issues**
   - Verify MongoDB connection string
   - Check network access settings
   - Ensure database user has proper permissions

3. **Environment Variables**
   - Double-check all environment variables are set
   - Ensure no typos in variable names

4. **Build Failures**
   - Check package.json scripts
   - Verify all dependencies are installed
   - Check for syntax errors

### Debug Commands

```bash
# Check backend logs
heroku logs --tail  # Heroku
railway logs        # Railway
render logs         # Render

# Check environment variables
heroku config       # Heroku
railway variables   # Railway
```

---

## 📊 Monitoring and Maintenance

1. **Set up Monitoring**
   - Enable logging and monitoring on your platform
   - Set up alerts for downtime

2. **Regular Updates**
   - Keep dependencies updated
   - Monitor security patches

3. **Backup Strategy**
   - Set up automated database backups
   - Keep deployment configurations in version control

---

## 💰 Cost Comparison

| Platform | Backend | Frontend | Database | Monthly Cost |
|----------|---------|----------|----------|--------------|
| Render   | Free    | Free     | MongoDB Atlas Free | $0 |
| Railway  | $5      | $5       | MongoDB Atlas Free | $10 |
| Heroku   | $7      | Free     | MongoDB Atlas Free | $7 |
| Vercel   | Free    | Free     | MongoDB Atlas Free | $0 |
| DigitalOcean | $5   | $5       | MongoDB Atlas Free | $10 |

---

## 🎯 Recommended Setup

For a production application, I recommend:

1. **Backend**: Railway or Render
2. **Frontend**: Vercel
3. **Database**: MongoDB Atlas (M0 Free tier)
4. **Domain**: Custom domain (optional)

This combination provides:
- Excellent performance
- Good free tier limits
- Easy deployment and maintenance
- Reliable uptime

---

## 🚀 Next Steps

1. Choose your deployment platform
2. Set up MongoDB Atlas database
3. Deploy backend first
4. Update frontend API configuration
5. Deploy frontend
6. Test thoroughly
7. Set up monitoring and alerts

Your patrol monitoring system will be live and accessible from anywhere in the world! 