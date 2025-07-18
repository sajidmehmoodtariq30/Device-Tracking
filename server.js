import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import authRoutes from "./routes/auth.js";
import trackingRoutes from "./routes/tracking.js";
import adminRoutes from "./routes/admin.js";
import publicRoutes from "./routes/public.js";

// Import middleware
import { setUserLocals } from "./middleware/auth.js";

// Import models
import User from "./models/User.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.socket.io", "https://vercel.live", "https://*.vercel.app"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://vercel.live", "https://*.vercel.app"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://vercel.live", "https://*.vercel.app"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/device-tracking', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/device-tracking',
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// Set user locals for all routes
app.use(setUserLocals);

// Routes
app.use('/', authRoutes);
app.use('/', trackingRoutes);
app.use('/', adminRoutes);
app.use('/', publicRoutes);

// Root route - redirect to appropriate page
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Handle admin connecting
    socket.on('adminConnect', (data) => {
        socket.userId = data.userId;
        socket.isAdmin = true;
        console.log(`Admin ${data.userId} connected`);
    });
    
    // Handle user joining (from public tracking pages)
    socket.on('join', async (data) => {
        try {
            socket.sessionId = data.sessionId;
            socket.username = data.username || 'Anonymous';
            
            console.log(`User joined tracking session: ${data.sessionId}`);
        } catch (error) {
            console.error('Error handling user join:', error);
        }
    });
    
    // Handle location updates from public tracking pages
    socket.on('locationUpdate', async (data) => {
        try {
            const { sessionId, latitude, longitude, accuracy, timestamp, deviceInfo } = data;
            
            // Find the session
            const session = await TrackingSession.findOne({ sessionId });
            if (!session) {
                console.log('Session not found:', sessionId);
                return;
            }
            
            // Broadcast to admin users who own this session
            const adminUsers = await User.find({ _id: session.createdBy });
            adminUsers.forEach(admin => {
                // Find admin sockets
                const adminSockets = [...io.sockets.sockets.values()].filter(s => 
                    s.userId === admin._id.toString() && s.isAdmin
                );
                
                adminSockets.forEach(adminSocket => {
                    adminSocket.emit('newLocationData', {
                        sessionId,
                        sessionTitle: session.title,
                        latitude,
                        longitude,
                        accuracy,
                        timestamp,
                        deviceInfo
                    });
                });
            });
            
            console.log(`Location update broadcasted for session: ${session.title}`);
        } catch (error) {
            console.error('Error handling location update:', error);
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.sessionId) {
            console.log(`User left tracking session: ${socket.sessionId}`);
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Server Error',
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: {}
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});