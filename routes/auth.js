import express from 'express';
import User from '../models/User.js';
import { validateRegistration, validateLogin } from '../middleware/validation.js';
import { redirectIfAuth } from '../middleware/auth.js';

const router = express.Router();

// Registration page
router.get('/register', redirectIfAuth, (req, res) => {
    res.render('auth/register', { 
        title: 'Register',
        error: req.session.error,
        success: req.session.success
    });
    delete req.session.error;
    delete req.session.success;
});

// Registration handler
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            req.session.error = 'User with this email or username already exists';
            return res.redirect('/register');
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            deviceInfo: {
                userAgent: req.headers['user-agent'],
                platform: req.headers['sec-ch-ua-platform'] || 'Unknown'
            }
        });

        await user.save();
        
        req.session.success = 'Registration successful! Please login.';
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.session.error = 'Registration failed. Please try again.';
        res.redirect('/register');
    }
});

// Login page
router.get('/login', redirectIfAuth, (req, res) => {
    res.render('auth/login', { 
        title: 'Login',
        error: req.session.error,
        success: req.session.success
    });
    delete req.session.error;
    delete req.session.success;
});

// Login handler
router.post('/login', validateLogin, async (req, res) => {
    try {
        console.log('Login attempt for:', req.body.email);
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        console.log('User found:', !!user);
        
        if (!user || !(await user.comparePassword(password))) {
            console.log('Invalid credentials');
            req.session.error = 'Invalid email or password';
            return res.redirect('/login');
        }

        console.log('Login successful for user:', user.username);
        
        // Update last seen
        await user.updateLastSeen();

        // Set session
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        console.log('Session set, redirecting to dashboard');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        req.session.error = 'Login failed. Please try again.';
        res.redirect('/login');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

export default router;
