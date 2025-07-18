import express from 'express';
import crypto from 'crypto';
import TrackingSession from '../models/TrackingSession.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Dashboard route to create and manage tracking sessions
router.get('/admin/sessions', requireAuth, async (req, res) => {
    try {
        const sessions = await TrackingSession.find({ createdBy: req.session.userId })
            .sort({ createdAt: -1 });
        
        res.render('admin/sessions', {
            title: 'Tracking Sessions',
            sessions: sessions,
            baseUrl: process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.redirect('/dashboard');
    }
});

// Create new tracking session
router.post('/admin/sessions', requireAuth, async (req, res) => {
    try {
        const { title, description, requireConsent, trackingInterval } = req.body;
        
        // Generate unique session ID
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        const session = new TrackingSession({
            sessionId,
            createdBy: req.session.userId,
            title,
            description,
            settings: {
                requireConsent: requireConsent === 'on',
                trackingInterval: parseInt(trackingInterval) || 30000,
                showLocationAccuracy: true,
                collectDeviceInfo: true
            }
        });
        
        await session.save();
        
        req.session.success = 'Tracking session created successfully!';
        res.redirect('/admin/sessions');
    } catch (error) {
        console.error('Error creating session:', error);
        req.session.error = 'Failed to create tracking session.';
        res.redirect('/admin/sessions');
    }
});

// Toggle session active status
router.post('/admin/sessions/:sessionId/toggle', requireAuth, async (req, res) => {
    try {
        const session = await TrackingSession.findOne({
            sessionId: req.params.sessionId,
            createdBy: req.session.userId
        });
        
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        
        session.isActive = !session.isActive;
        await session.save();
        
        res.json({ success: true, isActive: session.isActive });
    } catch (error) {
        console.error('Error toggling session:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle session' });
    }
});

// Get session data for admin
router.get('/admin/sessions/:sessionId/data', requireAuth, async (req, res) => {
    try {
        const session = await TrackingSession.findOne({
            sessionId: req.params.sessionId,
            createdBy: req.session.userId
        });
        
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        
        res.json({
            success: true,
            session: {
                id: session.sessionId,
                title: session.title,
                description: session.description,
                isActive: session.isActive,
                accessCount: session.accessCount,
                locationData: session.locationData,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt
            }
        });
    } catch (error) {
        console.error('Error fetching session data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch session data' });
    }
});

// Delete session
router.delete('/admin/sessions/:sessionId', requireAuth, async (req, res) => {
    try {
        const session = await TrackingSession.findOneAndDelete({
            sessionId: req.params.sessionId,
            createdBy: req.session.userId
        });
        
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        
        res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ success: false, error: 'Failed to delete session' });
    }
});

export default router;
