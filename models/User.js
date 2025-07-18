import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLocation: {
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        },
        timestamp: {
            type: Date,
            default: null
        }
    },
    deviceInfo: {
        userAgent: String,
        platform: String,
        lastSeen: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update last seen
userSchema.methods.updateLastSeen = function() {
    this.deviceInfo.lastSeen = new Date();
    return this.save();
};

// Update location
userSchema.methods.updateLocation = function(latitude, longitude) {
    this.lastLocation = {
        latitude,
        longitude,
        timestamp: new Date()
    };
    return this.save();
};

export default mongoose.model('User', userSchema);
