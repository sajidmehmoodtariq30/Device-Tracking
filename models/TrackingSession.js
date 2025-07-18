import mongoose from 'mongoose';

const trackingSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    accessCount: {
        type: Number,
        default: 0
    },
    locationData: [{
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        accuracy: {
            type: Number,
            default: null
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        deviceInfo: {
            userAgent: String,
            platform: String,
            language: String,
            screenResolution: String,
            ipAddress: String,
            battery: Number,
            connection: String
        }
    }],
    consentGiven: {
        type: Boolean,
        default: false
    },
    consentTimestamp: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from creation
    },
    settings: {
        requireConsent: {
            type: Boolean,
            default: true
        },
        showLocationAccuracy: {
            type: Boolean,
            default: true
        },
        collectDeviceInfo: {
            type: Boolean,
            default: true
        },
        trackingInterval: {
            type: Number,
            default: 30000 // 30 seconds
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
trackingSessionSchema.index({ sessionId: 1 });
trackingSessionSchema.index({ createdBy: 1 });
trackingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to add location data
trackingSessionSchema.methods.addLocationData = function(locationData) {
    this.locationData.push(locationData);
    this.accessCount += 1;
    return this.save();
};

// Method to check if session is expired
trackingSessionSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

// Method to generate tracking URL
trackingSessionSchema.methods.getTrackingUrl = function(baseUrl) {
    return `${baseUrl}/track/${this.sessionId}`;
};

export default mongoose.model('TrackingSession', trackingSessionSchema);
