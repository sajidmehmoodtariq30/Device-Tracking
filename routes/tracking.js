import express from 'express';
import User from '../models/User.js';
import TrackingSession from '../models/TrackingSession.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Dashboard (main tracking page)
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        console.log('Dashboard access attempt, session userId:', req.session.userId);
        const user = await User.findById(req.session.userId);
        console.log('User found for dashboard:', !!user);
        
        if (!user) {
            console.log('User not found, redirecting to login');
            return res.redirect('/login');
        }
        
        res.render('dashboard', { 
            title: 'Dashboard',
            user: user,
            lastLocation: user.lastLocation
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/login');
    }
});

// Get user location
router.get('/api/location', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.json({
            success: true,
            location: user.lastLocation
        });
    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get location'
        });
    }
});

// Update user location
router.post('/api/location', requireAuth, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        const user = await User.findById(req.session.userId);
        await user.updateLocation(latitude, longitude);
        
        res.json({
            success: true,
            message: 'Location updated successfully'
        });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update location'
        });
    }
});

// Get all users' locations (for admin or group tracking)
router.get('/api/users/locations', requireAuth, async (req, res) => {
    try {
        const users = await User.find(
            { isActive: true },
            'username lastLocation deviceInfo.lastSeen'
        );
        
        const locations = users.map(user => ({
            id: user._id,
            username: user.username,
            location: user.lastLocation,
            lastSeen: user.deviceInfo.lastSeen
        }));
        
        res.json({
            success: true,
            locations
        });
    } catch (error) {
        console.error('Get users locations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get locations'
        });
    }
});

// Get tracking data for admin dashboard
router.get('/api/admin/tracking-data', requireAuth, async (req, res) => {
    try {
        const sessions = await TrackingSession.find({ 
            createdBy: req.session.userId 
        });
        
        let allLocations = [];
        let activeSessions = 0;
        let trackedUsers = 0;
        
        const sessionsActivity = sessions.map(session => {
            if (session.isActive) activeSessions++;
            
            // Get latest location for each session
            const latestLocations = session.locationData.slice(-10); // Get last 10 locations
            allLocations = allLocations.concat(
                latestLocations.map(location => ({
                    sessionId: session.sessionId,
                    sessionTitle: session.title,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    timestamp: location.timestamp,
                    deviceInfo: location.deviceInfo
                }))
            );
            
            if (session.locationData.length > 0) trackedUsers++;
            
            return {
                id: session.sessionId,
                title: session.title,
                isActive: session.isActive,
                accessCount: session.accessCount,
                locationCount: session.locationData.length,
                lastUpdate: session.locationData.length > 0 ? 
                    session.locationData[session.locationData.length - 1].timestamp : null
            };
        });
        
        res.json({
            success: true,
            stats: {
                activeSessions,
                trackedUsers,
                totalSessions: sessions.length
            },
            locations: allLocations,
            sessions: sessionsActivity
        });
    } catch (error) {
        console.error('Error fetching tracking data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tracking data'
        });
    }
});

export default router;
