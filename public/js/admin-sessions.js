// Admin session management functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeModal();
    initializeSessionActions();
    initializeUrlCopying();
});

function initializeModal() {
    const modal = document.getElementById('createSessionModal');
    const btn = document.getElementById('createSessionBtn');
    const span = document.getElementsByClassName('close')[0];
    const cancelBtn = document.querySelector('.cancel-btn');
    
    btn.onclick = function() {
        modal.style.display = 'block';
    }
    
    span.onclick = function() {
        modal.style.display = 'none';
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            modal.style.display = 'none';
        }
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

function initializeSessionActions() {
    // Toggle session status
    document.querySelectorAll('.toggle-status').forEach(button => {
        button.addEventListener('click', async function() {
            const sessionId = this.dataset.sessionId;
            try {
                const response = await fetch(`/admin/sessions/${sessionId}/toggle`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Update UI
                    const statusIndicator = document.querySelector(`[data-session-id="${sessionId}"] .status-indicator`);
                    const toggleButton = this;
                    
                    if (data.isActive) {
                        statusIndicator.className = 'status-indicator active';
                        statusIndicator.textContent = 'Active';
                        toggleButton.textContent = 'Deactivate';
                        toggleButton.className = 'btn btn-sm btn-warning toggle-status';
                    } else {
                        statusIndicator.className = 'status-indicator inactive';
                        statusIndicator.textContent = 'Inactive';
                        toggleButton.textContent = 'Activate';
                        toggleButton.className = 'btn btn-sm btn-success toggle-status';
                    }
                    
                    showNotification('Session status updated successfully', 'success');
                } else {
                    showNotification('Failed to update session status', 'error');
                }
            } catch (error) {
                console.error('Error toggling session:', error);
                showNotification('Error updating session status', 'error');
            }
        });
    });
    
    // Delete session
    document.querySelectorAll('.delete-session').forEach(button => {
        button.addEventListener('click', async function() {
            const sessionId = this.dataset.sessionId;
            
            if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
                try {
                    const response = await fetch(`/admin/sessions/${sessionId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Remove session card from DOM
                        const sessionCard = document.querySelector(`[data-session-id="${sessionId}"]`);
                        if (sessionCard) {
                            sessionCard.remove();
                        }
                        
                        showNotification('Session deleted successfully', 'success');
                    } else {
                        showNotification('Failed to delete session', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting session:', error);
                    showNotification('Error deleting session', 'error');
                }
            }
        });
    });
    
    // View session data
    document.querySelectorAll('.view-data').forEach(button => {
        button.addEventListener('click', async function() {
            const sessionId = this.dataset.sessionId;
            await viewSessionData(sessionId);
        });
    });
}

function initializeUrlCopying() {
    document.querySelectorAll('.copy-url').forEach(button => {
        button.addEventListener('click', function() {
            const urlInput = this.parentElement.querySelector('.tracking-url');
            urlInput.select();
            document.execCommand('copy');
            
            // Visual feedback
            const originalText = this.textContent;
            this.textContent = 'Copied!';
            this.style.backgroundColor = '#27ae60';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.backgroundColor = '';
            }, 2000);
            
            showNotification('URL copied to clipboard', 'success');
        });
    });
}

async function viewSessionData(sessionId) {
    try {
        const response = await fetch(`/admin/sessions/${sessionId}/data`);
        const data = await response.json();
        
        if (data.success) {
            displaySessionData(data.session);
        } else {
            showNotification('Failed to load session data', 'error');
        }
    } catch (error) {
        console.error('Error loading session data:', error);
        showNotification('Error loading session data', 'error');
    }
}

function displaySessionData(session) {
    const modal = document.getElementById('dataModal');
    const content = document.getElementById('dataContent');
    
    const locationData = session.locationData || [];
    const lastLocation = locationData.length > 0 ? locationData[locationData.length - 1] : null;
    
    content.innerHTML = `
        <div class="session-data">
            <div class="data-header">
                <h3>${session.title}</h3>
                <p>${session.description || 'No description'}</p>
            </div>
            
            <div class="data-stats">
                <div class="stat-item">
                    <span class="stat-label">Status:</span>
                    <span class="stat-value ${session.isActive ? 'status-active' : 'status-inactive'}">
                        ${session.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Access Count:</span>
                    <span class="stat-value">${session.accessCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Location Points:</span>
                    <span class="stat-value">${locationData.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Created:</span>
                    <span class="stat-value">${new Date(session.createdAt).toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Expires:</span>
                    <span class="stat-value">${new Date(session.expiresAt).toLocaleString()}</span>
                </div>
            </div>
            
            ${lastLocation ? `
                <div class="latest-location">
                    <h4>Latest Location</h4>
                    <div class="location-info">
                        <div class="location-item">
                            <span class="location-label">Coordinates:</span>
                            <span class="location-value">${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}</span>
                        </div>
                        <div class="location-item">
                            <span class="location-label">Accuracy:</span>
                            <span class="location-value">${lastLocation.accuracy ? Math.round(lastLocation.accuracy) + 'm' : 'Unknown'}</span>
                        </div>
                        <div class="location-item">
                            <span class="location-label">Timestamp:</span>
                            <span class="location-value">${new Date(lastLocation.timestamp).toLocaleString()}</span>
                        </div>
                        ${lastLocation.deviceInfo ? `
                            <div class="location-item">
                                <span class="location-label">Device:</span>
                                <span class="location-value">${lastLocation.deviceInfo.platform || 'Unknown'}</span>
                            </div>
                            <div class="location-item">
                                <span class="location-label">Browser:</span>
                                <span class="location-value">${lastLocation.deviceInfo.userAgent ? lastLocation.deviceInfo.userAgent.split(' ')[0] : 'Unknown'}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : '<p>No location data available</p>'}
            
            ${locationData.length > 0 ? `
                <div class="location-history">
                    <h4>Location History</h4>
                    <div class="history-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Latitude</th>
                                    <th>Longitude</th>
                                    <th>Accuracy</th>
                                    <th>Device</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${locationData.slice(-10).reverse().map(location => `
                                    <tr>
                                        <td>${new Date(location.timestamp).toLocaleTimeString()}</td>
                                        <td>${location.latitude.toFixed(6)}</td>
                                        <td>${location.longitude.toFixed(6)}</td>
                                        <td>${location.accuracy ? Math.round(location.accuracy) + 'm' : 'Unknown'}</td>
                                        <td>${location.deviceInfo ? location.deviceInfo.platform : 'Unknown'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${locationData.length > 10 ? `<p class="table-note">Showing latest 10 entries out of ${locationData.length} total</p>` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Close modal functionality
    const closeSpan = modal.querySelector('.close');
    closeSpan.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

function showNotification(message, type = 'info') {
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
