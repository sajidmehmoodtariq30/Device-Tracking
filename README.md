# Device Tracking Application

A real-time location tracking application that allows users to create shareable tracking links and monitor locations in real-time.

## Features

- **User Authentication**: Secure login and registration system
- **Tracking Links**: Generate shareable links to track other users' locations
- **Real-time Updates**: Live location updates using Socket.IO
- **Admin Dashboard**: Monitor all active tracking sessions
- **Educational Transparency**: Clear about and privacy pages explaining the tracking process

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Frontend**: EJS templates, Leaflet maps, responsive CSS
- **Authentication**: bcryptjs, express-session

## Deployment

This application is configured for deployment on Vercel.

### Environment Variables

Set the following environment variables in your Vercel dashboard:

```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret_key
NODE_ENV=production
BASE_URL=https://your-app-name.vercel.app
```

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set the environment variables
4. Deploy!

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your environment variables
4. Start the development server: `npm run dev`

## How It Works

1. Users register and login to create tracking sessions
2. Generate shareable tracking links from the admin dashboard
3. When someone clicks the link, they can consent to share their location
4. The admin dashboard shows real-time location updates of all tracked users
5. All tracking is transparent with clear privacy information

## Educational Purpose

This application is designed for educational purposes to demonstrate real-time location tracking concepts. It includes comprehensive privacy information and requires explicit consent from tracked users.
