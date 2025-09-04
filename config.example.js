// Configuration file template for Location History Converter
// Copy this file to 'config.js' and replace the placeholder values

const CONFIG = {
    // Get your Mapbox API key from: https://account.mapbox.com/
    //
    // Steps to get your API key:
    // 1. Go to Mapbox website: https://account.mapbox.com/
    // 2. Sign up for a free account or log in to your existing account
    // 3. Go to your account dashboard and create a new access token
    // 4. Copy your public access token (starts with pk.)
    // 5. Replace the placeholder below with your actual API key
    //
    // Mapbox provides generous free tier limits:
    // - 100,000 requests per month for Map Matching API
    // - No credit card required for free tier
    MAPBOX_ACCESS_TOKEN: 'YOUR_MAPBOX_ACCESS_TOKEN_HERE',
    
    // Default KML settings
    DEFAULT_LINE_COLOR: 'blue',
    DEFAULT_SHOW_LABELS: true,
    DEFAULT_SHOW_TICKMARKS: true,
    DEFAULT_SHOW_TRACKPOINTS: true
};

// Make config available globally
window.CONFIG = CONFIG;

// Instructions for setup:
// 1. Copy this file and rename it to 'config.js'
// 2. Replace 'YOUR_MAPBOX_ACCESS_TOKEN_HERE' with your actual Mapbox API key
// 3. The config.js file is already added to .gitignore so it won't be committed to version control
