// Public location tracking functionality
class LocationTracker {
    constructor() {
        this.isTracking = false;
        this.trackingInterval = null;
        this.updateCount = 0;
        this.consentGiven = false;
        this.lastPosition = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkGeolocationSupport();
        this.initializeSocket();
        
        // If consent is not required, start tracking immediately
        if (!window.trackingSession.settings.requireConsent) {
            this.startTracking();
        }
    }
    
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('join', { 
                sessionId: window.trackingSession.id,
                username: 'Anonymous User'
            });
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }
    
    setupEventListeners() {
        const consentSection = document.getElementById('consentSection');
        const trackingSection = document.getElementById('trackingSection');
        
        // Consent buttons
        const giveConsentBtn = document.getElementById('giveConsent');
        const denyConsentBtn = document.getElementById('denyConsent');
        
        if (giveConsentBtn) {
            giveConsentBtn.addEventListener('click', () => {
                this.giveConsent();
            });
        }
        
        if (denyConsentBtn) {
            denyConsentBtn.addEventListener('click', () => {
                this.denyConsent();
            });
        }
        
        // Control buttons
        const stopBtn = document.getElementById('stopTracking');
        const shareBtn = document.getElementById('shareLocation');
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopTracking();
            });
        }
        
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareCurrentLocation();
            });
        }
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTracking();
            } else {
                this.resumeTracking();
            }
        });
        
        // Handle beforeunload
        window.addEventListener('beforeunload', () => {
            this.stopTracking();
        });
    }
    
    checkGeolocationSupport() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser.');
            return false;
        }
        return true;
    }
    
    giveConsent() {
        this.consentGiven = true;
        document.getElementById('consentSection').style.display = 'none';
        document.getElementById('trackingSection').style.display = 'block';
        this.startTracking();
    }
    
    denyConsent() {
        this.showError('Location tracking requires your consent to continue.');
        document.getElementById('consentSection').style.display = 'none';
    }
    
    startTracking() {
        if (!this.checkGeolocationSupport()) return;
        
        this.isTracking = true;
        this.updateStatus('Starting location tracking...');
        
        // Show tracking section if not already visible
        const trackingSection = document.getElementById('trackingSection');
        if (trackingSection) {
            trackingSection.style.display = 'block';
        }
        
        // Get initial location
        this.getCurrentLocation();
        
        // Set up interval for continuous tracking
        const interval = window.trackingSession.settings.trackingInterval || 30000;
        this.trackingInterval = setInterval(() => {
            this.getCurrentLocation();
        }, interval);
    }
    
    stopTracking() {
        this.isTracking = false;
        
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
        
        this.updateStatus('Tracking stopped');
        
        // Hide tracking section after a delay
        setTimeout(() => {
            const trackingSection = document.getElementById('trackingSection');
            if (trackingSection) {
                trackingSection.style.display = 'none';
            }
        }, 2000);
    }
    
    pauseTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    }
    
    resumeTracking() {
        if (this.isTracking && !this.trackingInterval) {
            const interval = window.trackingSession.settings.trackingInterval || 30000;
            this.trackingInterval = setInterval(() => {
                this.getCurrentLocation();
            }, interval);
        }
    }
    
    getCurrentLocation() {
        if (!this.isTracking) return;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.handleLocationSuccess(position);
            },
            (error) => {
                this.handleLocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }
    
    handleLocationSuccess(position) {
        const { latitude, longitude, accuracy } = position.coords;
        
        this.lastPosition = { latitude, longitude, accuracy };
        this.updateCount++;
        
        // Update UI
        this.updateLocationDisplay(latitude, longitude, accuracy);
        this.updateStatus('Location updated successfully');
        
        // Send to server
        this.sendLocationToServer(latitude, longitude, accuracy);
        
        // Broadcast to admin via socket
        if (this.socket && this.socket.connected) {
            this.socket.emit('locationUpdate', {
                sessionId: window.trackingSession.id,
                latitude,
                longitude,
                accuracy,
                timestamp: new Date().toISOString(),
                deviceInfo: this.collectDeviceInfo()
            });
        }
    }
    
    handleLocationError(error) {
        let message = 'Unable to get your location';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location access denied by user';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out';
                break;
        }
        
        this.showError(message);
        this.updateStatus('Location error: ' + message);
    }
    
    updateLocationDisplay(latitude, longitude, accuracy) {
        const latElement = document.getElementById('latitude');
        const lngElement = document.getElementById('longitude');
        const accuracyElement = document.getElementById('accuracy');
        const updateCountElement = document.getElementById('updateCount');
        const lastUpdateElement = document.getElementById('lastUpdate');
        
        if (latElement) latElement.textContent = latitude.toFixed(6);
        if (lngElement) lngElement.textContent = longitude.toFixed(6);
        if (accuracyElement) accuracyElement.textContent = accuracy ? `${Math.round(accuracy)}m` : 'Unknown';
        if (updateCountElement) updateCountElement.textContent = this.updateCount;
        if (lastUpdateElement) lastUpdateElement.textContent = new Date().toLocaleTimeString();
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('statusText');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    
    async sendLocationToServer(latitude, longitude, accuracy) {
        try {
            const deviceInfo = this.collectDeviceInfo();
            
            const response = await fetch(`/track/${window.trackingSession.id}/location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude,
                    longitude,
                    accuracy,
                    deviceInfo,
                    consentGiven: this.consentGiven
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                this.showError('Failed to send location to server: ' + data.error);
                
                // If session is expired or inactive, stop tracking
                if (response.status === 404 || response.status === 403) {
                    this.stopTracking();
                }
            }
        } catch (error) {
            console.error('Error sending location:', error);
            this.showError('Network error occurred while sending location');
        }
    }
    
    collectDeviceInfo() {
        const info = {
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            connection: navigator.connection ? navigator.connection.effectiveType : 'Unknown'
        };
        
        // Try to get battery information
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                info.battery = Math.round(battery.level * 100);
            });
        }
        
        return info;
    }
    
    shareCurrentLocation() {
        if (!this.lastPosition) {
            this.showError('No location data available to share');
            return;
        }
        
        const { latitude, longitude } = this.lastPosition;
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Current Location',
                text: `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)}`,
                url: googleMapsUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(googleMapsUrl).then(() => {
                this.showSuccess('Location URL copied to clipboard');
            }).catch(() => {
                this.showError('Unable to copy location URL');
            });
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '4px',
            color: 'white',
            zIndex: '9999',
            maxWidth: '300px',
            fontSize: '0.9rem',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
        });
        
        // Set background color based on type
        switch (type) {
            case 'error':
                notification.style.backgroundColor = '#e74c3c';
                break;
            case 'success':
                notification.style.backgroundColor = '#27ae60';
                break;
            default:
                notification.style.backgroundColor = '#3498db';
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize tracker when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LocationTracker();
});

// Periodically check session status
setInterval(async () => {
    try {
        const response = await fetch(`/track/${window.trackingSession.id}/status`);
        const data = await response.json();
        
        if (data.success) {
            if (!data.isActive || data.isExpired) {
                // Session is no longer active
                if (window.locationTracker) {
                    window.locationTracker.stopTracking();
                }
                
                // Show message to user
                const trackingSection = document.getElementById('trackingSection');
                if (trackingSection) {
                    trackingSection.innerHTML = `
                        <div class="warning-box">
                            <h3>⚠️ Session Ended</h3>
                            <p>This tracking session has been ${data.isExpired ? 'expired' : 'deactivated'}.</p>
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Error checking session status:', error);
    }
}, 60000); // Check every minute
