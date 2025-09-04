// Global variables
let locationData = null;
let periods = [];
let map = null;
let currentMapData = null;
let isProcessingFile = false;

// Map matching configuration
let mapboxConfig = {
    apiKey: null,
    usageCount: 0,
    monthlyLimit: 100000,
    fallbackThreshold: 0.9 // 90% of limit
};

// Load Mapbox configuration from localStorage and window.CONFIG
function loadMapboxConfig() {
    // First, try to get API key from window.CONFIG (GitHub Pages deployment)
    if (window.CONFIG && window.CONFIG.MAPBOX_ACCESS_TOKEN) {
        mapboxConfig.apiKey = window.CONFIG.MAPBOX_ACCESS_TOKEN;
        console.log('Using Mapbox API key from config.js (GitHub Pages deployment)');
    }
    
    // Then load usage data from localStorage
    const saved = localStorage.getItem('mapboxConfig');
    if (saved) {
        const config = JSON.parse(saved);
        // Only use localStorage API key if not already set from window.CONFIG
        if (!mapboxConfig.apiKey) {
            mapboxConfig.apiKey = config.apiKey;
        }
        mapboxConfig.usageCount = config.usageCount || 0;
        // Reset usage count if it's a new month (simple check)
        const lastReset = localStorage.getItem('mapboxUsageReset');
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + now.getMonth();
        if (lastReset !== currentMonth) {
            mapboxConfig.usageCount = 0;
            localStorage.setItem('mapboxUsageReset', currentMonth);
        }
    }
}

// Save Mapbox configuration to localStorage
function saveMapboxConfig() {
    localStorage.setItem('mapboxConfig', JSON.stringify({
        apiKey: mapboxConfig.apiKey,
        usageCount: mapboxConfig.usageCount
    }));
}

// Check if we should use Mapbox or fallback to OSRM
function shouldUseMapbox() {
    if (!mapboxConfig.apiKey) return false;
    const usagePercentage = mapboxConfig.usageCount / mapboxConfig.monthlyLimit;
    return usagePercentage < mapboxConfig.fallbackThreshold;
}

// Mapbox Map Matching API call
async function mapboxMapMatching(coordinates, timestamps = null) {
    if (!mapboxConfig.apiKey) {
        throw new Error('Mapbox API key not configured');
    }

    // Check usage limit
    if (!shouldUseMapbox()) {
        throw new Error('Mapbox usage limit reached, falling back to OSRM');
    }

    // Format coordinates for Mapbox API
    const coordsString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
    
    // Build URL with parameters
    let url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordsString}?access_token=${mapboxConfig.apiKey}`;
    
    // Add timestamps if available
    if (timestamps && timestamps.length === coordinates.length) {
        const timestampsString = timestamps.join(';');
        url += `&timestamps=${timestampsString}`;
    }
    
    // Add other parameters for better matching
    url += '&geometries=geojson&overview=full&tidy=true&radiuses=' + coordinates.map(() => '25').join(';');

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Increment usage count
        mapboxConfig.usageCount++;
        saveMapboxConfig();
        
        // Extract matched coordinates from GeoJSON
        if (data.matchings && data.matchings.length > 0) {
            const geometry = data.matchings[0].geometry;
            if (geometry && geometry.coordinates) {
                return geometry.coordinates.map(coord => [coord[0], coord[1]]);
            }
        }
        
        throw new Error('No matching results from Mapbox');
        
    } catch (error) {
        console.warn('Mapbox matching failed:', error.message);
        throw error;
    }
}

// Initialize Mapbox configuration UI
function initializeMapboxConfig() {
    const apiKeyInput = document.getElementById('mapboxApiKey');
    const saveBtn = document.getElementById('saveMapboxKey');
    const clearBtn = document.getElementById('clearMapboxKey');
    const usageDiv = document.getElementById('mapboxUsage');
    const usageCount = document.getElementById('usageCount');
    const usageBar = document.getElementById('usageBar');
    
    // Load existing API key
    if (mapboxConfig.apiKey) {
        // Check if API key is from config.js (GitHub Pages deployment)
        const isFromConfig = window.CONFIG && window.CONFIG.MAPBOX_ACCESS_TOKEN;
        
        if (isFromConfig) {
            // API key is from config.js - show as configured but disable editing
            apiKeyInput.value = 'Configured via GitHub Pages deployment';
            apiKeyInput.disabled = true;
            apiKeyInput.style.backgroundColor = '#f0f0f0';
            apiKeyInput.style.color = '#666';
            saveBtn.style.display = 'none';
            clearBtn.style.display = 'none';
            
            // Show info message
            const infoDiv = document.querySelector('.api-key-info');
            if (infoDiv) {
                infoDiv.innerHTML = `
                    <small>
                        <strong>✅ API key loaded from GitHub Pages deployment</strong><br>
                        <strong>Free tier:</strong> 100,000 requests/month. 
                        <a href="https://account.mapbox.com/" target="_blank">Manage your account here</a>
                    </small>
                `;
            }
        } else {
            // API key is from localStorage - allow editing
            apiKeyInput.value = mapboxConfig.apiKey;
        }
        updateUsageDisplay();
    }
    
    // Save API key
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey && apiKey.startsWith('pk.')) {
            mapboxConfig.apiKey = apiKey;
            saveMapboxConfig();
            updateUsageDisplay();
            showNotification('Mapbox API key saved successfully!', 'success');
        } else {
            showNotification('Please enter a valid Mapbox public API key (starts with pk.)', 'error');
        }
    });
    
    // Clear API key
    clearBtn.addEventListener('click', () => {
        mapboxConfig.apiKey = null;
        mapboxConfig.usageCount = 0;
        apiKeyInput.value = '';
        saveMapboxConfig();
        updateUsageDisplay();
        showNotification('Mapbox API key cleared', 'info');
    });
    
    // Update usage display
    function updateUsageDisplay() {
        if (mapboxConfig.apiKey) {
            usageDiv.style.display = 'block';
            usageCount.textContent = mapboxConfig.usageCount.toLocaleString();
            const percentage = (mapboxConfig.usageCount / mapboxConfig.monthlyLimit) * 100;
            usageBar.style.width = `${Math.min(percentage, 100)}%`;
            
            // Change color based on usage
            if (percentage >= 90) {
                usageBar.style.background = '#f44336';
            } else if (percentage >= 70) {
                usageBar.style.background = '#ff9800';
            } else {
                usageBar.style.background = '#4caf50';
            }
        } else {
            usageDiv.style.display = 'none';
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '6px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '10000',
        maxWidth: '300px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3',
        warning: '#ff9800'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// DOM elements (will be initialized after DOM loads)
let tabBtns, tabPanes, fileInput, fileUploadArea, addPeriodBtn, processBtn, loadMapBtn, periodSelector;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    tabBtns = document.querySelectorAll('.tab-btn');
    tabPanes = document.querySelectorAll('.tab-pane');
    fileInput = document.getElementById('fileInput');
    fileUploadArea = document.getElementById('fileUploadArea');
    addPeriodBtn = document.getElementById('addPeriodBtn');
    processBtn = document.getElementById('processBtn');
    loadMapBtn = document.getElementById('loadMapBtn');
    periodSelector = document.getElementById('periodSelector');
    
    // Load Mapbox configuration
    loadMapboxConfig();
    
    // Initialize functionality
    console.log('Initializing Google Location History to KML Converter...');
    initializeTabs();
    initializeFileUpload();
    initializePeriodManagement();
    initializeProcessing();
    initializeMap();
    initializeMapboxConfig();
    console.log('Application initialized successfully!');
});

// Tab functionality
function initializeTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // Remove active class from all tabs and panes
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Add active class to selected tab and pane
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // When opening the map tab, auto-load the selected (or first) period and fix map sizing
    if (tabName === 'map') {
        // Ensure map exists
        if (!map && document.getElementById('map')) {
            initializeMapContainer();
        }
        // Ensure a period is selected
        if (periods.length > 0) {
            if (!periodSelector.value) periodSelector.value = String(periods[0].id);
            const selectedId = parseInt(periodSelector.value);
            const selPeriod = periods.find(p => p.id === selectedId) || periods[0];
            if (selPeriod) loadPeriodData(selPeriod);
        }
        // Fix initial centering once container becomes visible
        if (map) setTimeout(() => map.invalidateSize(), 0);
    }
}

// File upload functionality
function initializeFileUpload() {
    console.log('Initializing file upload...', fileInput, fileUploadArea);
    
    if (!fileInput || !fileUploadArea) {
        console.error('File upload elements not found!');
        return;
    }
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('drop', handleDrop);
    
    // Only add click handler to upload area if there's no button inside
    // The button already handles the click, so we don't need the area click handler
    
    console.log('File upload initialized successfully');
}

function handleFileSelect(event) {
    console.log('handleFileSelect called - File selected:', event.target.files, 'isProcessingFile:', isProcessingFile);
    const file = event.target.files[0];
    if (file && !isProcessingFile) {
        console.log('Processing selected file:', file.name);
        processFile(file);
    } else if (isProcessingFile) {
        console.log('File already being processed, ignoring selection');
    } else {
        console.log('No file selected');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    fileUploadArea.classList.add('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    fileUploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && !isProcessingFile) {
        const file = files[0];
        if (file.name.endsWith('.json')) {
            fileInput.files = event.dataTransfer.files;
            processFile(file);
        } else {
            showError('Please select a valid JSON file.');
        }
    } else if (isProcessingFile) {
        console.log('File already being processed, ignoring drop');
    }
}

function processFile(file) {
    if (isProcessingFile) {
        console.log('File already being processed, skipping...');
        return;
    }
    
    isProcessingFile = true;
    console.log('Processing file:', file.name, 'Size:', file.size);
    
    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    
    // Show warning for large files
    if (file.size > 100 * 1024 * 1024) { // 100MB
        document.getElementById('fileWarning').style.display = 'block';
    } else {
        document.getElementById('fileWarning').style.display = 'none';
    }
    
    // Read and parse file
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('File read successfully, parsing JSON...');
        try {
            locationData = JSON.parse(e.target.result);
            console.log('JSON parsed successfully, analyzing data...');
            analyzeLocationData();
            document.getElementById('fileInfo').style.display = 'block';
            
            // Enable next tab
            enableTab('dates');
            
            // Auto-populate first period with full date range
            const locations = window.convertedLocations || locationData.locations;
            if (locations && locations.length > 0) {
                console.log('Creating default period with', locations.length, 'locations');
                createDefaultPeriod();
            } else {
                console.log('No locations found, skipping default period creation');
            }
        } catch (error) {
            showError('Invalid JSON file. Please check the file format.');
            console.error('JSON parsing error:', error);
        } finally {
            // Small delay to ensure UI updates before allowing new uploads
            setTimeout(() => {
                isProcessingFile = false;
            }, 100);
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        showError('Error reading file. Please try again.');
        isProcessingFile = false;
    };
    
    reader.readAsText(file);
}

function analyzeLocationData() {
    console.log('Analyzing location data...', typeof locationData, Array.isArray(locationData));
    
    // Check if it's the standard format or the activity-based format
    let locations = null;
    let isStandardFormat = false;
    
    if (locationData.locations && Array.isArray(locationData.locations)) {
        // Standard format with locations array
        locations = locationData.locations;
        isStandardFormat = true;
        console.log('Detected standard location data format with', locations.length, 'locations');
    } else if (Array.isArray(locationData)) {
        // Activity-based format - convert on the fly
        console.log('Detected activity-based location data format with', locationData.length, 'records - converting...');
        locations = convertActivityBasedData(locationData);
        isStandardFormat = false;
    } else {
        console.error('Invalid location data format:', locationData);
        showError('Invalid location data format. Expected "locations" array or activity-based array.');
        return;
    }
    
    if (!locations || locations.length === 0) {
        showError('No location data found in the file.');
        return;
    }
    
    document.getElementById('totalRecords').textContent = locations.length.toLocaleString();
    
    // Find date range
    const timestamps = locations.map(loc => loc.timestampMs || loc.timestamp);
    const dates = timestamps.map(ts => new Date(parseInt(ts)));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    document.getElementById('dateRange').textContent = 
        `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`;
    
    // Store global date range and converted locations
    window.globalDateRange = { min: minDate, max: maxDate };
    window.convertedLocations = locations;
    
    console.log(`Successfully processed ${locations.length} location points`);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Heuristic extractor: pull ordered lat/lon pairs from various path shapes in Google Timeline JSON
function extractPathLatLngsFromActivity(activity) {
    if (!activity || typeof activity !== 'object') return [];
    const candidates = [];

    // Known shapes
    if (activity.waypointPath && Array.isArray(activity.waypointPath.waypoints)) {
        candidates.push(activity.waypointPath.waypoints);
    }
    if (activity.simplifiedRawPath && Array.isArray(activity.simplifiedRawPath.points)) {
        candidates.push(activity.simplifiedRawPath.points);
    }
    if (Array.isArray(activity.waypoints)) {
        candidates.push(activity.waypoints);
    }
    if (Array.isArray(activity.points)) {
        candidates.push(activity.points);
    }
    if (activity.rawPath && Array.isArray(activity.rawPath.points)) {
        candidates.push(activity.rawPath.points);
    }
    if (activity.path && Array.isArray(activity.path.points)) {
        candidates.push(activity.path.points);
    }
    // timelinePath: [{ point: 'geo:lat,lon', durationMinutesOffsetFromStartTime: '52' }]
    if (Array.isArray(activity.timelinePath)) {
        // Transform into a lat/lon object list to be consistent with others
        const tl = [];
        for (const p of activity.timelinePath) {
            if (p && typeof p.point === 'string' && p.point.startsWith('geo:')) {
                const parts = p.point.replace('geo:', '').split(',');
                const lat = parseFloat(parts[0]);
                const lon = parseFloat(parts[1]);
                if (isFinite(lat) && isFinite(lon)) tl.push({ lat, lon, _minutesOffset: parseFloat(p.durationMinutesOffsetFromStartTime) });
            }
        }
        if (tl.length) return tl; // return immediately so caller can use offsets
    }

    // Flatten in order; accept objects with latE7/lngE7 or {lat, lng}
    const out = [];
    for (const arr of candidates) {
        for (const p of arr) {
            let lat = null, lon = null;
            if (typeof p.latE7 === 'number' && typeof p.lngE7 === 'number') {
                lat = p.latE7 / 1e7; lon = p.lngE7 / 1e7;
            } else if (typeof p.lat === 'number' && typeof p.lng === 'number') {
                lat = p.lat; lon = p.lng;
            } else if (typeof p.latitudeE7 === 'number' && typeof p.longitudeE7 === 'number') {
                lat = p.latitudeE7 / 1e7; lon = p.longitudeE7 / 1e7;
            }
            if (isFinite(lat) && isFinite(lon)) out.push({ lat, lon });
        }
        if (out.length) break; // use first non-empty path we find
    }
    return out;
}

function convertActivityBasedData(activityData) {
    // Convert activity-based location data to standard format
    const standardLocations = [];

    const pushPoint = (lat, lon, ts, meta = {}) => {
        if (!isFinite(lat) || !isFinite(lon)) return;
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
        const latE7 = Math.round(lat * 10000000);
        const lonE7 = Math.round(lon * 10000000);
        standardLocations.push({
            latitudeE7: latE7,
            longitudeE7: lonE7,
            timestampMs: String(ts),
            ...meta
        });
    };

    const parseMillis = (t) => {
        if (!t) return Date.now();
        if (/^\d+$/.test(t)) return parseInt(t);
        let clean = t.split('+')[0];
        if (clean.endsWith('Z')) clean = clean.slice(0, -1);
        const d = new Date(clean);
        return isNaN(d.getTime()) ? Date.now() : d.getTime();
    };

    for (const record of activityData) {
        if (record.activity) {
            const activity = record.activity;
            const startTs = parseMillis(record.startTime);
            const endTs = parseMillis(record.endTime);
            const totalMs = Math.max(1, endTs - startTs);

            // 1) Prefer native path directly from JSON
            let pathLatLngs = extractPathLatLngsFromActivity(activity);

            // If pathLatLngs came from timelinePath it may include _minutesOffset for timestamps
            const hasMinuteOffsets = Array.isArray(pathLatLngs) && pathLatLngs.length > 0 && typeof pathLatLngs[0]._minutesOffset !== 'undefined';

            // 2) Fallback to start/end geo: strings if no path present
            if (pathLatLngs.length === 0) {
                const startGeo = activity.start;
                const endGeo = activity.end;
                if (startGeo && startGeo.startsWith('geo:')) {
                    const [lat, lon] = startGeo.replace('geo:', '').split(',').map(parseFloat);
                    if (isFinite(lat) && isFinite(lon)) pathLatLngs.push({ lat, lon });
                }
                if (endGeo && endGeo.startsWith('geo:')) {
                    const [lat, lon] = endGeo.replace('geo:', '').split(',').map(parseFloat);
                    if (isFinite(lat) && isFinite(lon)) pathLatLngs.push({ lat, lon });
                }
            }

            if (pathLatLngs.length > 0) {
                const n = pathLatLngs.length;
                for (let i = 0; i < n; i++) {
                    let t;
                    if (hasMinuteOffsets) {
                        const minutes = parseFloat(pathLatLngs[i]._minutesOffset) || 0;
                        t = startTs + Math.round(minutes * 60 * 1000);
                    } else {
                        t = n === 1 ? startTs : Math.round(startTs + (totalMs * i) / (n - 1));
                    }
                    const { lat, lon } = pathLatLngs[i];
                    pushPoint(lat, lon, t, {
                        source: 'activity_path',
                        activityType: activity.topCandidate?.type || 'unknown'
                    });
                }
            }
        } else if (record.visit) {
            const visit = record.visit;
            const ts = parseMillis(record.startTime);
            const loc = visit.placeLocation;
            if (loc && typeof loc === 'string' && loc.startsWith('geo:')) {
                const [lat, lon] = loc.replace('geo:', '').split(',').map(parseFloat);
                pushPoint(lat, lon, ts, { source: 'visit' });
            }
        }
    }

    // Sort by timestamp and drop consecutive duplicates
    standardLocations.sort((a, b) => parseInt(a.timestampMs) - parseInt(b.timestampMs));
    const deduped = [];
    for (const p of standardLocations) {
        const last = deduped[deduped.length - 1];
        if (!last || last.latitudeE7 !== p.latitudeE7 || last.longitudeE7 !== p.longitudeE7) {
            deduped.push(p);
        }
    }

    console.log(`Converted ${deduped.length} location points from activity data (native paths preferred)`);
    return deduped;
}

function parseTimestamp(timeStr) {
    // Parse timestamp string to milliseconds timestamp
    try {
        // Remove timezone info and parse
        let timeStrClean = timeStr.split('+')[0];
        if (timeStrClean.endsWith('Z')) {
            timeStrClean = timeStrClean.slice(0, -1);
        }
        
        const dt = new Date(timeStrClean);
        return Math.round(dt.getTime());
    } catch (e) {
        // Use current timestamp if parsing fails
        return Math.round(Date.now());
    }
}

// Period management
function initializePeriodManagement() {
    addPeriodBtn.addEventListener('click', addPeriod);
}

function createDefaultPeriod() {
    if (window.globalDateRange) {
        const { min, max } = window.globalDateRange;
        addPeriod(min, max);
    }
}

function addPeriod(startDate = null, endDate = null) {
    const periodId = periods.length + 1;
    let sDate = startDate, eDate = endDate;
    if (!sDate || !eDate) {
        if (window.globalDateRange) {
            sDate = new Date(window.globalDateRange.min);
            eDate = new Date(window.globalDateRange.max);
        } else {
            sDate = eDate = new Date();
        }
    }
    const period = {
        id: periodId,
        startDate: sDate,
        endDate: eDate
    };
    periods.push(period);
    renderPeriods();
    updatePeriodsSummary();
    refreshMapAndDownloadSections();
    enableTab('settings');
}

function removePeriod(periodId) {
    periods = periods.filter(p => p.id !== periodId);
    // Renumber periods
    periods.forEach((p, index) => {
        p.id = index + 1;
    });
    renderPeriods();
    updatePeriodsSummary();
    refreshMapAndDownloadSections();
    
    if (periods.length === 0) {
        disableTab('settings');
    }
}

function renderPeriods() {
    const container = document.getElementById('periodsContainer');
    container.innerHTML = '';
    
    periods.forEach(period => {
        const periodElement = createPeriodElement(period);
        container.appendChild(periodElement);
    });
    
    // Validate all periods after rendering
    periods.forEach(period => {
        validatePeriodDates(period.id);
    });
}

function createPeriodElement(period) {
    const div = document.createElement('div');
    div.className = 'period-item';
    
    // Get global date range for min/max constraints
    const globalRange = window.globalDateRange;
    const minDate = globalRange ? formatDateTimeLocal(globalRange.min) : '';
    const maxDate = globalRange ? formatDateTimeLocal(globalRange.max) : '';
    
    div.innerHTML = `
        <div class="period-header">
            <span class="period-number">Period ${period.id}</span>
            <button class="remove-period" onclick="removePeriod(${period.id})">Remove</button>
        </div>
        <div class="date-inputs">
            <div class="date-group">
                <label>Start Date:</label>
                <input type="datetime-local" 
                       id="startDate_${period.id}"
                       value="${formatDateTimeLocal(period.startDate)}"
                       min="${minDate}"
                       max="${maxDate}"
                       onchange="updatePeriodDate(${period.id}, 'startDate', this.value)">
            </div>
            <div class="date-group">
                <label>End Date:</label>
                <input type="datetime-local" 
                       id="endDate_${period.id}"
                       value="${formatDateTimeLocal(period.endDate)}"
                       min="${minDate}"
                       max="${maxDate}"
                       onchange="updatePeriodDate(${period.id}, 'endDate', this.value)">
            </div>
        </div>
        <div class="period-summary">
            <strong>Records in this period:</strong> <span id="periodSummary_${period.id}">${countRecordsInPeriod(period)}</span>
        </div>
    `;
    return div;
}

function updatePeriodDate(periodId, field, value) {
    const period = periods.find(p => p.id === periodId);
    if (period) {
        const newDate = new Date(value);
        period[field] = newDate;
        
        // Validate date constraints
        validatePeriodDates(periodId);
        
        // Update the summary for this period only
        const summarySpan = document.getElementById(`periodSummary_${periodId}`);
        if (summarySpan) {
            summarySpan.textContent = countRecordsInPeriod(period);
        }
        
        updatePeriodsSummary();
        
        // Auto-refresh map and download sections if they exist
        refreshMapAndDownloadSections();
    }
}

function validatePeriodDates(periodId) {
    const period = periods.find(p => p.id === periodId);
    if (!period) return;
    
    const startDateInput = document.getElementById(`startDate_${periodId}`);
    const endDateInput = document.getElementById(`endDate_${periodId}`);
    
    if (!startDateInput || !endDateInput) return;
    
    // Update end date min constraint when start date changes
    if (period.startDate) {
        endDateInput.min = formatDateTimeLocal(period.startDate);
        
        // If end date is before start date, adjust it
        if (period.endDate < period.startDate) {
            period.endDate = new Date(period.startDate);
            endDateInput.value = formatDateTimeLocal(period.endDate);
        }
    }
    
    // Update start date max constraint when end date changes
    if (period.endDate) {
        startDateInput.max = formatDateTimeLocal(period.endDate);
        
        // If start date is after end date, adjust it
        if (period.startDate > period.endDate) {
            period.startDate = new Date(period.endDate);
            startDateInput.value = formatDateTimeLocal(period.startDate);
        }
    }
}

function countRecordsInPeriod(period) {
    const locations = window.convertedLocations || locationData.locations;
    if (!locations) return 0;
    
    const startMs = period.startDate.getTime();
    const endMs = period.endDate.getTime();
    
    return locations.filter(loc => {
        const timestamp = parseInt(loc.timestampMs || loc.timestamp);
        return timestamp >= startMs && timestamp <= endMs;
    }).length;
}

function updatePeriodsSummary() {
    const summaryDiv = document.getElementById('periodsSummary');
    const periodsListDiv = document.getElementById('periodsList');
    
    if (periods.length === 0) {
        summaryDiv.style.display = 'none';
        return;
    }
    
    summaryDiv.style.display = 'block';
    periodsListDiv.innerHTML = '';
    
    periods.forEach(period => {
        const count = countRecordsInPeriod(period);
        const periodDiv = document.createElement('div');
        periodDiv.innerHTML = `
            <strong>Period ${period.id}:</strong> ${period.startDate.toLocaleDateString()} to ${period.endDate.toLocaleDateString()} 
            (${count.toLocaleString()} records)
        `;
        periodsListDiv.appendChild(periodDiv);
    });
    
    // Enable process button if we have periods
    processBtn.disabled = periods.length === 0;
}

function refreshMapAndDownloadSections() {
    // Refresh download section
    if (document.getElementById('downloadSection')) {
        showDownloadSection();
    }
    
    // Ensure a selection exists in the period selector
    if (periods.length > 0) {
        if (!periodSelector.value) {
            periodSelector.value = String(periods[0].id);
        }
    }
    
    // Initialize map container if needed
    if (!map && document.getElementById('map')) {
        initializeMapContainer();
    }
    
    // Refresh map for the selected period
    const selectedId = parseInt(periodSelector.value);
    if (!isNaN(selectedId)) {
        const selPeriod = periods.find(p => p.id === selectedId);
        if (selPeriod) {
            loadPeriodData(selPeriod);
        }
    }
    
    // Update period selector text
    updatePeriodSelector();
}

function formatDateTimeLocal(date) {
    // Ensure date is a Date object
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.error('Invalid date passed to formatDateTimeLocal:', date);
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Processing functionality
function initializeProcessing() {
    processBtn.addEventListener('click', processPeriods);
}

function processPeriods() {
    if (periods.length === 0) {
        showError('No periods selected for processing.');
        return;
    }
    
    // Show processing status
    const statusBox = document.getElementById('processingStatus');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    statusBox.style.display = 'block';
    processBtn.disabled = true;
    
    // Process each period
    let completed = 0;
    const total = periods.length;
    
    periods.forEach((period, index) => {
        setTimeout(() => {
            const kmlContent = generateKML(period);
            downloadKML(kmlContent, `period${period.id}_output.kml`);
            
            completed++;
            const progress = (completed / total) * 100;
            progressFill.style.width = progress + '%';
            progressText.textContent = `Processing period ${completed} of ${total}...`;
            
            if (completed === total) {
                progressText.textContent = 'All periods processed successfully!';
                showDownloadSection();
                enableTab('map');
            }
        }, index * 100); // Small delay between periods
    });
}

function generateKML(period) {
    const locations = window.convertedLocations || locationData.locations;
    if (!locations) return '';
    
    const startMs = period.startDate.getTime();
    const endMs = period.endDate.getTime();
    
    // Filter locations for this period
    const periodLocations = locations.filter(loc => {
        const timestamp = parseInt(loc.timestampMs || loc.timestamp);
        return timestamp >= startMs && timestamp <= endMs;
    });
    
    if (periodLocations.length === 0) return '';
    
    // Get KML settings
    const lineColor = document.getElementById('lineColor').value;
    const showLabels = document.getElementById('showLabels').checked;
    const showTickmarks = document.getElementById('showTickmarks').checked;
    const showTrackpoints = document.getElementById('showTrackpoints').checked;
    
    // Group consecutive locations into track segments based on time gaps
    const trackSegments = [];
    let currentSegment = [];

    // Helper: validate lat/lon
    const isValidCoord = (lat, lon) => {
        return isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    };

    // Ensure periodLocations are time-sorted
    periodLocations.sort((a, b) => parseInt(a.timestampMs || a.timestamp) - parseInt(b.timestampMs || b.timestamp));

    // Iterate and build segments
    let lastLat = null;
    let lastLon = null;

    for (let i = 0; i < periodLocations.length; i++) {
        const loc = periodLocations[i];
        const ts = parseInt(loc.timestampMs || loc.timestamp);
        const lonRaw = loc.longitudeE7 ? loc.longitudeE7 / 10000000 : null;
        const latRaw = loc.latitudeE7 ? loc.latitudeE7 / 10000000 : null;

        if (!isValidCoord(latRaw, lonRaw)) continue;

        // Drop consecutive duplicates (same coord as previous retained point)
        if (lastLat !== null && lastLon !== null && Math.abs(latRaw - lastLat) < 1e-7 && Math.abs(lonRaw - lastLon) < 1e-7) {
            continue;
        }

        if (currentSegment.length === 0) {
            currentSegment.push(loc);
        } else {
            const last = currentSegment[currentSegment.length - 1];
            const lastTs = parseInt(last.timestampMs || last.timestamp);
            const timeDiff = ts - lastTs;
            const gapMs = getPairGapThresholdMs(last, loc);

            // Break segment if gap exceeds threshold for the mode
            if (timeDiff > gapMs) {
                if (currentSegment.length >= 2) {
                    trackSegments.push([...currentSegment]);
                }
                currentSegment = [loc];
            } else {
                currentSegment.push(loc);
            }
        }

        lastLat = latRaw;
        lastLon = lonRaw;
    }

    // Add the last segment if it has at least 2 points
    if (currentSegment.length >= 2) {
        trackSegments.push(currentSegment);
    }

    // Debug logging
    console.log(`Period ${period.id}: ${periodLocations.length} locations -> ${trackSegments.length} track segments`);
    trackSegments.forEach((seg, i) => {
        console.log(`  Segment ${i}: ${seg.length} points`);
    });
    
    // Generate KML content with organized folders
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Location History - Period ${period.id}</name>
    <description>Generated from Google Location History</description>
    
    <Style id="trackLineStyle">
      <LineStyle>
        <color>${getKMLColor(lineColor)}</color>
        <width>6</width>
      </LineStyle>
    </Style>
    
    <Style id="pointStyle">
      <IconStyle>
        <scale>0.8</scale>
      </IconStyle>
      <LabelStyle>
        <scale>${showLabels ? '1.0' : '0.0'}</scale>
      </LabelStyle>
    </Style>
    
    <!-- Tracks Folder -->
    <Folder>
      <name>Tracks</name>
      <description>Movement tracks for period ${period.id}</description>
      <open>1</open>
      
      ${trackSegments.map((segment, segmentIndex) => {
        const startTime = new Date(parseInt(segment[0].timestampMs || segment[0].timestamp));
        const endTime = new Date(parseInt(segment[segment.length - 1].timestampMs || segment[segment.length - 1].timestamp));
        const timeRange = startTime.toLocaleDateString() + ' ' + startTime.toLocaleTimeString() + ' - ' + endTime.toLocaleTimeString();
        
        // Build coordinates string - ensure proper formatting for Google Earth
        let coordinates = '';
        segment.forEach(loc => {
            if (loc.longitudeE7 && loc.latitudeE7) {
                const lon = (loc.longitudeE7 / 10000000).toFixed(6);
                const lat = (loc.latitudeE7 / 10000000).toFixed(6);
                coordinates += `\n            ${lon},${lat},0`;
            }
        });
        
        return `
      <Placemark>
        <name>${timeRange}</name>
        <description>Track segment ${segmentIndex + 1} with ${segment.length} points</description>
        <styleUrl>#trackLineStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>${coordinates}
          </coordinates>
        </LineString>
      </Placemark>`;
    }).join('')}
    </Folder>
    
    <!-- Points Folder -->
    ${(showLabels || showTickmarks || showTrackpoints) ? `
    <Folder>
      <name>Points</name>
      <description>Individual location points for period ${period.id}</description>
      <open>0</open>
      
      ${periodLocations.map((loc, index) => {
        if (loc.longitudeE7 && loc.latitudeE7) {
            const lon = loc.longitudeE7 / 10000000;
            const lat = loc.latitudeE7 / 10000000;
            const timestamp = new Date(parseInt(loc.timestampMs || loc.timestamp));
            
            return `
      <Placemark>
        <name>${showLabels ? `Point ${index + 1} - ${timestamp.toLocaleString()}` : `Point ${index + 1}`}</name>
        <description>
          Time: ${timestamp.toISOString()}<br/>
          Latitude: ${lat}<br/>
          Longitude: ${lon}
        </description>
        <styleUrl>#pointStyle</styleUrl>
        <Point>
          <coordinates>${lon},${lat},0</coordinates>
        </Point>
      </Placemark>`;
        }
        return '';
      }).join('')}
    </Folder>` : ''}
    
  </Document>
</kml>`;
    
    return kml;
}

function getKMLColor(colorName) {
    // KML color format is AABBGGRR (alpha, blue, green, red)
    // Use fully opaque (alpha=ff) colors so lines are visible in Google Earth Web
    const colors = {
        red: 'ff0000ff',     // alpha=ff, blue=00, green=00, red=ff
        blue: 'ffff0000',    // alpha=ff, blue=ff, green=00, red=00
        green: 'ff00ff00'    // alpha=ff, blue=00, green=ff, red=00
    };
    return colors[colorName] || 'ffff0000';
}

function downloadKML(content, filename) {
    const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showDownloadSection() {
    const downloadSection = document.getElementById('downloadSection');
    const downloadList = document.getElementById('downloadList');
    
    downloadSection.style.display = 'block';
    downloadList.innerHTML = '';
    
    periods.forEach(period => {
        const downloadItem = document.createElement('div');
        downloadItem.className = 'download-item';
        downloadItem.innerHTML = `
            <span>Period ${period.id}: ${period.startDate.toLocaleDateString()} to ${period.endDate.toLocaleDateString()}</span>
            <a href="#" class="download-btn" onclick="downloadPeriodKML(${period.id})">Download KML</a>
        `;
        downloadList.appendChild(downloadItem);
    });
}

function downloadPeriodKML(periodId) {
    const period = periods.find(p => p.id === periodId);
    if (period) {
        const kmlContent = generateKML(period);
        downloadKML(kmlContent, `period${periodId}_output.kml`);
    }
}

// Map functionality
function initializeMap() {
    loadMapBtn.addEventListener('click', loadMapData);
    
    // Update period selector when periods change
    updatePeriodSelector();
}

function updatePeriodSelector() {
    periodSelector.innerHTML = '<option value="">Choose a period...</option>';
    
    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period.id;
        option.textContent = `Period ${period.id}: ${period.startDate.toLocaleDateString()} to ${period.endDate.toLocaleDateString()}`;
        periodSelector.appendChild(option);
    });
    
    loadMapBtn.disabled = periods.length === 0;
}

function loadMapData() {
    const selectedPeriodId = parseInt(periodSelector.value);
    if (!selectedPeriodId) return;
    
    const period = periods.find(p => p.id === selectedPeriodId);
    if (!period) return;
    
    // Initialize map if not already done
    if (!map) {
        initializeMapContainer();
    }
    
    // Load period data
    loadPeriodData(period);
}

function initializeMapContainer() {
    const mapContainer = document.getElementById('map');
    
    // Initialize Leaflet map
    map = L.map('map').setView([0, 0], 2);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Fix initial size/centering issues when tab becomes visible
    setTimeout(() => map.invalidateSize(), 0);
}

async function loadPeriodData(period) {
    const locations = window.convertedLocations || locationData.locations;
    if (!map || !locations) return;
    
    // Clear existing data
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    const startMs = period.startDate.getTime();
    const endMs = period.endDate.getTime();
    
    // Filter locations for this period
    const periodLocations = locations.filter(loc => {
        const timestamp = parseInt(loc.timestampMs || loc.timestamp);
        return timestamp >= startMs && timestamp <= endMs;
    });
    
    if (periodLocations.length === 0) {
        map.setView([20, 0], 2);
        return;
    }

    // Prefer native activity_path when available (directly from Timeline)
    const pathShare = periodLocations.filter(l => l.source === 'activity_path').length / periodLocations.length;
    let coordinates = null;
    if (pathShare > 0.5) {
        // Build coordinates directly from ordered points; no snapping
        coordinates = periodLocations
            .filter(l => l.longitudeE7 && l.latitudeE7)
            .sort((a, b) => parseInt(a.timestampMs || a.timestamp) - parseInt(b.timestampMs || b.timestamp))
            .map(l => [l.latitudeE7 / 1e7, l.longitudeE7 / 1e7]);
    }

    // Otherwise try smart snapping (Mapbox first, then OSRM), fallback to raw
    if (!coordinates || coordinates.length < 2) {
        coordinates = await snapPathSmart(periodLocations);
        if (!coordinates) {
            coordinates = periodLocations
                .filter(l => l.longitudeE7 && l.latitudeE7)
                .map(l => [l.latitudeE7 / 1e7, l.longitudeE7 / 1e7]);
        }
    }

    if (coordinates.length === 0) { map.setView([20, 0], 2); return; }

    const lineColor = document.getElementById('lineColor').value;
    const polyline = L.polyline(coordinates, { color: lineColor, weight: 3, opacity: 0.9 }).addTo(map);
    const bounds = polyline.getBounds();
    if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] }); else map.setView(coordinates[0], 14);
    setTimeout(() => map.invalidateSize(), 0);

    L.marker(coordinates[0]).addTo(map).bindPopup(`Period ${period.id} Start`);
    if (coordinates.length > 1) L.marker(coordinates[coordinates.length - 1]).addTo(map).bindPopup(`Period ${period.id} End`);

    currentMapData = { period, coordinates, polyline };
}

// Utility functions
function enableTab(tabName) {
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.disabled = false;
        tabBtn.style.opacity = '1';
    }
}

function disableTab(tabName) {
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.disabled = true;
        tabBtn.style.opacity = '0.5';
    }
}

function showError(message) {
    alert('Error: ' + message);
}

// Update period selector when periods change
function updatePeriodSelector() {
    const selector = document.getElementById('periodSelector');
    selector.innerHTML = '<option value="">Choose a period...</option>';
    
    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period.id;
        option.textContent = `Period ${period.id}: ${period.startDate.toLocaleDateString()} to ${period.endDate.toLocaleDateString()}`;
        selector.appendChild(option);
    });
    
    loadMapBtn.disabled = periods.length === 0;
}

// Update the period selector whenever periods change
const originalRenderPeriods = renderPeriods;
renderPeriods = function() {
    originalRenderPeriods();
    updatePeriodSelector();
};

// Segmentation with dynamic gap per transport mode
function getPairGapThresholdMs(prevLoc, nextLoc) {
    const defaultGap = 30 * 60 * 1000; // 30 min
    const fastModes = ['in passenger vehicle', 'in train', 'in subway', 'in tram', 'in bus', 'in ferry'];
    const prevMode = (prevLoc?.activityType || '').toLowerCase();
    const nextMode = (nextLoc?.activityType || '').toLowerCase();
    if (fastModes.some(m => prevMode.includes(m)) || fastModes.some(m => nextMode.includes(m))) {
        return 3 * 60 * 60 * 1000; // 3 hours for long transit legs
    }
    // walking/running often very dense; allow smaller gaps to split pauses cleanly
    const walkModes = ['walking', 'on foot', 'running'];
    if (walkModes.some(m => prevMode.includes(m)) || walkModes.some(m => nextMode.includes(m))) {
        return 10 * 60 * 1000; // 10 min
    }
    return defaultGap;
}

// Smart path snapping: tries Mapbox first, falls back to OSRM
// Input: periodLocations (objects with latitudeE7/longitudeE7 & timestampMs)
// Returns: Promise<[[lat,lon], ...]> snapped coordinates or original on failure
async function snapPathSmart(periodLocations) {
    try {
        if (!Array.isArray(periodLocations) || periodLocations.length < 2) return null;
        
        // Build coordinates and timestamps
        const raw = periodLocations
            .filter(loc => loc.longitudeE7 && loc.latitudeE7)
            .map(loc => [loc.longitudeE7 / 1e7, loc.latitudeE7 / 1e7, parseInt(loc.timestampMs || loc.timestamp) || 0]);
        
        if (raw.length < 2) return null;
        
        const coordinates = raw.map(p => [p[0], p[1]]);
        const timestamps = raw.map(p => p[2]);
        
        // Try Mapbox first if configured and within limits
        if (shouldUseMapbox()) {
            try {
                console.log('Using Mapbox Map Matching API...');
                const mapboxResult = await mapboxMapMatching(coordinates, timestamps);
                if (mapboxResult && mapboxResult.length >= 2) {
                    console.log(`Mapbox matched ${mapboxResult.length} points`);
                    return mapboxResult;
                }
            } catch (error) {
                console.warn('Mapbox matching failed, falling back to OSRM:', error.message);
            }
        }
        
        // Fallback to OSRM
        console.log('Using OSRM Map Matching API...');
        return await snapPathOSRM(periodLocations);
        
    } catch (error) {
        console.warn('All path snapping failed:', error.message);
        return null;
    }
}

// Snap coordinates to roads using OSRM Map Matching API (public demo server)
// Input: periodLocations (objects with latitudeE7/longitudeE7 & timestampMs)
// Returns: Promise<[[lat,lon], ...]> snapped coordinates or original on failure
async function snapPathOSRM(periodLocations) {
    try {
        if (!Array.isArray(periodLocations) || periodLocations.length < 2) return null;
        // Build lon,lat list
        const raw = periodLocations
            .filter(loc => loc.longitudeE7 && loc.latitudeE7)
            .map(loc => [loc.longitudeE7 / 1e7, loc.latitudeE7 / 1e7, parseInt(loc.timestampMs || loc.timestamp) || 0]);
        if (raw.length < 2) return null;

        // OSRM match API limit ~100 coordinates per request; chunk if needed
        const chunkSize = 90;
        let snapped = [];
        for (let i = 0; i < raw.length; i += chunkSize) {
            const chunk = raw.slice(i, i + chunkSize);
            if (chunk.length < 2) continue;
            const coordsParam = chunk.map(p => `${p[0]},${p[1]}`).join(';');
            // timestamps optional; omit for simplicity/compatibility
            const url = `https://router.project-osrm.org/match/v1/driving/${coordsParam}?geometries=geojson&overview=full&annotations=nodes`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`);
            const data = await resp.json();
            if (!data || !data.matchings || data.matchings.length === 0) {
                // Fallback: try route service
                const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?geometries=geojson&overview=full`;
                const r2 = await fetch(routeUrl);
                if (r2.ok) {
                    const d2 = await r2.json();
                    if (d2 && d2.routes && d2.routes[0] && d2.routes[0].geometry && d2.routes[0].geometry.coordinates) {
                        const seg = d2.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
                        snapped = snapped.concat(seg);
                        continue;
                    }
                }
                // If both fail, use raw chunk
                snapped = snapped.concat(chunk.map(([lon, lat]) => [lat, lon]));
                continue;
            }
            // Merge all matchings geometries
            const merged = data.matchings.flatMap(m => (m.geometry && m.geometry.coordinates) ? m.geometry.coordinates : []);
            if (merged.length > 1) {
                snapped = snapped.concat(merged.map(([lon, lat]) => [lat, lon]));
            } else {
                snapped = snapped.concat(chunk.map(([lon, lat]) => [lat, lon]));
            }
        }
        // Deduplicate consecutive identical points
        const result = [];
        for (const p of snapped) {
            const last = result[result.length - 1];
            if (!last || Math.abs(last[0] - p[0]) > 1e-7 || Math.abs(last[1] - p[1]) > 1e-7) result.push(p);
        }
        return result.length >= 2 ? result : null;
    } catch (e) {
        console.warn('OSRM snap failed, using raw path', e);
        return null;
    }
}
