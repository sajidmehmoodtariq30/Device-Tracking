// Admin Dashboard JavaScript for tracking other users' locations
let map;
let trackedMarkers = [];
let socket;
let refreshInterval;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeSocket();
    initializeControls();
    loadTrackingData();
    
    // Auto-refresh data every 30 seconds
    refreshInterval = setInterval(loadTrackingData, 30000);
});

// Initialize the map
function initializeMap() {
    // Default to a central location
    map = L.map('map').setView([40.7128, -74.0060], 2); // World view initially
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Initialize Socket.IO for real-time updates
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
        socket.emit('adminConnect', { userId: window.currentUser.id });
    });
    
    socket.on('newLocationData', function(data) {
        console.log('New location data received:', data);
        updateTrackedLocation(data);
    });
    
    socket.on('sessionUpdate', function(data) {
        console.log('Session update:', data);
        loadTrackingData(); // Refresh all data
    });
}

// Initialize control buttons
function initializeControls() {
    const refreshBtn = document.getElementById('refreshData');
    const centerBtn = document.getElementById('centerMap');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadTrackingData();
            showNotification('Data refreshed', 'success');
        });
    }
    
    if (centerBtn) {
        centerBtn.addEventListener('click', centerMapOnTrackedUsers);
    }
}

// Load tracking data from server
async function loadTrackingData() {
    try {
        const response = await fetch('/api/admin/tracking-data');
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.stats);
            updateTrackedLocations(data.locations);
            updateSessionsActivity(data.sessions);
        } else {
            showNotification('Failed to load tracking data', 'error');
        }
    } catch (error) {
        console.error('Error loading tracking data:', error);
        showNotification('Error loading tracking data', 'error');
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    const activeSessionCount = document.getElementById('activeSessionCount');
    const trackedUserCount = document.getElementById('trackedUserCount');
    const lastUpdate = document.getElementById('lastUpdate');
    
    if (activeSessionCount) activeSessionCount.textContent = stats.activeSessions || 0;
    if (trackedUserCount) trackedUserCount.textContent = stats.trackedUsers || 0;
    if (lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString();
}

// Update tracked locations on map
function updateTrackedLocations(locations) {
    // Clear existing markers
    trackedMarkers.forEach(marker => map.removeLayer(marker));
    trackedMarkers = [];
    
    // Add new markers for each tracked location
    locations.forEach(location => {
        if (location.latitude && location.longitude) {
            const marker = L.marker([location.latitude, location.longitude], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            
            // Create popup content
            const popupContent = `
                <div class="location-popup">
                    <h4>${location.sessionTitle}</h4>
                    <p><strong>Coordinates:</strong> ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</p>
                    <p><strong>Accuracy:</strong> ${location.accuracy ? Math.round(location.accuracy) + 'm' : 'Unknown'}</p>
                    <p><strong>Time:</strong> ${new Date(location.timestamp).toLocaleString()}</p>
                    ${location.deviceInfo ? `
                        <p><strong>Device:</strong> ${location.deviceInfo.platform || 'Unknown'}</p>
                        <p><strong>Browser:</strong> ${location.deviceInfo.userAgent ? location.deviceInfo.userAgent.split(' ')[0] : 'Unknown'}</p>
                    ` : ''}
                </div>
            `;
            
            marker.bindPopup(popupContent);
            trackedMarkers.push(marker);
        }
    });
    
    // Auto-center map if there are tracked locations
    if (trackedMarkers.length > 0) {
        centerMapOnTrackedUsers();
    }
}

// Update single tracked location (for real-time updates)
function updateTrackedLocation(locationData) {
    // Find existing marker for this session
    const existingMarkerIndex = trackedMarkers.findIndex(marker => 
        marker.sessionId === locationData.sessionId
    );
    
    if (existingMarkerIndex !== -1) {
        // Update existing marker
        const marker = trackedMarkers[existingMarkerIndex];
        marker.setLatLng([locationData.latitude, locationData.longitude]);
        
        // Update popup
        const popupContent = `
            <div class="location-popup">
                <h4>${locationData.sessionTitle}</h4>
                <p><strong>Coordinates:</strong> ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}</p>
                <p><strong>Accuracy:</strong> ${locationData.accuracy ? Math.round(locationData.accuracy) + 'm' : 'Unknown'}</p>
                <p><strong>Time:</strong> ${new Date(locationData.timestamp).toLocaleString()}</p>
                ${locationData.deviceInfo ? `
                    <p><strong>Device:</strong> ${locationData.deviceInfo.platform || 'Unknown'}</p>
                    <p><strong>Browser:</strong> ${locationData.deviceInfo.userAgent ? locationData.deviceInfo.userAgent.split(' ')[0] : 'Unknown'}</p>
                ` : ''}
            </div>
        `;
        marker.getPopup().setContent(popupContent);
    } else {
        // Create new marker
        const marker = L.marker([locationData.latitude, locationData.longitude], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map);
        
        const popupContent = `
            <div class="location-popup">
                <h4>${locationData.sessionTitle}</h4>
                <p><strong>Coordinates:</strong> ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}</p>
                <p><strong>Accuracy:</strong> ${locationData.accuracy ? Math.round(locationData.accuracy) + 'm' : 'Unknown'}</p>
                <p><strong>Time:</strong> ${new Date(locationData.timestamp).toLocaleString()}</p>
                ${locationData.deviceInfo ? `
                    <p><strong>Device:</strong> ${locationData.deviceInfo.platform || 'Unknown'}</p>
                    <p><strong>Browser:</strong> ${locationData.deviceInfo.userAgent ? locationData.deviceInfo.userAgent.split(' ')[0] : 'Unknown'}</p>
                ` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.sessionId = locationData.sessionId;
        trackedMarkers.push(marker);
    }
    
    // Flash notification for new location
    showNotification(`New location update: ${locationData.sessionTitle}`, 'info');
}

// Center map on all tracked users
function centerMapOnTrackedUsers() {
    if (trackedMarkers.length === 0) {
        showNotification('No tracked locations available', 'warning');
        return;
    }
    
    if (trackedMarkers.length === 1) {
        // If only one marker, center on it
        map.setView(trackedMarkers[0].getLatLng(), 15);
    } else {
        // If multiple markers, fit bounds to include all
        const group = new L.featureGroup(trackedMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Update sessions activity
function updateSessionsActivity(sessions) {
    const activityContainer = document.getElementById('sessionsActivity');
    if (!activityContainer) return;
    
    if (sessions.length === 0) {
        activityContainer.innerHTML = '<p class="no-activity">No recent tracking activity</p>';
        return;
    }
    
    activityContainer.innerHTML = sessions.map(session => `
        <div class="activity-item">
            <div class="activity-header">
                <span class="activity-title">${session.title}</span>
                <span class="activity-status ${session.isActive ? 'active' : 'inactive'}">
                    ${session.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="activity-details">
                <span class="activity-stat">Access Count: ${session.accessCount}</span>
                <span class="activity-stat">Locations: ${session.locationCount}</span>
                <span class="activity-stat">Last Update: ${session.lastUpdate ? new Date(session.lastUpdate).toLocaleString() : 'Never'}</span>
            </div>
        </div>
    `).join('');
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
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
    
    switch (type) {
        case 'error':
            notification.style.backgroundColor = '#e74c3c';
            break;
        case 'success':
            notification.style.backgroundColor = '#27ae60';
            break;
        case 'warning':
            notification.style.backgroundColor = '#f39c12';
            break;
        default:
            notification.style.backgroundColor = '#3498db';
    }
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (socket) {
        socket.disconnect();
    }
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
