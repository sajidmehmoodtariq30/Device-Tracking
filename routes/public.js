import express from 'express';
import TrackingSession from '../models/TrackingSession.js';

const router = express.Router();

// Public information page
router.get('/about', (req, res) => {
    res.render('public/about', {
        title: 'About Location Tracking'
    });
});

// Privacy policy page
router.get('/privacy', (req, res) => {
    res.render('public/privacy', {
        title: 'Privacy Policy'
    });
});

// Public tracking page
router.get('/track/:sessionId', async (req, res) => {
    try {
        const session = await TrackingSession.findOne({
            sessionId: req.params.sessionId,
            isActive: true
        });
        
        if (!session) {
            return res.render('public/error', {
                title: 'Session Not Found',
                message: 'This tracking session is either expired, inactive, or does not exist.',
                showHomeLink: true
            });
        }
        
        if (session.isExpired()) {
            return res.render('public/error', {
                title: 'Session Expired',
                message: 'This tracking session has expired.',
                showHomeLink: true
            });
        }
        
        // Increment access count
        session.accessCount += 1;
        await session.save();
        
        res.render('public/track', {
            title: `Location Tracking - ${session.title}`,
            session: {
                id: session.sessionId,
                title: session.title,
                description: session.description,
                settings: session.settings
            }
        });
    } catch (error) {
        console.error('Error loading tracking page:', error);
        res.render('public/error', {
            title: 'Error',
            message: 'An error occurred while loading the tracking page.',
            showHomeLink: true
        });
    }
});

// Submit location data
router.post('/track/:sessionId/location', async (req, res) => {
    try {
        const { latitude, longitude, accuracy, deviceInfo, consentGiven } = req.body;
        
        const session = await TrackingSession.findOne({
            sessionId: req.params.sessionId,
            isActive: true
        });
        
        if (!session || session.isExpired()) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or expired'
            });
        }
        
        // Check consent requirement
        if (session.settings.requireConsent && !consentGiven) {
            return res.status(403).json({
                success: false,
                error: 'Consent is required for location tracking'
            });
        }
        
        // Update consent if given
        if (consentGiven && !session.consentGiven) {
            session.consentGiven = true;
            session.consentTimestamp = new Date();
        }
        
        // Get IP address
        const ipAddress = req.headers['x-forwarded-for'] || 
                         req.connection.remoteAddress || 
                         req.socket.remoteAddress ||
                         (req.connection.socket ? req.connection.socket.remoteAddress : null);
        
        // Create location data entry
        const locationData = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy ? parseFloat(accuracy) : null,
            timestamp: new Date(),
            deviceInfo: {
                userAgent: req.headers['user-agent'],
                platform: deviceInfo?.platform || 'Unknown',
                language: deviceInfo?.language || 'Unknown',
                screenResolution: deviceInfo?.screenResolution || 'Unknown',
                ipAddress: ipAddress,
                battery: deviceInfo?.battery || null,
                connection: deviceInfo?.connection || 'Unknown'
            }
        };
        
        await session.addLocationData(locationData);
        
        res.json({
            success: true,
            message: 'Location data recorded successfully'
        });
    } catch (error) {
        console.error('Error recording location:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record location data'
        });
    }
});

// Get session status (for JavaScript polling)
router.get('/track/:sessionId/status', async (req, res) => {
    try {
        const session = await TrackingSession.findOne({
            sessionId: req.params.sessionId
        });
        
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        res.json({
            success: true,
            isActive: session.isActive,
            isExpired: session.isExpired(),
            settings: session.settings
        });
    } catch (error) {
        console.error('Error checking session status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check session status'
        });
    }
});

export default router;
