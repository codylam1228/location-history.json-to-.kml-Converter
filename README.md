# Google Location History to KML Converter

A comprehensive web application that converts Google Location History JSON files to KML format with interactive map visualization. Users can select multiple time periods, customize KML output settings, and preview their location data on OpenStreetMap before downloading the final KML files for use in Google Earth.

## Features

- **File Upload**: Drag & drop or file picker for `location-history.json` files
- **Multi-Period Selection**: Choose multiple time periods for processing
- **KML Customization**: Customize line colors and waypoint display options
- **Interactive Map**: Preview routes using OpenStreetMap integration
- **Multiple Output Files**: Generate separate KML files for each period
- **Responsive Design**: Works on both desktop and mobile devices
- **Client-Side Processing**: No server required, all processing done in browser

## Quick Start

1. **Open the Website**: Open `index.html` in a modern web browser
2. **Upload File**: Drag and drop your `location-history.json` file or click to browse
3. **Select Periods**: Choose one or more time periods to process
4. **Customize Settings**: Set KML output preferences (colors, waypoints)
5. **Process Files**: Click "Process Files" to generate KML files
6. **Preview Map**: View your routes on the interactive map
7. **Download**: Get your KML files ready for Google Earth

## File Requirements

### Input File
- **Format**: JSON file exported from Google Takeout
- **Structure**: Must contain a `locations` array with location objects
- **Fields**: Each location should have `latitudeE7`, `longitudeE7`, and `timestampMs`
- **Size**: Supports files up to 1GB (with processing warnings)

### Output Files
- **Format**: Standard KML files compatible with Google Earth
- **Naming**: `period1_output.kml`, `period2_output.kml`, etc.
- **Content**: Route lines, waypoints, and metadata based on user settings

## Usage Guide

### Step 1: File Upload
- Drag and drop your `location-history.json` file onto the upload area
- Or click "Choose File" to browse and select your file
- The system will automatically analyze your file and show:
  - File information (name, size, total records)
  - Date range of available data
  - Warning for large files (>100MB)

### Step 2: Date Selection
- **Auto-Population**: First period is automatically created with full date range
- **Add Periods**: Click "+ Add Another Period" to create additional time ranges
- **Date Validation**: End dates must be after start dates
- **Record Count**: See how many location records are in each period
- **Remove Periods**: Click "Remove" to delete unwanted periods

### Step 3: KML Settings
- **Line Color**: Choose from Red, Blue, or Green
- **Waypoint Display**: Enable/disable:
  - Labels on waypoints
  - Tickmarks
  - Trackpoints
- **Global Settings**: All KML files use the same customization

### Step 4: Processing
- Click "Process Files" to start generation
- Progress bar shows processing status
- Each period generates a separate KML file
- Automatic download prompts for each file

### Step 5: Map Preview
- Select a period from the dropdown
- Click "Load Map" to view the route
- Interactive OpenStreetMap shows:
  - Route lines between waypoints
  - Start and end point markers
  - Popup information on markers

## Technical Details

### Browser Compatibility
- **Required**: Modern browsers with File API support
- **Recommended**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: Responsive design with mobile-optimized layout

### Processing Architecture
- **Client-Side**: All processing done in browser (no server required)
- **Memory Management**: Chunked processing for large files
- **Performance**: Optimized for files up to 1GB

### KML Generation
- **Standards**: Follows KML 2.2 specification
- **Coordinates**: Converts from E7 format to decimal degrees
- **Styling**: Customizable line colors and waypoint display
- **Metadata**: Includes timestamps and period information

### Map Integration
- **Provider**: OpenStreetMap with Leaflet.js
- **Features**: Route visualization, markers, popups
- **Performance**: Efficient rendering for large datasets

## File Structure

```
python_google_earth/
├── index.html                # Main HTML file
├── styles.css                # CSS styling and responsive design
├── script.js                 # JavaScript functionality
├── spec.md                   # Project specification
├── README.md                 # This file
├── location-history.json     # Sample input file (your data)
└── output.kml                # Sample output file (reference)
```

## Dependencies

### External Libraries
- **Leaflet.js**: OpenStreetMap integration and map functionality
- **CDN Links**: Automatically loaded from unpkg.com

### Browser APIs
- **File API**: File reading and processing
- **Blob API**: File download functionality
- **Drag & Drop API**: File upload interface

## Customization

### Adding New Colors
To add more line color options, modify the `getKMLColor()` function in `script.js`:

```javascript
function getKMLColor(colorName) {
    const colors = {
        red: 'ff0000ff',
        blue: '0000ffff',
        green: '00ff00ff',
        purple: '800080ff',  // Add new color
        orange: 'ffa500ff'   // Add new color
    };
    return colors[colorName] || '0000ffff';
}
```

### Modifying KML Output
To change KML generation, edit the `generateKML()` function in `script.js`. The function creates standard KML with:
- Document metadata
- Line styling
- Route placemarks
- Waypoint placemarks (if enabled)

## Troubleshooting

### Common Issues

1. **File Won't Upload**
   - Ensure file is valid JSON format
   - Check file size (should be under 1GB for best performance)
   - Try refreshing the page

2. **Processing Errors**
   - Verify JSON structure has `locations` array
   - Check browser console for error messages
   - Ensure sufficient browser memory for large files

3. **Map Not Loading**
   - Check internet connection (required for OpenStreetMap)
   - Verify Leaflet.js loaded correctly
   - Try selecting a different period

4. **KML Files Won't Open**
   - Ensure file downloaded completely
   - Check file extension is `.kml`
   - Try opening in Google Earth or other KML viewers

### Performance Tips

- **Large Files**: Processing files >100MB may take several seconds
- **Multiple Periods**: Each period processes independently
- **Browser Memory**: Close other tabs for very large files
- **Mobile Devices**: May be slower on older mobile devices

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| File API | 13+ | 3.6+ | 6+ | 12+ |
| Drag & Drop | 4+ | 3.5+ | 3.2+ | 12+ |
| Blob API | 20+ | 13+ | 10+ | 12+ |
| ES6+ | 51+ | 54+ | 10+ | 14+ |

## Contributing

This is a client-side application that can be easily modified and extended:

1. **Fork the repository**
2. **Make changes** to HTML, CSS, or JavaScript
3. **Test thoroughly** with different file sizes and formats
4. **Submit pull request** with detailed description

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Ensure your JSON file follows the expected format
4. Test with a smaller sample file first

## Future Enhancements

Potential improvements for future versions:
- Support for additional output formats (GPX, CSV)
- Advanced filtering options (speed, altitude, accuracy)
- Batch processing of multiple files
- Cloud storage integration
- Advanced map features (3D, satellite views)
- Export to other mapping services
