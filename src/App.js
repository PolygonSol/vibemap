import React, { useEffect, useState, useRef, Component, useCallback } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as esri from 'esri-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './App.css';
import NinetiesCounterDisplay from './NinetiesCounterDisplay';

// Error Boundary Component for better error handling
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    Logger.error('Error caught by boundary:', error);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
          <p style={{ color: '#7f1d1d' }}>
            The application encountered an error. Please refresh the page to try again.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ textAlign: 'left', marginTop: '10px' }}>
              <summary>Error Details (Development Only)</summary>
              <pre style={{ 
                backgroundColor: '#f3f4f6', 
                padding: '10px', 
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Secure logging utility
const Logger = {
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data);
    }
  },
  info: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(message);
    }
  },
  error: (message, error) => {
    console.error(message, error);
  },
  warn: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, data);
    }
  }
};

// 1990s-style Visitor Counter Component
function VisitorCounter({ count }) {
  return (
    <NinetiesCounterDisplay 
      count={count} 
      title="Counting like it's Y2K all over again"
    />
  );
}

// Loading Progress Component
function LoadingProgress({ progress, message, isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="loading-progress-overlay">
      <div className="loading-progress-container">
        <div className="loading-progress-header">
          <h3>🔄 Loading Data</h3>
        </div>
        <div className="loading-progress-content">
          <div className="loading-message">{message}</div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">{progress}%</div>
        </div>
      </div>
    </div>
  );
}



// Secure map service to replace global window access
const MapService = {
  _mapRef: null,
  _isInitialized: false,
  
  setMapRef: (ref) => { 
    MapService._mapRef = ref; 
    MapService._isInitialized = true;
  },
  
  getMapRef: () => MapService._mapRef,
  
  clearMapRef: () => { 
    MapService._mapRef = null; 
    MapService._isInitialized = false;
  },
  
  isInitialized: () => MapService._isInitialized,
  
  // Secure method to access map functions
  highlightFeature: (feature) => {
    if (MapService._mapRef?.current?.highlightFeature) {
      MapService._mapRef.current.highlightFeature(feature);
    }
  },
  
  highlightMultipleFeatures: (features) => {
    if (MapService._mapRef?.current?.highlightMultipleFeatures) {
      MapService._mapRef.current.highlightMultipleFeatures(features);
    }
  }
};

// Input validation utilities
const ValidationUtils = {
  validateBounds: (bounds) => {
    if (!bounds || typeof bounds !== 'object') return false;
    if (!bounds.isValid || typeof bounds.isValid !== 'function') return false;
    if (!bounds.getNorth || !bounds.getSouth || !bounds.getEast || !bounds.getWest) return false;
    
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();
    
    if (north < -90 || north > 90) return false;
    if (south < -90 || south > 90) return false;
    if (east < -180 || east > 180) return false;
    if (west < -180 || west > 180) return false;
    return true;
  },
  
  validateFeature: (feature) => {
    if (!feature || typeof feature !== 'object') return false;
    if (!feature.geometry || typeof feature.geometry !== 'object') return false;
    if (!feature.geometry.type || !feature.geometry.coordinates) return false;
    return true;
  },
  
  sanitizeString: (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim();
  }
};

// Helper function to get feature summary (moved to top level for reuse)
function getFeatureSummary(feature, layerName) {
  if (!ValidationUtils.validateFeature(feature)) {
    Logger.warn('Invalid feature provided to getFeatureSummary');
    return {
      id: 'N/A',
      name: 'Invalid Feature',
      county: 'N/A',
      type: 'N/A'
    };
  }
  
  const props = feature.properties || {};
  
  switch (layerName) {
    case 'bridges':
      return {
        id: ValidationUtils.sanitizeString(props.OBJECTID) || 'N/A',
        name: ValidationUtils.sanitizeString(props.BRIDGE_NAME || props.ROUTE) || 'Bridge',
        county: ValidationUtils.sanitizeString(props.COUNTY) || 'N/A',
        type: ValidationUtils.sanitizeString(props.BRIDGE_TYPE) || 'N/A'
      };
    case 'conduits':
      return {
        id: ValidationUtils.sanitizeString(props.OBJECTID) || 'N/A',
        name: ValidationUtils.sanitizeString(props.CONDUIT_NAME || props.ROUTE) || 'Conduit',
        county: ValidationUtils.sanitizeString(props.COUNTY) || 'N/A',
        type: ValidationUtils.sanitizeString(props.CONDUIT_TYPE) || 'N/A'
      };
    case 'roads':
      return {
        id: ValidationUtils.sanitizeString(props.OBJECTID) || 'N/A',
        name: ValidationUtils.sanitizeString(props.STREET_NAME || props.ROUTE_TYPE) || 'Road',
        county: ValidationUtils.sanitizeString(props.COUNTY_CODE_LEFT || props.COUNTY_CODE_RIGHT) || 'N/A',
        type: ValidationUtils.sanitizeString(props.ROUTE_TYPE) || 'N/A'
      };
    case 'boundaries':
      return {
        id: ValidationUtils.sanitizeString(props.OBJECTID) || 'N/A',
        name: ValidationUtils.sanitizeString(props.ODOT_DISTRICT) || 'District',
        county: ValidationUtils.sanitizeString(props.ADDRESS) || 'N/A',
        type: ValidationUtils.sanitizeString(props.CITY) || 'N/A'
      };
    default:
      return {
        id: ValidationUtils.sanitizeString(props.OBJECTID) || 'N/A',
        name: 'Feature',
        county: 'N/A',
        type: 'N/A'
      };
  }
}

// Import Leaflet Draw plugin - try different approach
// import 'leaflet-draw/dist/leaflet.draw.js';

// Feature Summary Popup Component
function FeatureSummaryPopup({ features, onClose, onFeatureClick, setMessage, displayedFeatures, hasMoreFeatures, loadMoreFeatures, isLoadingMore, featureCount }) {
  Logger.debug('FeatureSummaryPopup called with features count:', features?.length);
  const [expandedLayer, setExpandedLayer] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);

  // Dragging functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.popup-actions, .popup-collapse, .export-dropdown, .export-menu, .export-option')) {
      return; // Don't start dragging if clicking on buttons or menus
    }
    
    setIsDragging(true);
    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep popup within viewport bounds
    const maxX = window.innerWidth - 500; // min-width of popup
    const maxY = window.innerHeight - 200; // approximate height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Export functions
  const exportToCSV = () => {
    if (!features || features.length === 0) return;
    
    // Group features by layer
    const groupedFeatures = features.reduce((acc, feature) => {
      const layerName = feature.layerName;
      if (!acc[layerName]) {
        acc[layerName] = [];
      }
      acc[layerName].push(feature);
      return acc;
    }, {});
    
    // Export each layer to a separate CSV file
    Object.entries(groupedFeatures).forEach(([layerName, layerFeatures]) => {
      // Get all unique property keys from this layer's features
      const allPropertyKeys = new Set();
      layerFeatures.forEach(feature => {
        if (feature.properties) {
          Object.keys(feature.properties).forEach(key => allPropertyKeys.add(key));
        }
      });
      
      // Create CSV header with all possible fields
      const headers = ['ID', 'Name', 'County', 'Type', 'Geometry_Type', 'Longitude', 'Latitude', ...Array.from(allPropertyKeys)];
      const csvContent = [
        headers.join(','),
        ...layerFeatures.map(feature => {
          const summary = getFeatureSummary(feature, layerName);
          const coords = feature.geometry?.coordinates;
          
          // Create row with all fields
          const row = [
            summary.id,
            `"${summary.name}"`,
            `"${summary.county}"`,
            `"${summary.type}"`,
            feature.geometry?.type || 'N/A',
            coords && coords.length > 0 ? coords[0] : 'N/A',
            coords && coords.length > 1 ? coords[1] : 'N/A'
          ];
          
          // Add all properties
          Array.from(allPropertyKeys).forEach(key => {
            const value = feature.properties?.[key];
            if (value !== undefined && value !== null) {
              row.push(`"${String(value).replace(/"/g, '""')}"`);
            } else {
              row.push('');
            }
          });
          
          return row.join(',');
        })
      ].join('\n');
      
      // Download CSV file for this layer
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${layerName}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const exportToGeoJSON = () => {
    if (!features || features.length === 0) return;
    
    // Group features by layer
    const groupedFeatures = features.reduce((acc, feature) => {
      const layerName = feature.layerName;
      if (!acc[layerName]) {
        acc[layerName] = [];
      }
      acc[layerName].push(feature);
      return acc;
    }, {});
    
    // Export each layer to a separate GeoJSON file
    Object.entries(groupedFeatures).forEach(([layerName, layerFeatures]) => {
      const geojson = {
        type: 'FeatureCollection',
        features: layerFeatures.map(feature => ({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            ...feature.properties,
            layerName: layerName
          }
        }))
      };
      
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${layerName}_${new Date().toISOString().split('T')[0]}.geojson`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const exportToKML = () => {
    if (!features || features.length === 0) return;
    
    // Group features by layer
    const groupedFeatures = features.reduce((acc, feature) => {
      const layerName = feature.layerName;
      if (!acc[layerName]) {
        acc[layerName] = [];
      }
      acc[layerName].push(feature);
      return acc;
    }, {});
    
    // Export each layer to a separate KML file
    Object.entries(groupedFeatures).forEach(([layerName, layerFeatures]) => {
      // Create KML content for this layer
      const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${layerName} - Selected Features</name>
    <description>${layerName} features exported from VibeMap on ${new Date().toLocaleDateString()}</description>
    ${layerFeatures.map(feature => {
      const summary = getFeatureSummary(feature, layerName);
      const coords = feature.geometry?.coordinates;
      let placemark = '';
      
      if (feature.geometry?.type === 'Point' && coords) {
        placemark = `
    <Placemark>
      <name>${summary.name}</name>
      <description>
        <![CDATA[
          <b>Layer:</b> ${layerName}<br/>
          <b>ID:</b> ${summary.id}<br/>
          <b>County:</b> ${summary.county}<br/>
          <b>Type:</b> ${summary.type}<br/>
        ]]>
      </description>
      <Point>
        <coordinates>${coords[0]},${coords[1]}</coordinates>
      </Point>
    </Placemark>`;
      }
      
      return placemark;
    }).join('')}
  </Document>
</kml>`;
      
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${layerName}_${new Date().toISOString().split('T')[0]}.kml`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const exportToKMZ = () => {
    // For now, KMZ is the same as KML since we're not including images
    // In a full implementation, you'd zip the KML with any referenced files
    // This will create separate KMZ files per layer just like KML
    exportToKML();
  };

  const exportToGeoPackage = () => {
    // Note: GeoPackage requires a library like sql.js or a server-side implementation
    // For now, we'll show a message that this requires additional setup
    alert('GeoPackage export requires additional libraries. For now, please use GeoJSON or KML formats.');
  };

  // Drag functionality


  // PDF Export with screenshot
  const exportToPDF = async () => {
    if (!features || features.length === 0) return;
    
    try {
      setMessage('Generating PDF report...');
      
      // Get map reference from the parent component
      const map = window.mapRef?.current;
      if (!map) {
        setMessage('Map not available for screenshot');
        return;
      }

      // Get map bounds and center
      const bounds = map.getBounds();
      const center = map.getCenter();
      
      // Ensure highlights are visible before taking screenshot
      // Force a map redraw to ensure highlights are rendered
      if (map.invalidateSize) {
        map.invalidateSize();
      }
      
      // Small delay to ensure highlights are fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the actual map with basemap tiles
      let basemapImage;
      try {
        const html2canvas = await import('html2canvas');
        const mapContainer = document.querySelector('.leaflet-container');
        if (mapContainer) {
          const canvas = await html2canvas.default(mapContainer, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            scale: 2, // Higher scale for better quality
            width: 800,
            height: 600,
            logging: false,
            removeContainer: false,
            foreignObjectRendering: true
          });
          basemapImage = canvas.toDataURL('image/png');
        } else {
          throw new Error('Map container not found');
        }
      } catch (error) {
        console.warn('Could not capture map with basemap, using fallback:', error);
        // Fallback to simple background
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 800;
        tempCanvas.height = 600;
        
        tempCtx.fillStyle = '#f0f0f0';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCtx.fillStyle = '#87CEEB';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height * 0.7);
        
        tempCtx.fillStyle = '#228B22';
        tempCtx.fillRect(0, tempCanvas.height * 0.7, tempCanvas.width, tempCanvas.height * 0.3);
        
        basemapImage = tempCanvas.toDataURL('image/png');
      }
      
      // Create final canvas with basemap and yellow highlights
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 600;
      
      // Load the map image first
      const mapImg = new Image();
      await new Promise((resolve, reject) => {
        mapImg.onload = resolve;
        mapImg.onerror = reject;
        mapImg.src = basemapImage;
      });
      
      // Draw the basemap
      ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
      
      // Draw yellow highlights for selected features
      if (features.length > 0) {
        ctx.fillStyle = '#f59e0b'; // Bright yellow fill
        ctx.strokeStyle = '#fbbf24'; // Bright yellow border
        ctx.lineWidth = 4;
        
        // Get map container for coordinate conversion
        const mapContainer = document.querySelector('.leaflet-container');
        
        features.forEach((feature, index) => {
          if (!feature.geometry) return;
          
          if (feature.geometry.type === 'Point') {
            const coords = feature.geometry.coordinates;
            const latLng = L.latLng(coords[1], coords[0]);
            const point = map.latLngToContainerPoint(latLng);
            
            // Convert to canvas coordinates
            const x = (point.x / mapContainer.offsetWidth) * canvas.width;
            const y = (point.y / mapContainer.offsetHeight) * (canvas.height * 0.7);
            
            // Draw circle for points
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
          } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
            const coords = feature.geometry.type === 'LineString' 
              ? feature.geometry.coordinates 
              : feature.geometry.coordinates.flat();
            
            ctx.beginPath();
            coords.forEach((coord, i) => {
              const latLng = L.latLng(coord[1], coord[0]);
              const point = map.latLngToContainerPoint(latLng);
              const x = (point.x / mapContainer.offsetWidth) * canvas.width;
              const y = (point.y / mapContainer.offsetHeight) * (canvas.height * 0.7);
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
            ctx.stroke();
            
          } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.type === 'Polygon' 
              ? feature.geometry.coordinates[0] 
              : feature.geometry.coordinates.flat()[0];
            
            ctx.beginPath();
            coords.forEach((coord, i) => {
              const latLng = L.latLng(coord[1], coord[0]);
              const point = map.latLngToContainerPoint(latLng);
              const x = (point.x / mapContainer.offsetWidth) * canvas.width;
              const y = (point.y / mapContainer.offsetHeight) * (canvas.height * 0.7);
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        });
      }
      
      // Draw text overlay
      ctx.fillStyle = '#000';
      ctx.font = '16px Arial';
      ctx.fillText(`Map View: ${bounds.getSouthWest().lat.toFixed(4)}, ${bounds.getSouthWest().lng.toFixed(4)} to ${bounds.getNorthEast().lat.toFixed(4)}, ${bounds.getNorthEast().lng.toFixed(4)}`, 20, 30);
      ctx.fillText(`Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`, 20, 50);
      ctx.fillText(`Zoom Level: ${map.getZoom()}`, 20, 70);
      ctx.fillText(`Selected Features: ${features.length} (highlighted in yellow)`, 20, 90);
      
      const mapImage = canvas.toDataURL('image/png');

      // Create PDF content
      const pdfContent = {
        title: 'Feature Selection Report (with Yellow Highlights)',
        date: new Date().toLocaleDateString(),
        mapImage: mapImage,
        summary: {
          totalFeatures: features.length,
          layerCount: Object.keys(groupedFeatures).length,
          layers: Object.entries(groupedFeatures).map(([layerName, layerFeatures]) => ({
            name: getLayerDisplayName(layerName),
            count: layerFeatures.length,
            features: layerFeatures.map(feature => {
              const summary = getFeatureSummary(feature, layerName);
              return {
                id: summary.id,
                name: summary.name,
                county: summary.county,
                type: summary.type
              };
            })
          }))
        }
      };

      // Generate PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Function to add page numbers
      const addPageNumber = (pageNum, totalPages) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const pageText = `Page ${pageNum} of ${totalPages}`;
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(pageText, pageWidth - 40, pageHeight - 10);
        doc.setTextColor(0, 0, 0); // Reset text color
      };
      
      // Add title
      doc.setFontSize(20);
      doc.text('Feature Selection Report', 20, 20);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('(with Yellow Highlights)', 20, 28);
      doc.setTextColor(0, 0, 0); // Reset text color
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated: ${pdfContent.date}`, 20, 35);
      
      // Add summary
      doc.setFontSize(14);
      doc.text('Summary', 20, 50);
      doc.setFontSize(12);
      doc.text(`Total Features: ${pdfContent.summary.totalFeatures}`, 20, 65);
      doc.text(`Layer Types: ${pdfContent.summary.layerCount}`, 20, 75);
      
      // Add highlighting explanation
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('🟡 Yellow highlights indicate selected features on the map', 20, 85);
      doc.setTextColor(0, 0, 0); // Reset text color
      
      // Add map screenshot
      doc.addImage(pdfContent.mapImage, 'PNG', 20, 100, 170, 120);
      
      // Add note about highlights
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Note: Selected features are highlighted in bright yellow on the map above', 20, 225);
      doc.setTextColor(0, 0, 0); // Reset text color
      
      // Add feature details
      let yPosition = 240;
      let currentPage = 1;
      let totalPages = 1; // Will be calculated after adding all content
      
      pdfContent.summary.layers.forEach(layer => {
        if (yPosition > 250) {
          doc.addPage();
          currentPage++;
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`${layer.name} (${layer.count})`, 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        layer.features.forEach(feature => {
          if (yPosition > 270) {
            doc.addPage();
            currentPage++;
            yPosition = 20;
          }
          doc.text(`${feature.id}: ${feature.name} - ${feature.county}`, 30, yPosition);
          yPosition += 7;
        });
        yPosition += 5;
      });
      
      // Calculate total pages
      totalPages = doc.internal.getNumberOfPages();
      
      // Add page numbers to all pages
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addPageNumber(i, totalPages);
      }
      
      // Save the PDF
      doc.save(`feature_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setMessage('PDF report generated successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setMessage('Error generating PDF report');
    }
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-dropdown')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  if (!features || features.length === 0) {
    Logger.debug('FeatureSummaryPopup: No features, showing "No Features Found" message');
    return (
      <div className="custom-popup feature-summary-popup">
        <div className="popup-header">
          <h3>Selection Summary</h3>
          <button className="popup-close" onClick={onClose}>×</button>
        </div>
        <div className="popup-content">
          <div className="no-features-message">
            <div className="no-features-icon">🔍</div>
            <h4>No Features Found</h4>
            <p>No features were found in the selected area. Try:</p>
            <ul>
              <li>Drawing a larger selection area</li>
              <li>Moving to a different location on the map</li>
              <li>Enabling more layers in the Layers tab</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Use displayedFeatures if available, otherwise fall back to features
  const featuresToDisplay = displayedFeatures && displayedFeatures.length > 0 ? displayedFeatures : features;
  
  // Group features by layer type
  const groupedFeatures = featuresToDisplay.reduce((acc, feature) => {
    const layerType = feature.layerName;
    if (!acc[layerType]) {
      acc[layerType] = [];
    }
    acc[layerType].push(feature);
    return acc;
  }, {});

  const getLayerDisplayName = (layerName) => {
    switch (layerName) {
      case 'bridges': return 'Bridges';
      case 'conduits': return 'Conduits';
      case 'roads': return 'Roads';
      case 'boundaries': return 'ODOT Districts';
      case 'lighting': return 'Highway Lighting';
      default: return layerName;
    }
  };

  const getLayerIcon = (layerName) => {
    switch (layerName) {
      case 'bridges': return '🌉';
      case 'conduits': return '🕳️';
      case 'roads': return '🛣️';
      case 'boundaries': return '🗺️';
      case 'lighting': return '💡';
      default: return '📍';
    }
  };



  const totalFeatures = featureCount || features.length;
  const displayedCount = featuresToDisplay.length;
  const layerCount = Object.keys(groupedFeatures).length;

  return (
    <div 
      ref={popupRef}
      className={`custom-popup feature-summary-popup ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        right: 'auto',
        transform: 'none',
        zIndex: 10000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="popup-header">
        <h3>Selection Summary</h3>
        <div className="popup-actions">
          <button 
            className="popup-collapse" 
            title={isCollapsed ? "Expand" : "Collapse"}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? '⬆️' : '⬇️'}
          </button>
          <div className="export-dropdown">
            <button 
              className="export-button main-export" 
              title="Export Data"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              📤 Export
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button className="export-option" onClick={() => { exportToPDF(); setShowExportMenu(false); }}>
                  📄 PDF Report
                </button>
                <button className="export-option" onClick={() => { exportToCSV(); setShowExportMenu(false); }}>
                  📊 CSV
                </button>
                <button className="export-option" onClick={() => { exportToGeoJSON(); setShowExportMenu(false); }}>
                  🌐 GeoJSON
                </button>
                <button className="export-option" onClick={() => { exportToKML(); setShowExportMenu(false); }}>
                  🗺️ KML
                </button>
                <button className="export-option" onClick={() => { exportToKMZ(); setShowExportMenu(false); }}>
                  📦 KMZ
                </button>
                <button className="export-option" onClick={() => { exportToGeoPackage(); setShowExportMenu(false); }}>
                  📦 GeoPackage
                </button>
              </div>
            )}
          </div>
          <button className="popup-close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className={`popup-content ${isCollapsed ? 'collapsed' : ''}`}>
        {!isCollapsed && (
          <>
            {totalFeatures === 0 ? (
              <div className="no-features-message">
                <div className="no-features-icon">🔍</div>
                <h4>No Features Found</h4>
                <p>No features were found in the selected area. Try:</p>
                <ul>
                  <li>Drawing a larger selection area</li>
                  <li>Moving to a different location on the map</li>
                  <li>Enabling more layers in the Layers tab</li>
                </ul>
              </div>
            ) : (
              <>
                {/* Summary Statistics */}
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Features:</span>
                    <span className="stat-value">{totalFeatures}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Layer Types:</span>
                    <span className="stat-value">{layerCount}</span>
                  </div>
                </div>
                
                {/* Performance Message */}
                {totalFeatures >= 200 && (
                  <div className="performance-message">
                    <span className="performance-icon">⚡</span>
                    <span className="performance-text">
                      Display limited to 200 features (100 per layer) for better performance. 
                      {totalFeatures > 200 && ` (${totalFeatures - 200} more features found)`}
                    </span>
                  </div>
                )}

        {/* Layer Groups */}
        {Object.entries(groupedFeatures).map(([layerType, layerFeatures]) => {
          const isExpanded = expandedLayer === layerType;
          const summary = getFeatureSummary(layerFeatures[0], layerType);
          
          return (
            <div key={layerType} className="feature-group">
              <div 
                className="feature-group-header"
                onClick={() => setExpandedLayer(isExpanded ? null : layerType)}
              >
                <div className="group-info">
                  <span className="group-icon">{getLayerIcon(layerType)}</span>
                  <div className="group-details">
                    <h4 className="feature-group-title">
                      {getLayerDisplayName(layerType)} ({layerFeatures.length})
                      {layerFeatures.length > 100 && ` (showing 100)`}
                    </h4>
                    <div className="group-summary">
                      {summary.name} • {summary.county}
                    </div>
                  </div>
                </div>
                <div className="group-actions">
                  <button 
                    className="expand-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedLayer(isExpanded ? null : layerType);
                    }}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="feature-list">
                  {layerFeatures.slice(0, 100).map((feature, index) => {
                    const featureSummary = getFeatureSummary(feature, layerType);
                    return (
                      <div 
                        key={`${layerType}-${index}`} 
                        className="feature-item"
                        onClick={() => {
                          setSelectedFeature(feature);
                          setExpandedLayer(null); // Collapse layer groups when showing feature details
                          // Zoom to and highlight the feature
                          if (onFeatureClick) {
                            onFeatureClick(feature);
                          }
                        }}
                      >
                        <div className="feature-info">
                          <span className="feature-name">{featureSummary.name}</span>
                          <span className="feature-details">
                            ID: {featureSummary.id} • {featureSummary.county}
                          </span>
                        </div>
                        <i className="feature-arrow">→</i>
                      </div>
                    );
                  })}
                  {layerFeatures.length > 100 && (
                    <div className="feature-limit-message">
                      <span className="limit-icon">📋</span>
                      <span className="limit-text">
                        Showing first 100 of {layerFeatures.length} features. 
                        Use export to see all features.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
          </>
        )}
        
        {/* Feature Details Section */}
        {!isCollapsed && selectedFeature && (
          <div className="feature-details-section">
            <div className="feature-details-header">
              <button 
                className="back-button"
                onClick={() => setSelectedFeature(null)}
              >
                <i className="back-icon">←</i>
                Back to Summary
              </button>
            </div>
            <FeatureDetails feature={selectedFeature} />
          </div>
        )}
          </>
        )}
        
        {/* Load More Button */}
        {hasMoreFeatures && (
          <div className="load-more-section">
            <button 
              className="load-more-button"
              onClick={loadMoreFeatures}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? '⏳ Loading...' : `📄 Load More (${displayedCount} of ${totalFeatures})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Feature Details Component
function FeatureDetails({ feature }) {
  if (!feature) return null;

  const getLayerType = (layerName) => {
    if (layerName.includes('bridge')) return 'Bridge';
    if (layerName.includes('conduit')) return 'Conduit';
    if (layerName.includes('road')) return 'Road';
    if (layerName.includes('boundary')) return 'ODOT District';
    if (layerName.includes('lighting')) return 'Highway Lighting';
    return 'Feature';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value.toString();
  };

  const layerType = getLayerType(feature.layerName || '');
  const properties = feature.properties || {};

  return (
    <div className="feature-details-content">
      <div className="feature-details-title">
        <h4>{layerType} Details</h4>
      </div>
      <div className="feature-details-fields">
        {Object.entries(properties).map(([key, value]) => {
          // Skip geometry and internal fields
          if (key.toLowerCase().includes('shape') || key.toLowerCase().includes('objectid')) {
            return null;
          }
          
          const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const displayValue = formatValue(value);
          
          return (
            <div key={key} className="feature-detail-field">
              <span className="feature-detail-label">{displayKey}:</span>
              <span className="feature-detail-value">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Custom Popup Component (keeping for backward compatibility)
function CustomPopup({ feature, onClose }) {
  if (!feature) return null;

  const getLayerType = (layerName) => {
    if (layerName.includes('bridge')) return 'Bridge';
    if (layerName.includes('conduit')) return 'Conduit';
    if (layerName.includes('road')) return 'Road';
    if (layerName.includes('boundary')) return 'ODOT District';
    if (layerName.includes('lighting')) return 'Highway Lighting';
    return 'Feature';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value.toString();
  };

  const layerType = getLayerType(feature.layerName || '');
  const properties = feature.properties || {};

  return (
    <div className="custom-popup">
      <div className="popup-header">
        <h3>{layerType} Information</h3>
        <button className="popup-close" onClick={onClose}>×</button>
      </div>
      <div className="popup-content">
        {Object.entries(properties).map(([key, value]) => {
          // Skip geometry and internal fields
          if (key.toLowerCase().includes('shape') || key.toLowerCase().includes('objectid')) {
            return null;
          }
          
          const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const displayValue = formatValue(value);
          
          return (
            <div key={key} className="popup-field">
              <span className="popup-label">{displayKey}:</span>
              <span className="popup-value">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Basemap Layer Component
function BasemapLayer({ basemap }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    // Remove previous layer if it exists
    if (layerRef.current && map.hasLayer(layerRef.current)) {
      map.removeLayer(layerRef.current);
    }

    // Create new layer based on selected basemap
    let newLayer;
    switch (basemap) {
      case 'esri-streets':
        newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
        });
        break;
      case 'esri-satellite':
        newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
        });
        break;
      case 'esri-topo':
        newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
        });
        break;
      case 'carto-positron':
        newLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        });
        break;
      case 'carto-dark':
        newLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        });
        break;
      default: // 'osm'
        newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
    }

    // Add new layer to map
    newLayer.addTo(map);
    layerRef.current = newLayer;

    // Cleanup function
    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [basemap, map]);

  return null;
}

// Map Initializer Component with ODOT Layers
function MapInitializer({ layerStates, setSelectedFeature, setSelectedFeatures, setShowFeaturePopup, drawToolRef, measureToolRef, setMessage, handleFeatureClick, layerRefs, mapRef, loadInitialFeatures, getLayerDisplayName }) {
  const map = useMap();
  const layersRef = useRef({});
  
  // Store map reference for external access
  useEffect(() => {
    mapRef.current = map;
    // Use secure map service instead of global window access
    MapService.setMapRef(mapRef);
    
    // Cleanup function
    return () => {
      if (mapRef.current === map) {
        mapRef.current = null;
      }
      MapService.clearMapRef();
    };
  }, [map, mapRef]);
  
  // Highlight layer for selected features
  const highlightLayerRef = useRef(null);
  
  // Function to highlight a feature
  const highlightFeature = useCallback((feature) => {
    console.log('highlightFeature called with:', feature);
    
    // Check if map is available
    if (!map) {
      console.warn('Map is not available for highlighting');
      return;
    }
    
    // Always clear previous highlight first
    if (highlightLayerRef.current) {
      console.log('Clearing previous highlight layer');
      try {
        map.removeLayer(highlightLayerRef.current);
      } catch (error) {
        console.warn('Error removing previous highlight layer:', error);
      }
      highlightLayerRef.current = null;
    }
    
    // If feature is null or undefined, just clear highlights and return
    if (!feature) {
      console.log('No feature provided, clearing highlights');
      return;
    }
    
    if (!feature.geometry) {
      console.log('Feature has no geometry:', feature);
      return;
    }
    
    // Create highlight layer
    highlightLayerRef.current = L.layerGroup();
    console.log('Created highlight layer for geometry type:', feature.geometry.type);
    
    try {
      if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates;
        const latLng = L.latLng(coords[1], coords[0]);
        const marker = L.circleMarker(latLng, {
          radius: 12,
          color: '#fbbf24', // Bright yellow border
          weight: 4,
          fillColor: '#f59e0b', // Bright yellow fill
          fillOpacity: 0.9
        });
        highlightLayerRef.current.addLayer(marker);
      } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
        const coords = feature.geometry.type === 'LineString' 
          ? feature.geometry.coordinates 
          : feature.geometry.coordinates.flat();
        const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));
        const polyline = L.polyline(latLngs, {
          color: '#fbbf24', // Bright yellow
          weight: 6,
          opacity: 0.9
        });
        highlightLayerRef.current.addLayer(polyline);
      } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        const coords = feature.geometry.type === 'Polygon' 
          ? feature.geometry.coordinates[0] 
          : feature.geometry.coordinates.flat()[0];
        const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));
        const polygon = L.polygon(latLngs, {
          color: '#fbbf24', // Bright yellow border
          weight: 4,
          fillColor: '#f59e0b', // Bright yellow fill
          fillOpacity: 0.4
        });
        highlightLayerRef.current.addLayer(polygon);
      }
      
      // Add highlight layer to map
      if (highlightLayerRef.current) {
        console.log('Adding highlight layer to map');
        console.log('Highlight layer details:', {
          layerCount: highlightLayerRef.current.getLayers().length,
          isAdded: map.hasLayer(highlightLayerRef.current)
        });
        try {
          map.addLayer(highlightLayerRef.current);
          console.log('Highlight layer added successfully');
        } catch (error) {
          console.error('Error adding highlight layer to map:', error);
        }
      } else {
        console.warn('highlightLayerRef.current is null, cannot add layer to map');
      }
    } catch (error) {
      console.error('Error highlighting feature:', error);
    }
  }, [map]);

  const highlightMultipleFeatures = useCallback((features) => {
    // Check if map is available
    if (!map) {
      console.warn('Map is not available for highlighting multiple features');
      return;
    }
    
    // Always clear previous highlight first
    if (highlightLayerRef.current) {
      try {
        map.removeLayer(highlightLayerRef.current);
      } catch (error) {
        console.warn('Error removing previous highlight layer:', error);
      }
      highlightLayerRef.current = null;
    }
    
    // If features is null or undefined, just clear highlights and return
    if (!features) return;
    
    if (features.length === 0) return;
    
    // Create highlight layer
    highlightLayerRef.current = L.layerGroup();
    
    try {
      features.forEach(feature => {
        if (!feature || !feature.geometry) return;
        
        if (feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          const latLng = L.latLng(coords[1], coords[0]);
          const marker = L.circleMarker(latLng, {
            radius: 12,
            color: '#fbbf24', // Bright yellow border
            weight: 4,
            fillColor: '#f59e0b', // Bright yellow fill
            fillOpacity: 0.9
          });
          highlightLayerRef.current.addLayer(marker);
        } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
          const coords = feature.geometry.type === 'LineString' 
            ? feature.geometry.coordinates 
            : feature.geometry.coordinates.flat();
          const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));
          const polyline = L.polyline(latLngs, {
            color: '#fbbf24', // Bright yellow
            weight: 6,
            opacity: 0.9
          });
          highlightLayerRef.current.addLayer(polyline);
        } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          const coords = feature.geometry.type === 'Polygon' 
            ? feature.geometry.coordinates[0] 
            : feature.geometry.coordinates.flat()[0];
          const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));
          const polygon = L.polygon(latLngs, {
            color: '#fbbf24', // Bright yellow border
            weight: 4,
            fillColor: '#f59e0b', // Bright yellow fill
            fillOpacity: 0.4
          });
          highlightLayerRef.current.addLayer(polygon);
        }
      });
      
      // Add highlight layer to map
      if (highlightLayerRef.current) {
        try {
          map.addLayer(highlightLayerRef.current);
        } catch (error) {
          console.error('Error adding highlight layer to map:', error);
        }
      }
    } catch (error) {
      console.error('Error highlighting multiple features:', error);
    }
  }, [map]);
  
  // Expose highlight functions to parent component
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.highlightFeature = highlightFeature;
      mapRef.current.highlightMultipleFeatures = highlightMultipleFeatures;
    }
  }, [highlightFeature, highlightMultipleFeatures]);
  
  // Initialize draw tool at the top level (outside useEffect)
  const drawTool = useDrawTool(map, setSelectedFeatures, layerStates, setShowFeaturePopup);
  
  // Store draw tool in ref for toolbar access
  useEffect(() => {
    drawToolRef.current = drawTool;
  }, [drawTool, drawToolRef]);

  // Initialize measure tool
  const measureTool = useMeasureTool(map, setMessage);
  
  // Store measure tool in ref for toolbar access
  useEffect(() => {
    measureToolRef.current = measureTool;
  }, [measureTool, measureToolRef]);
  
  // Zoom level thresholds for different layers
  const ZOOM_THRESHOLDS = {
    bridges: 8,    // Show bridges at zoom level 8 and above
    conduits: 9,   // Show conduits at zoom level 9 and above
    roads: 7,      // Show roads at zoom level 7 and above
    boundaries: 6, // Show boundaries at zoom level 6 and above
    lighting: 10   // Show lighting at zoom level 10 and above
  };
  
  useEffect(() => {
    console.log('MapInitializer: Creating ODOT layers...');
    
    // Function to check if layer should be visible based on zoom level
    const shouldShowLayer = (layerType) => {
      const currentZoom = map.getZoom();
      const threshold = ZOOM_THRESHOLDS[layerType];
      return currentZoom >= threshold;
    };
    
    // Create ODOT Bridge Inventory Layer
    const bridgeLayer = esri.featureLayer({
      url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Assets/MapServer/5',
      maxFeatures: 50,
      useCors: true,
      // Only query when zoom level is appropriate
      where: shouldShowLayer('bridges') ? '1=1' : '1=0',
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 8,
          color: '#1e3a8a', // Dark blue border
          weight: 2,
          fillColor: '#3b82f6', // Blue fill
          fillOpacity: 0.8
        });
      },
      onEachFeature: function(feature, layer) {
        // Add hover tooltip showing SFN (Bridge ID)
        const sfn = feature.properties?.SFN || feature.properties?.OBJECTID || 'N/A';
        layer.bindTooltip(`Bridge SFN: ${sfn}`, {
          permanent: false,
          direction: 'top',
          className: 'feature-tooltip'
        });
        
        layer.on('click', function() {
          const featureWithLayer = {
            ...feature,
            layerName: 'bridges'
          };
          
          // If handleFeatureClick is provided (query mode), call it
          if (handleFeatureClick) {
            handleFeatureClick(featureWithLayer);
          } else {
            // Normal mode - set selected feature
            setSelectedFeature(featureWithLayer);
          }
        });
      }
    });

    // Create ODOT Conduit Inventory Layer
    const conduitLayer = esri.featureLayer({
      url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Assets/MapServer/4',
      maxFeatures: 50,
      useCors: true,
      // Only query when zoom level is appropriate
      where: shouldShowLayer('conduits') ? '1=1' : '1=0',
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          color: '#166534', // Dark green border
          weight: 2,
          fillColor: '#22c55e', // Green fill
          fillOpacity: 0.8
        });
      },
      onEachFeature: function(feature, layer) {
        // Add hover tooltip showing CFN (Conduit ID)
        const cfn = feature.properties?.CFN || feature.properties?.NLFID || feature.properties?.OBJECTID || 'N/A';
        layer.bindTooltip(`Conduit CFN: ${cfn}`, {
          permanent: false,
          direction: 'top',
          className: 'feature-tooltip'
        });
        
        layer.on('click', function() {
          const featureWithLayer = {
            ...feature,
            layerName: 'conduits'
          };
          
          // If handleFeatureClick is provided (query mode), call it
          if (handleFeatureClick) {
            handleFeatureClick(featureWithLayer);
          } else {
            // Normal mode - set selected feature
            setSelectedFeature(featureWithLayer);
          }
        });
      }
    });

    // Create ODOT Roads Layer (using Road Inventory service)
    console.log('MapInitializer: Creating roads layer with Roadway_Information/MapServer/8');
    const roadsLayer = esri.featureLayer({
      url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Roadway_Information/MapServer/8',
      maxFeatures: 50,
      useCors: true,
      simplifyFactor: 0.5,
      // Only query when zoom level is appropriate
      where: shouldShowLayer('roads') ? '1=1' : '1=0',
      fields: ['OBJECTID', 'STREET_NAME', 'JURISDICTION_CD', 'ROUTE_TYPE', 'COUNTY_CODE_LEFT', 'COUNTY_CODE_RIGHT', 'ADT_TOTAL_NBR', 'ROADWAY_WIDTH'],
      style: function(feature) {
        return {
          color: '#dc2626', // Red
          weight: 4,
          opacity: 1.0,
          fillColor: '#dc2626',
          fillOpacity: 0.3
        };
      },
      onEachFeature: function(feature, layer) {
        // Add hover tooltip showing NLF_ID (Road ID)
        const nlfId = feature.properties?.NLF_ID || feature.properties?.OBJECTID || 'N/A';
        layer.bindTooltip(`Road NLF_ID: ${nlfId}`, {
          permanent: false,
          direction: 'top',
          className: 'feature-tooltip'
        });
        
        layer.on('click', function() {
          const featureWithLayer = {
            ...feature,
            layerName: 'roads'
          };
          
          // If handleFeatureClick is provided (query mode), call it
          if (handleFeatureClick) {
            handleFeatureClick(featureWithLayer);
          } else {
            // Normal mode - set selected feature
            setSelectedFeature(featureWithLayer);
          }
        });
      }
    });



    // Create ODOT Boundaries Layer
    const boundariesLayer = esri.featureLayer({
      url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Boundaries/MapServer/1', // ODOT Districts layer
      maxFeatures: 50,
      useCors: true,
      simplifyFactor: 0.5,
      // Only query when zoom level is appropriate
      where: shouldShowLayer('boundaries') ? '1=1' : '1=0',
      fields: ['OBJECTID', 'ODOT_DISTRICT', 'ADDRESS', 'CITY', 'ZIP_CODE', 'TELEPHONE', 'AREA_SQMI'],
      style: function(feature) {
        // For polygon features, we need to return polygon-specific styling
        return {
          color: '#dc2626', // Red border
          weight: 3,
          opacity: 1.0,
          fillColor: '#dc2626', // Red fill
          fillOpacity: 0.3,
          fill: true // Ensure fill is enabled for polygons
        };
      },
      onEachFeature: function(feature, layer) {
        // Force the layer to be visible by setting style directly
        if (layer.setStyle) {
          layer.setStyle({
            color: '#dc2626',
            weight: 3,
            opacity: 1.0,
            fillColor: '#dc2626',
            fillOpacity: 0.3,
            fill: true
          });
        }
        
        layer.on('click', function() {
          const featureWithLayer = {
            ...feature,
            layerName: 'boundaries'
          };
          
          // If handleFeatureClick is provided (query mode), call it
          if (handleFeatureClick) {
            handleFeatureClick(featureWithLayer);
          } else {
            // Normal mode - set selected feature
            setSelectedFeature(featureWithLayer);
          }
        });
      }
    });

    // Create ODOT Highway Lighting Inventory Layer
    const lightingLayer = esri.featureLayer({
      url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Assets/MapServer/18',
      maxFeatures: 50,
      useCors: true,
      // Only query when zoom level is appropriate
      where: shouldShowLayer('lighting') ? '1=1' : '1=0',
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 5,
          color: '#f59e0b', // Amber border
          weight: 2,
          fillColor: '#fbbf24', // Light amber fill
          fillOpacity: 0.8
        });
      },
      onEachFeature: function(feature, layer) {
        // Add hover tooltip showing NLFID (Lighting ID)
        const nlfid = feature.properties?.NLFID || feature.properties?.POLE_ID || feature.properties?.OBJECTID || 'N/A';
        layer.bindTooltip(`Lighting NLFID: ${nlfid}`, {
          permanent: false,
          direction: 'top',
          className: 'feature-tooltip'
        });
        
        layer.on('click', function() {
          const featureWithLayer = {
            ...feature,
            layerName: 'lighting'
          };
          
          // If handleFeatureClick is provided (query mode), call it
          if (handleFeatureClick) {
            handleFeatureClick(featureWithLayer);
          } else {
            // Normal mode - set selected feature
            setSelectedFeature(featureWithLayer);
          }
        });
      }
    });

    // Add zoom event listener to re-query layers when zoom changes
    const handleZoomChange = () => {
      const currentZoom = map.getZoom();
      console.log(`Zoom level changed to: ${currentZoom}`);
      
      // Re-query layers based on new zoom level
      if (layersRef.current.bridgeLayer && layerStates.bridges) {
        const newWhere = shouldShowLayer('bridges') ? '1=1' : '1=0';
        layersRef.current.bridgeLayer.setWhere(newWhere);
      }
      
      if (layersRef.current.conduitLayer && layerStates.conduits) {
        const newWhere = shouldShowLayer('conduits') ? '1=1' : '1=0';
        layersRef.current.conduitLayer.setWhere(newWhere);
      }
      
      if (layersRef.current.roadsLayer && layerStates.roads) {
        const newWhere = shouldShowLayer('roads') ? '1=1' : '1=0';
        layersRef.current.roadsLayer.setWhere(newWhere);
      }
      
      if (layersRef.current.boundariesLayer && layerStates.boundaries) {
        const newWhere = shouldShowLayer('boundaries') ? '1=1' : '1=0';
        layersRef.current.boundariesLayer.setWhere(newWhere);
      }
      
      if (layersRef.current.lightingLayer && layerStates.lighting) {
        const newWhere = shouldShowLayer('lighting') ? '1=1' : '1=0';
        layersRef.current.lightingLayer.setWhere(newWhere);
      }
    };
    
    map.on('zoomend', handleZoomChange);
    
    // Add event listeners to track layer loading (console only)
    bridgeLayer.on('loading', () => {
      console.log('Bridge layer: Loading started');
    });
    bridgeLayer.on('load', () => {
      console.log('Bridge layer: Loading completed');
      console.log('Bridge layer loaded successfully');
    });
    bridgeLayer.on('error', (error) => {
      console.error('Bridge layer error:', error);
    });

    conduitLayer.on('loading', () => {
      console.log('Conduit layer: Loading started');
    });
    conduitLayer.on('load', () => {
      console.log('Conduit layer: Loading completed');
      console.log('Conduit layer loaded successfully');
    });
    conduitLayer.on('error', (error) => {
      console.error('Conduit layer error:', error);
    });

    roadsLayer.on('loading', () => {
      console.log('Roads layer: Loading started');
    });
    roadsLayer.on('load', () => {
      console.log('Roads layer: Loading completed');
      console.log('Roads layer loaded successfully');
    });
    roadsLayer.on('error', (error) => {
      console.error('Roads layer error:', error);
    });

    boundariesLayer.on('loading', () => {
      console.log('Boundaries layer: Loading started');
    });
    boundariesLayer.on('load', () => {
      console.log('Boundaries layer: Loading completed');
      console.log('Boundaries layer loaded successfully');
      console.log('Boundaries layer features count:', boundariesLayer.features ? boundariesLayer.features.length : 'Unknown');
    });
    boundariesLayer.on('error', (error) => {
      console.error('Boundaries layer error:', error);
    });

    lightingLayer.on('loading', () => {
      console.log('Lighting layer: Loading started');
    });
    lightingLayer.on('load', () => {
      console.log('Lighting layer: Loading completed');
      console.log('Lighting layer loaded successfully');
    });
    lightingLayer.on('error', (error) => {
      console.error('Lighting layer error:', error);
    });



    // Store layers in ref for management
    layersRef.current = {
      bridges: bridgeLayer,
      conduits: conduitLayer,
      roads: roadsLayer,
      boundaries: boundariesLayer,
      lighting: lightingLayer
    };
    
    // Also store in the layerRefs prop for query functionality
    if (layerRefs) {
      layerRefs.current = {
        bridges: bridgeLayer,
        conduits: conduitLayer,
        roads: roadsLayer,
        boundaries: boundariesLayer,
        lighting: lightingLayer
      };
    }

    console.log('MapInitializer: ODOT layers created and stored in ref');
    console.log('MapInitializer: Layer refs:', layersRef.current);
    

    
    // Add initial layers based on layerStates
    if (layerStates.roads) {
      console.log('MapInitializer: Adding roads layer initially');
      roadsLayer.addTo(map);
      console.log('MapInitializer: Roads layer added to map, checking if visible:', map.hasLayer(roadsLayer));
    }

    if (layerStates.bridges) {
      console.log('MapInitializer: Adding bridges layer initially');
      bridgeLayer.addTo(map);
    }
    if (layerStates.conduits) {
      console.log('MapInitializer: Adding conduits layer initially');
      conduitLayer.addTo(map);
    }
    if (layerStates.boundaries) {
      console.log('MapInitializer: Adding boundaries layer initially');
      boundariesLayer.addTo(map);
    }
    
    if (layerStates.lighting) {
      console.log('MapInitializer: Adding lighting layer initially');
      lightingLayer.addTo(map);
    }





    // Cleanup function
    return () => {
      console.log('MapInitializer: Cleaning up layers');
      
      // Remove zoom event listener
      map.off('zoomend', handleZoomChange);
      
      // Remove all layers from map
      Object.values(layersRef.current).forEach(layer => {
        if (layer && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      
      // Clear layer references
      layersRef.current = {};
      if (layerRefs) {
        layerRefs.current = {};
      }
      
      // Clear highlight layer
      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
    };
  }, [map, layerStates, handleFeatureClick, setSelectedFeature, layerRefs]);

  // Handle layer visibility changes
  useEffect(() => {
    console.log('MapInitializer: Layer states changed:', layerStates);
    
    Object.entries(layersRef.current).forEach(([key, layer]) => {
      if (layer) {
        const shouldBeVisible = layerStates[key];
        const isCurrentlyVisible = map.hasLayer(layer);
        
        console.log(`Layer ${key}: shouldBeVisible=${shouldBeVisible}, isCurrentlyVisible=${isCurrentlyVisible}`);
        
        if (shouldBeVisible && !isCurrentlyVisible) {
          console.log(`Adding ${key} layer to map`);
          layer.addTo(map);
        } else if (!shouldBeVisible && isCurrentlyVisible) {
          console.log(`Removing ${key} layer from map`);
          map.removeLayer(layer);
        }
      }
    });
  }, [layerStates, map]);

  return null;
}

// Simple Draw Tool Hook (without Leaflet Draw plugin)
function useDrawTool(map, setSelectedFeatures, layerStates, setShowFeaturePopup) {
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef(null);
  const rectangleRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    let isCurrentlyDrawing = false;
    let wasDraggingEnabled = true;

    const onMouseDown = (e) => {
      console.log('Draw tool: onMouseDown called, isDrawing:', isDrawing);
      if (!isDrawing) return;
      
      // Prevent default map panning
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      isCurrentlyDrawing = true;
      startPointRef.current = e.latlng;
      
      // Disable map dragging during drawing
      wasDraggingEnabled = map.dragging.enabled();
      map.dragging.disable();
      
      // Change cursor to indicate drawing mode
      map.getContainer().style.cursor = 'crosshair';
      
      // Create a rectangle that will be updated on mouse move
      rectangleRef.current = L.rectangle([e.latlng, e.latlng], {
        color: '#3b82f6',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        dashArray: '5, 5'
      });
      rectangleRef.current.addTo(map);
    };

    const onMouseMove = (e) => {
      if (!isCurrentlyDrawing || !startPointRef.current) return;
      
      // Prevent default map panning during drawing
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      // Update rectangle bounds
      const bounds = L.latLngBounds(startPointRef.current, e.latlng);
      rectangleRef.current.setBounds(bounds);
    };

    const onMouseUp = (e) => {
      if (!isCurrentlyDrawing || !startPointRef.current) return;
      
      // Prevent default map panning
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      isCurrentlyDrawing = false;
      const endPoint = e.latlng;
      
      // Create final bounds
      const bounds = L.latLngBounds(startPointRef.current, endPoint);
      
      // Check if the rectangle is too small (less than 10 pixels)
      const startPixel = map.latLngToContainerPoint(startPointRef.current);
      const endPixel = map.latLngToContainerPoint(endPoint);
      const width = Math.abs(endPixel.x - startPixel.x);
      const height = Math.abs(endPixel.y - startPixel.y);
      
      if (width < 10 || height < 10) {
        // Rectangle too small, remove it and don't query
        if (rectangleRef.current && map.hasLayer(rectangleRef.current)) {
          map.removeLayer(rectangleRef.current);
        }
        // Reset cursor
        map.getContainer().style.cursor = '';
        // Re-enable map dragging
        if (wasDraggingEnabled) {
          map.dragging.enable();
        }
        setIsDrawing(false);
        return;
      }
      
      // Query features within the bounds
      queryFeaturesInBounds(bounds, setSelectedFeatures, layerStates, setShowFeaturePopup);
      
      // Change rectangle style to indicate selection
      rectangleRef.current.setStyle({
        color: '#10b981',
        weight: 3,
        fillColor: '#10b981',
        fillOpacity: 0.3,
        dashArray: null
      });
      
      // Remove the rectangle after a longer delay to show selection
      setTimeout(() => {
        if (rectangleRef.current && map.hasLayer(rectangleRef.current)) {
          map.removeLayer(rectangleRef.current);
        }
      }, 5000);
      
      // Reset cursor
      map.getContainer().style.cursor = '';
      
      // Re-enable map dragging
      if (wasDraggingEnabled) {
        map.dragging.enable();
      }
      
      // Reset drawing state
      setIsDrawing(false);
    };

    // Add event listeners
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      if (rectangleRef.current && map.hasLayer(rectangleRef.current)) {
        map.removeLayer(rectangleRef.current);
      }
      // Reset cursor
      map.getContainer().style.cursor = '';
    };
  }, [map, isDrawing]);

  const startDrawing = () => {
    console.log('Draw tool: startDrawing called');
    setIsDrawing(true);
    console.log('Draw tool: isDrawing set to true');
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (rectangleRef.current && map.hasLayer(rectangleRef.current)) {
      map.removeLayer(rectangleRef.current);
    }
    if (map) {
      map.getContainer().style.cursor = '';
    }
  };

  return { startDrawing, stopDrawing, isDrawing };
}

// Enhanced Measure Tool Hook with Line and Area Measurement
function useMeasureTool(map, setMessage) {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureMode, setMeasureMode] = useState('line'); // 'line' or 'area'
  const isMeasuringRef = useRef(false);
  const isDoubleClickingRef = useRef(false);
  const measureLayerRef = useRef(null);
  const measurePointsRef = useRef([]);
  const measureLineRef = useRef(null);
  const measurePolygonRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create a layer group for measurements
    measureLayerRef.current = L.layerGroup().addTo(map);
    Logger.debug('Enhanced measure tool initialized');

    return () => {
      if (measureLayerRef.current) {
        map.removeLayer(measureLayerRef.current);
      }
    };
  }, [map]);

  const startMeasuring = (mode = 'line') => {
    Logger.debug(`Enhanced measure tool: startMeasuring called for ${mode}`);
    setIsMeasuring(true);
    setMeasureMode(mode);
    isMeasuringRef.current = true;
    isDoubleClickingRef.current = false;
    measurePointsRef.current = [];
    
    setMessage(`📏 Measure Tool (${mode}): Click to add vertices, double-click to finish`);
    Logger.debug(`Enhanced measure tool activated for ${mode}`);
  };

  const stopMeasuring = () => {
    Logger.debug('Enhanced measure tool: stopMeasuring called');
    setIsMeasuring(false);
    isMeasuringRef.current = false;
    isDoubleClickingRef.current = false;
    measurePointsRef.current = [];
    if (measureLineRef.current) {
      measureLayerRef.current.removeLayer(measureLineRef.current);
      measureLineRef.current = null;
    }
    if (measurePolygonRef.current) {
      measureLayerRef.current.removeLayer(measurePolygonRef.current);
      measurePolygonRef.current = null;
    }
    setMessage('Measure Tool: Stopped');
    Logger.debug('Enhanced measure tool deactivated');
  };

  const clearMeasurements = () => {
    Logger.debug('Enhanced measure tool: clearMeasurements called');
    if (measureLayerRef.current) {
      measureLayerRef.current.clearLayers();
    }
    measurePointsRef.current = [];
    measureLineRef.current = null;
    measurePolygonRef.current = null;
    isDoubleClickingRef.current = false;
    setMessage('All measurements cleared');
  };

  // Add map click handler for measuring
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (e) => {
      if (!isMeasuringRef.current || isDoubleClickingRef.current) return;
      
      Logger.debug('Map clicked for measuring at:', e.latlng);
      const point = e.latlng;
      measurePointsRef.current.push(point);
      
      // Add point marker
      const marker = L.circleMarker(point, {
        radius: 6,
        fillColor: measureMode === 'line' ? '#3b82f6' : '#10b981',
        color: measureMode === 'line' ? '#2563eb' : '#059669',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(measureLayerRef.current);
      
      // Add point number label
      const label = L.divIcon({
        className: 'measure-point-label',
        html: `<div style="background: ${measureMode === 'line' ? '#3b82f6' : '#10b981'}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px; font-weight: bold;">${measurePointsRef.current.length}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      L.marker(point, { icon: label }).addTo(measureLayerRef.current);
      
      if (measureMode === 'line') {
        // Draw line between points
        if (measurePointsRef.current.length > 1) {
          if (measureLineRef.current) {
            measureLayerRef.current.removeLayer(measureLineRef.current);
          }
          
          measureLineRef.current = L.polyline(measurePointsRef.current, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 5'
          }).addTo(measureLayerRef.current);
        }
        
        // Calculate and display distance
        if (measurePointsRef.current.length > 1) {
          const { miles, feet } = calculateDistance(measurePointsRef.current);
          Logger.debug('Calculated distance:', { miles, feet });
          setMessage(`📏 Line: ${miles.toFixed(3)} miles (${feet.toLocaleString()} feet) - ${measurePointsRef.current.length} points - Double-click to finish`);
        } else if (measurePointsRef.current.length === 1) {
          setMessage('📏 Line Measure: Click to add more vertices, double-click to finish');
        }
      } else {
        // Area measurement
        if (measurePointsRef.current.length > 2) {
          if (measurePolygonRef.current) {
            measureLayerRef.current.removeLayer(measurePolygonRef.current);
          }
          
          // Create polygon with all points
          const polygonPoints = [...measurePointsRef.current];
          measurePolygonRef.current = L.polygon(polygonPoints, {
            color: '#10b981',
            weight: 3,
            opacity: 0.8,
            fillColor: '#10b981',
            fillOpacity: 0.2
          }).addTo(measureLayerRef.current);
          
          // Calculate area
          const { acres, sqMiles } = calculateArea(polygonPoints);
          setMessage(`📐 Area: ${acres.toFixed(2)} acres (${sqMiles.toFixed(6)} sq miles) - ${measurePointsRef.current.length} points - Double-click to finish`);
        } else if (measurePointsRef.current.length === 1) {
          setMessage('📐 Area Measure: Click to add more vertices, double-click to finish');
        } else if (measurePointsRef.current.length === 2) {
          setMessage('📐 Area Measure: Need at least 3 points for area calculation');
        }
      }
    };

    const handleMapDoubleClick = (e) => {
      if (!isMeasuringRef.current) return;
      
      // Set flag to prevent click handler from adding extra point
      isDoubleClickingRef.current = true;
      
      Logger.debug('Map double-clicked, finishing measurement');
      
      if (measureMode === 'line') {
        // Calculate final distance
        if (measurePointsRef.current.length > 1) {
          const { miles, feet } = calculateDistance(measurePointsRef.current);
          Logger.debug('Final distance:', { miles, feet });
          setMessage(`📏 LINE MEASUREMENT COMPLETE: ${miles.toFixed(3)} miles (${feet.toLocaleString()} feet) - ${measurePointsRef.current.length} points`);
        } else {
          setMessage('❌ Line measurement requires at least 2 points');
        }
      } else {
        // Calculate final area
        if (measurePointsRef.current.length > 2) {
          const { acres, sqMiles } = calculateArea(measurePointsRef.current);
          Logger.debug('Final area:', { acres, sqMiles });
          setMessage(`📐 AREA MEASUREMENT COMPLETE: ${acres.toFixed(2)} acres (${sqMiles.toFixed(6)} sq miles) - ${measurePointsRef.current.length} points`);
        } else {
          setMessage('❌ Area measurement requires at least 3 points');
        }
      }
      
      // Stop measuring but keep the measurement visible
      setIsMeasuring(false);
      isMeasuringRef.current = false;
      Logger.debug('Measurement finished - remains visible');
      
      // Reset double-click flag after a short delay
      setTimeout(() => {
        isDoubleClickingRef.current = false;
      }, 100);
    };

    // Always add event listeners, but only process events when measuring
    map.on('click', handleMapClick);
    map.on('dblclick', handleMapDoubleClick);

    return () => {
      // Clean up event listeners
      map.off('click', handleMapClick);
      map.off('dblclick', handleMapDoubleClick);
    };
  }, [map, setMessage, measureMode]);

  // Helper function to calculate distance
  const calculateDistance = (points) => {
    if (points.length < 2) return { miles: 0, feet: 0 };
    
    Logger.debug('Calculating distance for points count:', points.length);
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const distance = points[i-1].distanceTo(points[i]);
      Logger.debug(`Distance from point ${i-1} to ${i}:`, { distance, unit: 'meters' });
      totalDistance += distance;
    }
    
    // Convert meters to miles and feet
    const miles = totalDistance * 0.000621371;
    const feet = totalDistance * 3.28084;
    Logger.debug('Total distance:', { totalDistance, unit: 'meters', miles, feet });
    return { miles, feet };
  };

  // Helper function to calculate area
  const calculateArea = (points) => {
    if (points.length < 3) return { acres: 0, sqMiles: 0 };
    
    Logger.debug('Calculating area for points count:', points.length);
    
    // Use a more accurate area calculation method
    let area = 0;
    const n = points.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].lng * points[j].lat;
      area -= points[j].lng * points[i].lat;
    }
    
    area = Math.abs(area) / 2;
    
    // Convert to square meters using Earth's radius
    const earthRadius = 6371000; // meters
    const areaInSqMeters = area * (Math.PI / 180) * (Math.PI / 180) * earthRadius * earthRadius;
    
    // Convert to acres and square miles
    const acres = areaInSqMeters * 0.000247105;
    const sqMiles = areaInSqMeters * 3.86102e-7;
    
    Logger.debug('Total area:', { areaInSqMeters, unit: 'sq meters', acres, sqMiles });
    return { acres, sqMiles };
  };

  return { 
    startMeasuring, 
    stopMeasuring, 
    clearMeasurements, 
    isMeasuring,
    measureMode,
    setMeasureMode
  };
}

// Function to query features within bounds (Performance Optimized)
function queryFeaturesInBounds(bounds, setSelectedFeatures, layerStates, setShowFeaturePopup) {
  console.log('queryFeaturesInBounds called with bounds:', bounds);
  console.log('Current layer states:', layerStates);
  
  // Query all layers that are toggled on in the layer states
  const visibleLayers = [
    { name: 'bridges', url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Assets/MapServer/5', visible: layerStates.bridges },
    { name: 'conduits', url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Assets/MapServer/4', visible: layerStates.conduits },
    { name: 'roads', url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Roadway_Information/MapServer/8', visible: layerStates.roads },
    { name: 'boundaries', url: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Boundaries/MapServer/1', visible: layerStates.boundaries }
  ].filter(layer => layer.visible);

  console.log('Layer states:', layerStates);
  console.log('Layers to query:', visibleLayers.map(l => `${l.name}: ${l.visible}`));

  if (visibleLayers.length === 0) {
    console.log('No visible layers to query');
    setSelectedFeatures([]);
    setShowFeaturePopup(true);
    return;
  }

  console.log('Visible layers to query:', visibleLayers.map(l => l.name));

  console.log('Querying bounds:', {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth()
  });

  const queryPromises = visibleLayers.map(layer => {
    // Try using ESRI Leaflet's query method first
    const layerQuery = esri.query({
      url: layer.url,
      maxFeatures: 100
    });
    
    console.log(`Querying ${layer.name} layer with ESRI Leaflet query`);
    
    return new Promise((resolve) => {
      layerQuery.within(bounds).run((error, featureCollection) => {
        if (error) {
          console.error(`ESRI Leaflet query error for ${layer.name}:`, error);
          // Fall back to fetch approach
          resolve(fetchQuery(layer, bounds));
        } else {
          console.log(`${layer.name} ESRI Leaflet query result:`, featureCollection);
          if (featureCollection && featureCollection.features && featureCollection.features.length > 0) {
            console.log(`${layer.name} found ${featureCollection.features.length} features with ESRI Leaflet`);
            resolve(featureCollection.features.map(feature => ({
              ...feature,
              layerName: layer.name
            })));
          } else {
            console.log(`${layer.name} no features found with ESRI Leaflet, trying fetch fallback`);
            resolve(fetchQuery(layer, bounds));
          }
        }
      });
    });
  });

  Promise.all(queryPromises)
    .then(results => {
      const allFeatures = results.flat();
      console.log('All features found:', allFeatures.length, allFeatures);
      setSelectedFeatures(allFeatures);
      setShowFeaturePopup(true);
    })
    .catch(error => {
      console.error('Error querying features:', error);
      setSelectedFeatures([]);
      setShowFeaturePopup(true);
    });
}

// Original fetchQuery function for backward compatibility
function fetchQuery(layer, bounds) {
  return fetchQueryEnhanced(layer, bounds, 10); // Default to normal zoom level
}

// Helper function to check if a line intersects with a rectangle
function lineIntersectsRectangle(line, bounds) {
  const rect = {
    minX: bounds.getWest(),
    minY: bounds.getSouth(),
    maxX: bounds.getEast(),
    maxY: bounds.getNorth()
  };
  
  console.log('Checking line intersection with bounds:', {
    lineLength: line.length,
    bounds: rect,
    lineCoords: line.slice(0, 3) // Show first 3 coordinates for debugging
  });
  
  // First, check if any point of the line is inside the rectangle
  for (let i = 0; i < line.length; i++) {
    const point = { x: line[i][0], y: line[i][1] };
    if (pointInRectangle(point, rect)) {
      console.log(`Point ${i} is inside rectangle:`, point);
      return true;
    }
  }
  
  // Then check each line segment for intersection with rectangle edges
  for (let i = 0; i < line.length - 1; i++) {
    const p1 = { x: line[i][0], y: line[i][1] };
    const p2 = { x: line[i + 1][0], y: line[i + 1][1] };
    
    // Check if line segment intersects with any of the rectangle edges
    if (lineSegmentIntersectsRectangle(p1, p2, rect)) {
      console.log(`Line segment ${i} intersects rectangle:`, { p1, p2 });
      return true;
    }
  }
  
  console.log('Line does not intersect rectangle');
  return false;
}

// Helper function to check if a line segment intersects with a rectangle
function lineSegmentIntersectsRectangle(p1, p2, rect) {
  // Check if either endpoint is inside the rectangle
  if (pointInRectangle(p1, rect) || pointInRectangle(p2, rect)) {
    return true;
  }
  
  // Check intersection with rectangle edges
  const edges = [
    [{ x: rect.minX, y: rect.minY }, { x: rect.maxX, y: rect.minY }], // bottom
    [{ x: rect.maxX, y: rect.minY }, { x: rect.maxX, y: rect.maxY }], // right
    [{ x: rect.maxX, y: rect.maxY }, { x: rect.minX, y: rect.maxY }], // top
    [{ x: rect.minX, y: rect.maxY }, { x: rect.minX, y: rect.minY }]  // left
  ];
  
  for (const edge of edges) {
    if (lineSegmentsIntersect(p1, p2, edge[0], edge[1])) {
      return true;
    }
  }
  
  return false;
}

// Helper function to check if a point is inside a rectangle
function pointInRectangle(point, rect) {
  return point.x >= rect.minX && point.x <= rect.maxX && 
         point.y >= rect.minY && point.y <= rect.maxY;
}

// Helper function to check if two line segments intersect
function lineSegmentsIntersect(p1, p2, p3, p4) {
  const ccw = (A, B, C) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  };
  
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && 
         ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

// Helper function to check if a polygon intersects with a rectangle
function polygonIntersectsRectangle(polygon, bounds) {
  const rect = {
    minX: bounds.getWest(),
    minY: bounds.getSouth(),
    maxX: bounds.getEast(),
    maxY: bounds.getNorth()
  };
  
  // Check if any polygon edge intersects with rectangle edges
  for (let i = 0; i < polygon.length - 1; i++) {
    const p1 = { x: polygon[i][0], y: polygon[i][1] };
    const p2 = { x: polygon[i + 1][0], y: polygon[i + 1][1] };
    
    if (lineSegmentIntersectsRectangle(p1, p2, rect)) {
      return true;
    }
  }
  
  // Check if rectangle is completely inside polygon (rare case)
  const rectCorners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY }
  ];
  
  return rectCorners.every(corner => pointInPolygon(corner, polygon));
}

// Helper function to check if a point is inside a polygon (ray casting algorithm)
function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    if (((yi > point.y) !== (yj > point.y)) && 
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}



// Helper function for fetch-based queries
function fetchQueryEnhanced(layer, bounds, zoomLevel) {
  console.log(`Enhanced fetch querying ${layer.name} layer at zoom level ${zoomLevel}`);
  
  // For lower zoom levels, use different strategies
  let queryUrl;
  
  if (zoomLevel < 8) {
    // Very low zoom - get all features and filter client-side
    queryUrl = `${layer.url}/query?f=json&outFields=*&returnGeometry=true&maxRecordCount=1000&limit=1000&where=1%3D1`;
    console.log(`Very low zoom (${zoomLevel}), using broad query for ${layer.name}`);
  } else if (zoomLevel < 10) {
    // Low zoom - use a larger bounding box to ensure we get features
    const boundsExpansion = 0.1; // Expand bounds by 10%
    const expandedBounds = {
      xmin: bounds.getWest() - boundsExpansion,
      ymin: bounds.getSouth() - boundsExpansion,
      xmax: bounds.getEast() + boundsExpansion,
      ymax: bounds.getNorth() + boundsExpansion
    };
    queryUrl = `${layer.url}/query?f=json&outFields=*&returnGeometry=true&maxRecordCount=500&limit=500&geometry=${encodeURIComponent(JSON.stringify(expandedBounds))}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects`;
    console.log(`Low zoom (${zoomLevel}), using expanded bounds query for ${layer.name}`);
  } else {
    // Normal zoom - use slightly expanded spatial query to ensure we get all intersecting features
    const expansion = 0.001; // Expand bounds by ~100 meters
    queryUrl = `${layer.url}/query?f=json&outFields=*&returnGeometry=true&maxRecordCount=500&limit=500&geometry=${encodeURIComponent(JSON.stringify({
      xmin: bounds.getWest() - expansion,
      ymin: bounds.getSouth() - expansion,
      xmax: bounds.getEast() + expansion,
      ymax: bounds.getNorth() + expansion
    }))}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects`;
    console.log(`Normal zoom (${zoomLevel}), using expanded spatial query for ${layer.name}`);
  }
  
  console.log(`Enhanced fetch querying ${layer.name} layer:`, queryUrl);

  return fetch(queryUrl, { 
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(15000) // 15 second timeout
  })
  .then(response => {
    console.log(`${layer.name} response status:`, response.status);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(`${layer.name} data:`, data);
    console.log(`${layer.name} response details:`, {
      error: data.error,
      messages: data.messages,
      exceededTransferLimit: data.exceededTransferLimit,
      features: data.features ? data.features.length : 0
    });
    
    if (data.features && data.features.length > 0) {
      console.log(`${layer.name} found ${data.features.length} features total`);
      
      // Always apply client-side filtering to ensure accurate intersection detection
      let filteredFeatures = data.features;
      console.log(`Filtering ${data.features.length} features client-side for accurate intersection detection`);
      console.log(`Sample features from ${layer.name}:`, data.features.slice(0, 3).map(f => ({
        OBJECTID: f.properties?.OBJECTID,
        geometryType: f.geometry?.type,
        coordCount: f.geometry?.coordinates?.length || 0
      })));
      
      filteredFeatures = data.features.filter(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          const geometryType = feature.geometry.type;
          const coordinates = feature.geometry.coordinates;
          
          if (geometryType === 'Point') {
            const [lon, lat] = coordinates;
            const inBounds = lon >= bounds.getWest() && lon <= bounds.getEast() && 
                   lat >= bounds.getSouth() && lat <= bounds.getNorth();
            return inBounds;
          } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
            const lineCoords = geometryType === 'LineString' ? [coordinates] : coordinates;
            const inBounds = lineCoords.some(line => {
              // Check if any point is within bounds
              const hasPointInBounds = line.some(point => {
                const [lon, lat] = point;
                return lon >= bounds.getWest() && lon <= bounds.getEast() && 
                       lat >= bounds.getSouth() && lat <= bounds.getNorth();
              });
              
              // Check if line intersects with rectangle bounds
              const intersectsBounds = lineIntersectsRectangle(line, bounds);
              
              return hasPointInBounds || intersectsBounds;
            });
            return inBounds;
          } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
            const polygonCoords = geometryType === 'Polygon' ? [coordinates] : coordinates;
            const inBounds = polygonCoords.some(polygon => {
              // Check if any point is within bounds
              const hasPointInBounds = polygon.some(point => {
                const [lon, lat] = point;
                return lon >= bounds.getWest() && lon <= bounds.getEast() && 
                       lat >= bounds.getSouth() && lat <= bounds.getNorth();
              });
              
              // Check if polygon intersects with rectangle bounds
              const intersectsBounds = polygonIntersectsRectangle(polygon, bounds);
              
              return hasPointInBounds || intersectsBounds;
            });
            return inBounds;
          }
        }
        return false;
      });
      console.log(`${layer.name} filtered to ${filteredFeatures.length} features within bounds (${data.features.length - filteredFeatures.length} filtered out)`);
      
      return filteredFeatures.map(feature => ({
        ...feature,
        layerName: layer.name
      }));
    }
    console.log(`${layer.name} no features found`);
    return [];
  })
  .catch(error => {
    console.error(`Error querying ${layer.name} layer:`, error);
    // Try fallback query without spatial filter
    console.log(`Trying fallback query for ${layer.name} without spatial filter`);
    const fallbackUrl = `${layer.url}/query?f=json&outFields=*&returnGeometry=true&maxRecordCount=500&limit=500&where=1%3D1`;
    
    return fetch(fallbackUrl, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })
    .then(response => {
      console.log(`${layer.name} fallback response status:`, response.status);
      return response.json();
    })
    .then(data => {
      console.log(`${layer.name} fallback data:`, data);
      console.log(`${layer.name} fallback response details:`, {
        error: data.error,
        messages: data.messages,
        exceededTransferLimit: data.exceededTransferLimit,
        features: data.features ? data.features.length : 0
      });
      
      if (data.features && data.features.length > 0) {
        console.log(`${layer.name} fallback found ${data.features.length} features total`);
        
        // Filter features that fall within our bounds
        const filteredFeatures = data.features.filter(feature => {
          if (feature.geometry && feature.geometry.coordinates) {
            const geometryType = feature.geometry.type;
            const coordinates = feature.geometry.coordinates;
            
            if (geometryType === 'Point') {
              const [lon, lat] = coordinates;
              const inBounds = lon >= bounds.getWest() && lon <= bounds.getEast() && 
                     lat >= bounds.getSouth() && lat <= bounds.getNorth();
              return inBounds;
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
              const lineCoords = geometryType === 'LineString' ? [coordinates] : coordinates;
              const inBounds = lineCoords.some(line => {
                // Check if any point is within bounds
                const hasPointInBounds = line.some(point => {
                  const [lon, lat] = point;
                  return lon >= bounds.getWest() && lon <= bounds.getEast() && 
                         lat >= bounds.getSouth() && lat <= bounds.getNorth();
                });
                
                // Check if line intersects with rectangle bounds
                const intersectsBounds = lineIntersectsRectangle(line, bounds);
                
                // Additional simple check: if line bounding box overlaps with selection bounds
                let lineBoundingBox = null;
                if (line.length > 0) {
                  const lons = line.map(p => p[0]);
                  const lats = line.map(p => p[1]);
                  lineBoundingBox = {
                    minLon: Math.min(...lons),
                    maxLon: Math.max(...lons),
                    minLat: Math.min(...lats),
                    maxLat: Math.max(...lats)
                  };
                }
                
                const boundingBoxOverlaps = lineBoundingBox && 
                  lineBoundingBox.minLon <= bounds.getEast() && 
                  lineBoundingBox.maxLon >= bounds.getWest() && 
                  lineBoundingBox.minLat <= bounds.getNorth() && 
                  lineBoundingBox.maxLat >= bounds.getSouth();
                
                if (hasPointInBounds || intersectsBounds || boundingBoxOverlaps) {
                  console.log(`Line feature ${feature.properties?.OBJECTID || 'unknown'} intersects bounds:`, {
                    hasPointInBounds,
                    intersectsBounds,
                    boundingBoxOverlaps,
                    lineLength: line.length,
                    lineBoundingBox,
                    bounds: {
                      west: bounds.getWest(),
                      south: bounds.getSouth(),
                      east: bounds.getEast(),
                      north: bounds.getNorth()
                    }
                  });
                }
                
                return hasPointInBounds || intersectsBounds || boundingBoxOverlaps;
              });
              return inBounds;
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
              const polyCoords = geometryType === 'Polygon' ? [coordinates] : coordinates;
              const inBounds = polyCoords.some(polygon => {
                // Check if any vertex is within bounds
                const hasVertexInBounds = polygon[0].some(point => {
                  const [lon, lat] = point;
                  return lon >= bounds.getWest() && lon <= bounds.getEast() && 
                         lat >= bounds.getSouth() && lat <= bounds.getNorth();
                });
                
                // Check if polygon intersects with rectangle bounds
                const intersectsBounds = polygonIntersectsRectangle(polygon[0], bounds);
                
                return hasVertexInBounds || intersectsBounds;
              });
              console.log(`${layer.name} POLYGON feature ${feature.properties?.OBJECTID}: inBounds=${inBounds}`);
              return inBounds;
            }
          }
          return false;
        });
        
        console.log(`${layer.name} fallback filtered to ${filteredFeatures.length} features in bounds`);
        return filteredFeatures.map(feature => ({
          ...feature,
          layerName: layer.name
        }));
      }
      return [];
    })
    .catch(fallbackError => {
      console.error(`Fallback query also failed for ${layer.name}:`, fallbackError);
      return [];
    });
  });
}

// Comprehensive Toolbar Component
function Toolbar({ layerStates, setLayerStates, basemap, setBasemap, setSelectedFeatures, drawToolRef, measureToolRef, setMessage, layerRefs, filterMode, setFilterMode, showFilterPopup, setShowFilterPopup, selectedFilterLayer, setSelectedFilterLayer, filterFields, setFilterFields, selectedFilterField, setSelectedFilterField, filterValues, setFilterValues, selectedFilterValue, setSelectedFilterValue, filterResults, setFilterResults, executeFilter, getLayerFields, getActualLayerFields, getFieldValues, isLoadingValues }) {
  const [activeTab, setActiveTab] = useState('layers');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTool, setActiveTool] = useState(null);

  const startDrawing = () => {
    console.log('Toolbar: startDrawing called');
    console.log('Toolbar: drawToolRef.current:', drawToolRef.current);
    console.log('Toolbar: drawToolRef.current.startDrawing:', drawToolRef.current?.startDrawing);
    
    if (drawToolRef.current && drawToolRef.current.startDrawing) {
      console.log('Toolbar: Calling drawToolRef.current.startDrawing()');
      drawToolRef.current.startDrawing();
      setActiveTool('draw');
      setMessage('Draw Select: Click and drag to draw a selection rectangle');
      console.log('Toolbar: startDrawing completed');
    } else {
      console.log('Toolbar: Draw tool not available');
      setMessage('Draw Tool: Tool not available');
    }
  };

  const startMeasuring = (mode = 'line') => {
    console.log('Toolbar: startMeasuring called for mode:', mode);
    console.log('measureToolRef.current:', measureToolRef.current);

    
    if (measureToolRef.current && measureToolRef.current.startMeasuring) {
      console.log('Calling measureToolRef.current.startMeasuring() with mode:', mode);
      measureToolRef.current.startMeasuring(mode);
      setActiveTool(`measure-${mode}`);
      setMessage(`Measure Tool (${mode}): Click on map to start measuring, double-click to finish`);
    } else {
      console.log('Measure tool not available');
      setMessage('Measure Tool: Tool not available');
    }
  };

  const startFilter = () => {
    console.log('Toolbar: startFilter called');
    console.log('Toolbar: Current activeTool before:', activeTool);
    console.log('Toolbar: Current filterMode before:', filterMode);
    setFilterMode(true);
    setActiveTool('filter');
    setShowFilterPopup(true);
    setMessage('Filter Tool: Select a layer and field to filter by');
    console.log('Toolbar: startFilter completed');
  };

  const stopFilter = () => {
    setFilterMode(false);
    setActiveTool(null);
    setShowFilterPopup(false);
    setSelectedFilterLayer('');
    setFilterFields([]);
    setSelectedFilterField('');
    setFilterValues([]);
    setSelectedFilterValue('');
    setFilterResults([]);
    setMessage('Filter tool stopped');
  };



  const clearAll = () => {
    console.log('Toolbar: clearAll called');
    console.log('Toolbar: clearAll - Current activeTool:', activeTool);
    console.log('Toolbar: clearAll - Current filterMode:', filterMode);
    console.log('Toolbar: clearAll - Current activeTab:', activeTab);
    console.trace('Toolbar: clearAll stack trace');
    
    // Clear measurements
    if (measureToolRef.current && measureToolRef.current.clearMeasurements) {
      console.log('Clearing measurements');
      measureToolRef.current.clearMeasurements();
    }
    
    // Stop any active tools
    if (activeTool === 'draw' && drawToolRef.current?.stopDrawing) {
      console.log('Stopping draw tool');
      drawToolRef.current.stopDrawing();
    }
    
    if ((activeTool === 'measure-line' || activeTool === 'measure-area') && measureToolRef.current?.stopMeasuring) {
      console.log('Stopping measure tool');
      measureToolRef.current.stopMeasuring();
    }
    
    if (activeTool === 'filter') {
      console.log('Stopping filter tool');
      stopFilter();
    }
    
    // Clear selected features
    setSelectedFeatures([]);
    
    // Clear highlights using secure map service
    MapService.highlightFeature(null);
    
    // If on layers tab, uncheck all layers
    if (activeTab === 'layers') {
      Logger.debug('On layers tab - unchecking all layers');
      setLayerStates({
        roads: false,
        bridges: false,
        conduits: false,
        boundaries: false
      });
      setMessage('All tools cleared and all layers unchecked');
    } else {
      setMessage('All tools cleared');
    }
    
    // Reset active tool
    setActiveTool(null);
  };

  return (
    <div className="toolbar">
      {/* Toolbar Header */}
      <div className="toolbar-header">
        <div className="toolbar-title">
          <i className="toolbar-icon">⚙️</i>
        </div>
        <button 
          className="toolbar-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Toolbar" : "Expand Toolbar"}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Toolbar Content */}
      {isExpanded && (
        <div className="toolbar-content">
          {/* Universal Clear All Button - Always visible */}
          <div className="universal-clear-section">
            <button 
              className="universal-clear-button" 
              title="Clear All (Measurements, Selection, Stop Tools)"
              onClick={clearAll}
            >
              <i className="clear-icon">🗑️</i>
              <span>Clear All</span>
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="toolbar-tabs">
            <button 
              className={`toolbar-tab ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              <i className="tab-icon">📊</i>
              Layers
            </button>
            <button 
              className={`toolbar-tab ${activeTab === 'basemaps' ? 'active' : ''}`}
              onClick={() => setActiveTab('basemaps')}
            >
              <i className="tab-icon">🗺️</i>
              Basemaps
            </button>
            <button 
              className={`toolbar-tab ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              <i className="tab-icon">🔧</i>
              Tools
            </button>
            </div>

          {/* Tab Content */}
          <div className="toolbar-panel">
            {activeTab === 'layers' && (
              <div className="layers-panel">
                <h4 className="panel-title">ODOT Infrastructure Layers</h4>
                <div className="layer-toggles">
                  <label className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={layerStates.roads}
                      onChange={(e) => {
                        console.log('Roads checkbox changed:', e.target.checked);
                        setLayerStates(prev => ({ ...prev, roads: e.target.checked }));
                      }}
                    />
                    <span className="toggle-label">
                      <span className="color-indicator" style={{
                        backgroundColor: '#dc2626',
                        width: '20px',
                        height: '3px',
                        borderRadius: '0',
                        display: 'inline-block'
                      }}></span>
                      Road Inventory
                    </span>
                  </label>
                  
                  <label className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={layerStates.bridges}
                      onChange={(e) => {
                        console.log('Bridges checkbox changed:', e.target.checked);
                        setLayerStates(prev => ({ ...prev, bridges: e.target.checked }));
                      }}
                    />
                    <span className="toggle-label">
                      <span className="color-indicator" style={{
                        backgroundColor: '#3b82f6',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%'
                      }}></span>
                      Bridge Inventory
                    </span>
                  </label>
                  
                  <label className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={layerStates.conduits}
                      onChange={(e) => {
                        console.log('Conduits checkbox changed:', e.target.checked);
                        setLayerStates(prev => ({ ...prev, conduits: e.target.checked }));
                      }}
                    />
                    <span className="toggle-label">
                      <span className="color-indicator" style={{
                        backgroundColor: '#22c55e',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%'
                      }}></span>
                      Conduit Inventory
                    </span>
                  </label>
                  
                  <label className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={layerStates.lighting}
                      onChange={(e) => {
                        console.log('Lighting checkbox changed:', e.target.checked);
                        setLayerStates(prev => ({ ...prev, lighting: e.target.checked }));
                      }}
                    />
                    <span className="toggle-label">
                      <span className="color-indicator" style={{
                        backgroundColor: '#fbbf24',
                        width: '20px',
                        height: '3px',
                        borderRadius: '0',
                        display: 'inline-block'
                      }}></span>
                      Highway Lighting
                    </span>
                  </label>
                  
                  <label className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={layerStates.boundaries}
                      onChange={(e) => {
                        console.log('Boundaries checkbox changed:', e.target.checked);
                        setLayerStates(prev => ({ ...prev, boundaries: e.target.checked }));
                      }}
                    />
                    <span className="toggle-label">
                      <span className="color-indicator" style={{
                        backgroundColor: '#f59e0b',
                        width: '20px',
                        height: '3px',
                        borderRadius: '0',
                        display: 'inline-block'
                      }}></span>
                      ODOT Districts
                    </span>
                  </label>
                </div>
              </div>
            )}
            
            {activeTab === 'basemaps' && (
              <div className="basemaps-panel">
                <h4 className="panel-title">Base Maps</h4>
                <div className="basemap-options">
                  <label className="basemap-option">
                    <input 
                      type="radio" 
                      name="basemap" 
                      value="osm" 
                      checked={basemap === 'osm'}
                      onChange={(e) => setBasemap(e.target.value)}
                    />
                    <span className="basemap-label">OpenStreetMap</span>
                  </label>
                  
                  <label className="basemap-option">
                    <input 
                      type="radio" 
                      name="basemap" 
                      value="esri-streets" 
                      checked={basemap === 'esri-streets'}
                      onChange={(e) => setBasemap(e.target.value)}
                    />
                    <span className="basemap-label">ESRI Streets</span>
                  </label>
                  
                  <label className="basemap-option">
                    <input 
                      type="radio" 
                      name="basemap" 
                      value="esri-satellite" 
                      checked={basemap === 'esri-satellite'}
                      onChange={(e) => setBasemap(e.target.value)}
                    />
                    <span className="basemap-label">ESRI Satellite</span>
                  </label>
                  
                  <label className="basemap-option">
                    <input 
                      type="radio" 
                      name="basemap" 
                      value="esri-topo" 
                      checked={basemap === 'esri-topo'}
                      onChange={(e) => setBasemap(e.target.value)}
                    />
                    <span className="basemap-label">ESRI Topo</span>
                  </label>
                  
                  <label className="basemap-option">
                    <input 
                      type="radio" 
                      name="basemap" 
                      value="carto-positron" 
                      checked={basemap === 'carto-positron'}
                      onChange={(e) => setBasemap(e.target.value)}
                    />
                    <span className="basemap-label">Carto Light</span>
                  </label>
                  
                  <label className="basemap-option">
                    <input 
                      type="radio" 
                      name="basemap" 
                      value="carto-dark" 
                      checked={basemap === 'carto-dark'}
                      onChange={(e) => setBasemap(e.target.value)}
                    />
                    <span className="basemap-label">Carto Dark</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="tools-panel">
                <h4 className="panel-title">Map Tools</h4>
                <div className="tool-buttons">
                  <div className="tool-buttons-grid">
                    <button 
                      className={`tool-button ${activeTool === 'filter' ? 'active' : ''}`}
                      title="Filter Features by Field Values"
                      onClick={startFilter}
                      disabled={activeTool === 'filter'}
                    >
                      <i className="tool-icon">🔍</i>
                      <span>Filter</span>
                    </button>
                    
                    <button 
                      className={`tool-button ${activeTool === 'draw' ? 'active' : ''}`} 
                      title="Draw Rectangle to Select Features" 
                      onClick={startDrawing}
                      disabled={drawToolRef.current?.isDrawing}
                    >
                      <i className="tool-icon">🔲</i>
                      <span>Draw Select</span>
                    </button>
                    
                    <button 
                      className={`tool-button ${activeTool === 'measure-line' ? 'active' : ''}`}
                      title="Measure Distance (Line)"
                      onClick={() => startMeasuring('line')}
                      disabled={measureToolRef.current?.isMeasuring}
                    >
                      <i className="tool-icon">📏</i>
                      <span>Line Measure</span>
                    </button>
                    
                    <button 
                      className={`tool-button ${activeTool === 'measure-area' ? 'active' : ''}`}
                      title="Measure Area (Polygon)"
                      onClick={() => startMeasuring('area')}
                      disabled={measureToolRef.current?.isMeasuring}
                    >
                      <i className="tool-icon">📐</i>
                      <span>Area Measure</span>
                    </button>
                  </div>
                </div>
                
                {drawToolRef.current?.isDrawing && (
                  <div className="drawing-instructions">
                    <p>🖱️ Click and drag to draw a selection rectangle</p>
                    <p>📋 Features within the rectangle will be selected</p>
                  </div>
                )}
                

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [layerStates, setLayerStates] = useState({
    roads: false,
    bridges: true,
    conduits: false,
    boundaries: false,
    lighting: false
  });
  const [basemap, setBasemap] = useState('osm');
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [showFeaturePopup, setShowFeaturePopup] = useState(false);
  const [message, setMessage] = useState('');
  const drawToolRef = useRef(null);
  const measureToolRef = useRef(null);
  const layerRefs = useRef({});
  
  // Filter tool state
  const [filterMode, setFilterMode] = useState(false);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [selectedFilterLayer, setSelectedFilterLayer] = useState('');
  const [filterFields, setFilterFields] = useState([]);
  const [selectedFilterField, setSelectedFilterField] = useState('');
  const [filterValues, setFilterValues] = useState([]);
  const [selectedFilterValue, setSelectedFilterValue] = useState('');
  const [filterResults, setFilterResults] = useState([]);
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  

  
  // Performance optimization state
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [featureCount, setFeatureCount] = useState(0);
  const [displayedFeatures, setDisplayedFeatures] = useState([]);
  const [hasMoreFeatures, setHasMoreFeatures] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [queryCache, setQueryCache] = useState(new Map());
  
  // Performance settings
  const FEATURES_PER_PAGE = 50; // Reduced from 500
  const INITIAL_FEATURE_LIMIT = 100; // For initial display
  const MAX_FEATURES_FOR_DISPLAY = 1000; // Maximum features to show at once
  
  const mapRef = useRef(null);

  // Helper function to get layer display names
  const getLayerDisplayName = (layerName) => {
    switch (layerName) {
      case 'bridges': return 'Bridges';
      case 'conduits': return 'Conduits';
      case 'roads': return 'Roads';
      case 'boundaries': return 'ODOT Districts';
      case 'lighting': return 'Highway Lighting';
      default: return layerName;
    }
  };
  
  // Use secure map service instead of global window access
  useEffect(() => {
    MapService.setMapRef(mapRef);
    
    // Cleanup function to remove map reference
    return () => {
      MapService.clearMapRef();
    };
  }, [mapRef]);

  // 1990s-style visitor counter logic
  useEffect(() => {
    const updateVisitorCounter = async () => {
      try {
        // Import the 1990s-style counter functions
        const { handleNinetiesVisitorCount } = await import('./ninetiesCounter');
        const count = await handleNinetiesVisitorCount();
        setVisitCount(count);
        Logger.debug('1990s-style visitor counter updated:', count);
      } catch (error) {
        Logger.error('Error updating 1990s-style visitor counter:', error);
        // Fallback to localStorage if 1990s counter fails
        try {
          const storedCount = localStorage.getItem('vibemapVisitCount');
          const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
          const newCount = currentCount + 1;
          localStorage.setItem('vibemapVisitCount', newCount.toString());
          setVisitCount(newCount);
        } catch (localError) {
          Logger.error('Error with localStorage fallback:', localError);
          setVisitCount(1);
        }
      }
    };

    updateVisitorCounter();
  }, []);

  // Cleanup refs on component unmount
  useEffect(() => {
    return () => {
      // Clean up layer refs
      if (layerRefs.current) {
        Object.values(layerRefs.current).forEach(layer => {
          if (layer && layer.remove) {
            layer.remove();
          }
        });
        layerRefs.current = {};
      }
      
      // Clean up tool refs
      if (drawToolRef.current) {
        drawToolRef.current.stopDrawing();
        drawToolRef.current = null;
      }
      
      if (measureToolRef.current) {
        measureToolRef.current.stopMeasuring();
        measureToolRef.current = null;
      }
      
      // Clear map ref
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, []);


  Logger.debug('App: Current layer states:', layerStates);
  Logger.debug('App: Current basemap:', basemap);
  Logger.debug('App: selectedFeatures length:', selectedFeatures.length);
  Logger.debug('App: selectedFeatures count:', selectedFeatures?.length || 0);
  Logger.debug('App: showFeaturePopup:', showFeaturePopup);

  // Filter tool functions
  const handleFeatureClick = (feature) => {
    if (!filterMode) return;
    
    Logger.debug('Feature clicked for filter:', { 
      layerName: feature?.layerName, 
      id: feature?.properties?.OBJECTID 
    });
    
    // Extract all available fields from the feature
    const fields = [];
    if (feature.properties) {
      Object.keys(feature.properties).forEach(key => {
        const value = feature.properties[key];
        if (value !== null && value !== undefined && value !== '') {
          fields.push({
            name: key,
            value: value,
            type: typeof value
          });
        }
      });
    }
    
    // Add standard fields
    const summary = getFeatureSummary(feature, feature.layerName);
    fields.unshift(
      { name: 'ID', value: summary.id, type: 'string' },
      { name: 'Name', value: summary.name, type: 'string' },
      { name: 'County', value: summary.county, type: 'string' },
      { name: 'Type', value: summary.type, type: 'string' }
    );
    
    setFilterFields(fields);
    setSelectedFilterField('');
    setFilterValues([]);
    setSelectedFilterValue('');
    setFilterResults([]);
    setMessage(`Selected feature from ${feature.layerName}. Choose a field to filter on.`);
  };

  const executeFilter = () => {
    if (!selectedFilterField || !selectedFilterValue) {
      setMessage('Please select a field and value to filter on');
      return;
    }

    if (!selectedFilterLayer) {
      setMessage('Please select a layer to filter');
      return;
    }

    setMessage('Executing filter...');

    const layerRef = layerRefs.current[selectedFilterLayer];
    if (!layerRef) {
      setMessage('Selected layer not available');
      return;
    }

    // Execute filter on the selected layer
    layerRef.query()
      .where(`${selectedFilterField} = '${selectedFilterValue}'`)
      .limit(500)
      .run((error, results) => {
        if (error) {
          console.error(`Filter error for ${selectedFilterLayer}:`, error);
          setMessage('Error executing filter');
        } else {
          const features = results.features.map(feature => ({
            ...feature,
            layerName: selectedFilterLayer
          }));
          setFilterResults(features);
          
          if (features.length > 0) {
            setMessage(`Filter found ${features.length} features in ${selectedFilterLayer}`);
            // Show results in the selection popup
            setSelectedFeatures(features);
            setShowFeaturePopup(true);
            setShowFilterPopup(false); // Close the filter popup
          } else {
            setMessage('No features found matching the filter criteria');
          }
        }
      });
  };

  const getLayerFields = (layerName) => {
    const layerRef = layerRefs.current[layerName];
    if (!layerRef) return [];

    // Use cached fields if available, otherwise return a fallback
    if (filterFields[layerName] && filterFields[layerName].length > 0) {
      return filterFields[layerName];
    }

    // Fallback to common fields while actual fields are being loaded
    const fallbackFields = {
      'bridges': ['OBJECTID', 'SFN', 'DISTRICT', 'COUNTY_CD', 'RTE_ON_BRG_CD', 'BRDR_BRG_STATE'],
      'roads': ['OBJECTID', 'NLF_ID', 'STREET_NAME', 'ROUTE_TYPE', 'COUNTY_CODE_LEFT'],
      'conduits': ['OBJECTID', 'CFN', 'NLFID', 'CONDUIT_NAME', 'ROUTE', 'COUNTY'],
      'boundaries': ['OBJECTID', 'ODOT_DISTRICT', 'ADDRESS', 'CITY', 'COUNTY'],
      'lighting': ['OBJECTID', 'NLFID', 'CRS', 'ODOT_DISTRICT', 'COUNTY']
    };
    
    return fallbackFields[layerName] || ['OBJECTID'];
  };

  // Function to get actual field names from a layer
  const getActualLayerFields = (layerName, callback) => {
    const layerRef = layerRefs.current[layerName];
    if (!layerRef) {
      callback([]);
      return;
    }

    layerRef.query()
      .limit(1)
      .run((error, results) => {
        if (error || !results || !results.features || results.features.length === 0) {
          console.warn(`Could not get fields for ${layerName}:`, error);
          callback([]);
          return;
        }

        const fields = Object.keys(results.features[0].properties);
        console.log(`Actual fields for ${layerName}:`, fields);
        callback(fields);
      });
  };

  const zoomToAndHighlightFeature = (feature) => {
    if (!mapRef.current || !feature) {
      console.log('zoomToAndHighlightFeature: Missing mapRef or feature', { mapRef: !!mapRef.current, feature: !!feature });
      return;
    }
    
    console.log('Zooming to and highlighting feature:', feature);
    
    // Ensure feature has layerName for proper highlighting
    if (!feature.layerName) {
      console.warn('Feature missing layerName, cannot highlight properly:', feature);
    }
    
    // Get the feature's geometry and zoom to it
    if (feature.geometry) {
      const map = mapRef.current;
      
      try {
        let bounds;
        
        if (feature.geometry.type === 'Point') {
          // For points, create a small bounding box around the point
          const coords = feature.geometry.coordinates;
          const latLng = L.latLng(coords[1], coords[0]);
          bounds = L.latLngBounds([latLng, latLng]).pad(0.01); // Small padding
        } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
          // For lines, create bounds from all coordinates
          const coords = feature.geometry.type === 'LineString' 
            ? feature.geometry.coordinates 
            : feature.geometry.coordinates.flat();
          const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));
          bounds = L.latLngBounds(latLngs).pad(0.005);
        } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          // For polygons, create bounds from all coordinates
          const coords = feature.geometry.type === 'Polygon' 
            ? feature.geometry.coordinates[0] 
            : feature.geometry.coordinates.flat()[0];
          const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));
          bounds = L.latLngBounds(latLngs).pad(0.005);
        }
        
        if (bounds) {
          map.fitBounds(bounds, { 
            maxZoom: 18,
            animate: true,
            duration: 1
          });
          
          // Highlight the feature with a small delay to ensure map is ready
          setTimeout(() => {
            console.log('Calling MapService.highlightFeature with:', feature);
            MapService.highlightFeature(feature);
          }, 100);
          
          const summary = getFeatureSummary(feature, feature.layerName);
          setMessage(`Zoomed to ${summary.name} (${feature.layerName})`);
        }
      } catch (error) {
        console.error('Error zooming to feature:', error);
        setMessage('Error zooming to feature');
      }
    }
  };

  // Cache for field values to avoid repeated queries
  const fieldValueCache = useRef(new Map());

  const getFieldValues = (layerName, fieldName) => {
    console.log('getFieldValues called with:', { layerName, fieldName });
    const layerRef = layerRefs.current[layerName];
    if (!layerRef || !fieldName) {
      console.warn('Missing layerRef or fieldName:', { layerRef: !!layerRef, fieldName });
      return [];
    }

    // Check cache first
    const cacheKey = `${layerName}.${fieldName}`;
    if (fieldValueCache.current.has(cacheKey)) {
      console.log(`Using cached values for ${cacheKey}`);
      const cachedValues = fieldValueCache.current.get(cacheKey);
      setFilterValues(cachedValues);
      setMessage(`Loaded ${cachedValues.length} cached values for ${fieldName}`);
      return [];
    }

    console.log('Layer ref found:', layerRef);
    setIsLoadingValues(true);
    setFilterValues([]);

    // Query the layer to get unique values for the selected field
    console.log('Starting query for field values...');
    
    // First, try to get a larger sample to find more unique values
    layerRef.query()
      .limit(2000) // Increased limit to get more unique values
      .run((error, results) => {
        console.log('Query completed:', { error, resultsCount: results?.features?.length });
        setIsLoadingValues(false);
        if (error) {
          console.error(`Error getting field values for ${layerName}.${fieldName}:`, error);
        } else if (results && results.features && results.features.length > 0) {
          // Debug: Show available fields in the first feature (only on first call)
          const firstFeature = results.features[0];
          if (!window.fieldDebugShown) {
            console.log('Sample feature properties:', firstFeature.properties);
            console.log('Available fields:', Object.keys(firstFeature.properties));
            window.fieldDebugShown = true;
          }
          
          // Check if the requested field exists
          if (!firstFeature.properties.hasOwnProperty(fieldName)) {
            console.warn(`Field '${fieldName}' not found in ${layerName} layer. Available fields:`, Object.keys(firstFeature.properties));
            
            // Try to find similar field names (case-insensitive)
            const availableFields = Object.keys(firstFeature.properties);
            const similarField = availableFields.find(field => 
              field.toLowerCase() === fieldName.toLowerCase() ||
              field.toLowerCase().includes(fieldName.toLowerCase()) ||
              fieldName.toLowerCase().includes(field.toLowerCase()) ||
              // Handle common field name variations
              (fieldName.toLowerCase() === 'county' && field.toLowerCase().includes('county')) ||
              (fieldName.toLowerCase() === 'district' && field.toLowerCase().includes('district')) ||
              (fieldName.toLowerCase() === 'route' && field.toLowerCase().includes('route'))
            );
            
            if (similarField) {
              console.log(`Found similar field: '${similarField}' instead of '${fieldName}'`);
              fieldName = similarField;
            } else {
              // Show more detailed field information for debugging
              console.log(`Field '${fieldName}' not found. Here are the first 20 available fields:`, availableFields.slice(0, 20));
              console.log(`Here are fields that might be similar to '${fieldName}':`, 
                availableFields.filter(field => 
                  field.toLowerCase().includes(fieldName.toLowerCase().replace('_', '')) ||
                  fieldName.toLowerCase().includes(field.toLowerCase().replace('_', ''))
                )
              );
              
              // Update the field list with actual fields for future use
              const actualFields = availableFields.filter(field => 
                !field.toLowerCase().includes('shape') && 
                !field.toLowerCase().includes('geometry') &&
                field !== 'OBJECTID'
              ).slice(0, 30); // Limit to first 30 meaningful fields
              
              console.log(`Updating field list for ${layerName} with actual fields:`, actualFields);
              setMessage(`Field '${fieldName}' not found. Available fields: ${availableFields.slice(0, 10).join(', ')}...`);
              return;
            }
          }
          
          // Extract unique values from the results
          const uniqueValues = [...new Set(
            results.features
              .map(feature => feature.properties[fieldName])
              .filter(value => value !== null && value !== undefined && value !== '')
          )].sort();
          
          console.log(`Found ${uniqueValues.length} unique values for ${layerName}.${fieldName}:`, uniqueValues);
          
          // If we found very few unique values, try a different approach
          if (uniqueValues.length <= 5 && results.features.length >= 1000) {
            console.log(`Only found ${uniqueValues.length} unique values, trying additional queries...`);
            
            // Try a few more queries with different offsets to get more unique values
            const additionalQueries = [2000, 4000, 6000];
            let totalUniqueValues = new Set(uniqueValues);
            let completedQueries = 0;
            
            additionalQueries.forEach((offset, index) => {
              setTimeout(() => {
                layerRef.query()
                  .limit(1000)
                  .offset(offset)
                  .run((offsetError, offsetResults) => {
                    if (!offsetError && offsetResults && offsetResults.features) {
                      const additionalValues = [...new Set(
                        offsetResults.features
                          .map(feature => feature.properties[fieldName])
                          .filter(value => value !== null && value !== undefined && value !== '')
                      )];
                      
                      additionalValues.forEach(value => totalUniqueValues.add(value));
                      completedQueries++;
                      
                      if (completedQueries === additionalQueries.length) {
                        const finalValues = [...totalUniqueValues].sort();
                        console.log(`After additional queries, found ${finalValues.length} total unique values for ${layerName}.${fieldName}:`, finalValues);
                        
                        // Cache the results for future use
                        fieldValueCache.current.set(cacheKey, finalValues);
                        setFilterValues(finalValues);
                        setMessage(`Loaded ${finalValues.length} unique values for ${fieldName}`);
                      }
                    }
                  });
              }, index * 500); // Stagger the queries
            });
          } else {
            // Cache the results for future use
            fieldValueCache.current.set(cacheKey, uniqueValues);
            setFilterValues(uniqueValues);
            setMessage(`Loaded ${uniqueValues.length} unique values for ${fieldName}`);
          }
        } else {
          console.warn(`No features returned for ${layerName} layer`);
          setMessage(`No features found in ${layerName} layer`);
        }
      });

    return []; // Return empty array initially, values will be set via setFilterValues
  };



  // Performance optimization functions
  const getCachedQuery = (cacheKey) => {
    return queryCache.get(cacheKey);
  };

  const setCachedQuery = (cacheKey, data) => {
    const newCache = new Map(queryCache);
    newCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes cache
    });
    setQueryCache(newCache);
  };

  const isCacheValid = (cacheKey) => {
    const cached = queryCache.get(cacheKey);
    if (!cached) return false;
    return Date.now() < cached.expiresAt;
  };

  const loadFeaturesWithProgress = async (layer, bounds, page = 1, limit = FEATURES_PER_PAGE) => {
    const cacheKey = `${layer.name}_${JSON.stringify(bounds)}_${page}_${limit}`;
    
    // Check cache first
    if (isCacheValid(cacheKey)) {
      const cached = getCachedQuery(cacheKey);
      return cached.data;
    }

    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      setLoadingProgress(0);
      
      // First, get total count
      layer.query()
        .within(bounds)
        .limit(1)
        .run((error, result) => {
          if (error) {
            reject(error);
            return;
          }
          
          setLoadingProgress(10);
          
          // Then get actual features
          layer.query()
            .within(bounds)
            .limit(limit)
            .offset(offset)
            .run((error, featureCollection) => {
              if (error) {
                reject(error);
                return;
              }
              
              setLoadingProgress(100);
              
              const result = {
                features: featureCollection.features || [],
                totalCount: featureCollection.totalCount || 0,
                hasMore: (offset + limit) < (featureCollection.totalCount || 0)
              };
              
              // Cache the result
              setCachedQuery(cacheKey, result);
              resolve(result);
            });
        });
    });
  };

  const loadInitialFeatures = async (layer, bounds) => {
    setIsLoadingFeatures(true);
    setLoadingProgress(0);
    
    try {
      const result = await loadFeaturesWithProgress(layer, bounds, 1, INITIAL_FEATURE_LIMIT);
      
      setDisplayedFeatures(result.features);
      setSelectedFeatures(result.features); // Also set selectedFeatures for the popup
      setFeatureCount(result.totalCount);
      setHasMoreFeatures(result.hasMore);
      setCurrentPage(1);
      
      if (result.totalCount > MAX_FEATURES_FOR_DISPLAY) {
        setMessage(`Loaded ${result.features.length} of ${result.totalCount} features. Use filters to narrow results.`);
      } else {
        setMessage(`Loaded ${result.features.length} features`);
      }
    } catch (error) {
      Logger.error('Error loading initial features:', error);
    } finally {
      setIsLoadingFeatures(false);
      setLoadingProgress(0);
    }
  };

  const loadMoreFeatures = async () => {
    if (!hasMoreFeatures || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      const layer = layerRefs.current[Object.keys(layerRefs.current)[0]]; // Get first layer
      const bounds = mapRef.current?.getBounds();
      
      if (!layer || !bounds) {
        setMessage('No layer or map bounds available');
        return;
      }
      
      const result = await loadFeaturesWithProgress(layer, bounds, nextPage, FEATURES_PER_PAGE);
      
      setDisplayedFeatures(prev => [...prev, ...result.features]);
      setSelectedFeatures(prev => [...prev, ...result.features]); // Also update selectedFeatures
      setHasMoreFeatures(result.hasMore);
      setCurrentPage(nextPage);
      
      setMessage(`Loaded ${result.features.length} more features (${displayedFeatures.length + result.features.length} total)`);
    } catch (error) {
      Logger.error('Error loading more features:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="App">
      <div className="map-header">
        <h1>Vibe Map - Polygon Solutions</h1>
      </div>
      
      {drawToolRef.current?.isDrawing && !filterMode && (
        <div className="drawing-overlay">
          <div className="drawing-message">
            <i className="drawing-icon">🔲</i>
            <span>Click and drag to draw selection rectangle</span>
          </div>
        </div>
      )}
      
      <MapContainer 
        center={[39.9612, -82.9988]} // Columbus, Ohio coordinates
        zoom={12} 
        style={{ height: '100vh', width: '100vw' }}
        zoomControl={false}
      >
        <MapInitializer 
          layerStates={layerStates} 
          setSelectedFeature={setSelectedFeature}
          setSelectedFeatures={setSelectedFeatures}
          setShowFeaturePopup={setShowFeaturePopup}
          drawToolRef={drawToolRef}
          measureToolRef={measureToolRef}
          setMessage={setMessage}
          handleFeatureClick={filterMode ? handleFeatureClick : null}
          layerRefs={layerRefs}
          mapRef={mapRef}
          loadInitialFeatures={loadInitialFeatures}
          getLayerDisplayName={getLayerDisplayName}
        />
        <BasemapLayer basemap={basemap} />
      </MapContainer>
      
      <Toolbar 
        layerStates={layerStates} 
        setLayerStates={setLayerStates} 
        basemap={basemap} 
        setBasemap={setBasemap}
        setSelectedFeatures={setSelectedFeatures}
        drawToolRef={drawToolRef}
        measureToolRef={measureToolRef}
        setMessage={setMessage}
        layerRefs={layerRefs}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        showFilterPopup={showFilterPopup}
        setShowFilterPopup={setShowFilterPopup}
        selectedFilterLayer={selectedFilterLayer}
        setSelectedFilterLayer={setSelectedFilterLayer}
        filterFields={filterFields}
        setFilterFields={setFilterFields}
        selectedFilterField={selectedFilterField}
        setSelectedFilterField={setSelectedFilterField}
        filterValues={filterValues}
        setFilterValues={setFilterValues}
        selectedFilterValue={selectedFilterValue}
        setSelectedFilterValue={setSelectedFilterValue}
        filterResults={filterResults}
        setFilterResults={setFilterResults}
        executeFilter={executeFilter}
        getLayerFields={getLayerFields}
        getActualLayerFields={getActualLayerFields}
        getFieldValues={getFieldValues}
        isLoadingValues={isLoadingValues}

      />
      
      {selectedFeature && (
        <CustomPopup 
          feature={selectedFeature} 
          onClose={() => setSelectedFeature(null)} 
        />
      )}
      
      {showFeaturePopup && (
        <>
          {console.log('Rendering FeatureSummaryPopup with features:', selectedFeatures)}
          <FeatureSummaryPopup 
            features={selectedFeatures}
            onClose={() => {
              console.log('Closing FeatureSummaryPopup');
              setSelectedFeatures([]);
              setShowFeaturePopup(false);
              
              // Clear highlights when popup is closed
                  MapService.highlightFeature(null);
            }}
            onFeatureClick={zoomToAndHighlightFeature}
            setMessage={setMessage}
            displayedFeatures={displayedFeatures}
            hasMoreFeatures={hasMoreFeatures}
            loadMoreFeatures={loadMoreFeatures}
            isLoadingMore={isLoadingMore}
            featureCount={featureCount}
          />
        </>
      )}
      
      {/* Filter Popup */}
      {showFilterPopup && (
        <div className="filter-popup-overlay">
          <div className="filter-popup">
            <div className="filter-popup-header">
              <h3>🔍 Filter Features</h3>
              <button 
                className="filter-popup-close"
                onClick={() => setShowFilterPopup(false)}
              >
                ×
              </button>
            </div>
            
            <div className="filter-popup-content">
              <div className="filter-step">
                <label>1. Select Layer:</label>
                <select 
                  value={selectedFilterLayer} 
                  onChange={(e) => {
                    const layerName = e.target.value;
                    setSelectedFilterLayer(layerName);
                    setSelectedFilterField('');
                    setFilterValues([]);
                    setSelectedFilterValue('');
                    
                    // Load actual fields for the selected layer
                    if (layerName) {
                      getActualLayerFields(layerName, (fields) => {
                        setFilterFields(prev => ({
                          ...prev,
                          [layerName]: fields
                        }));
                      });
                    }
                  }}
                >
                  <option value="">Choose a layer...</option>
                  {Object.entries(layerStates)
                    .filter(([layerName, isVisible]) => isVisible)
                    .map(([layerName]) => (
                      <option key={layerName} value={layerName}>
                        {layerName.charAt(0).toUpperCase() + layerName.slice(1)}
                      </option>
                    ))}
                </select>

              </div>

              {selectedFilterLayer && (
                <div className="filter-step">
                  <label>2. Select Field:</label>
                  <select 
                    value={selectedFilterField} 
                    onChange={(e) => {
                      const fieldName = e.target.value;
                      setSelectedFilterField(fieldName);
                      setFilterValues([]);
                      setSelectedFilterValue('');
                      
                      // Load unique values for the selected field
                      if (fieldName) {
                        getFieldValues(selectedFilterLayer, fieldName);
                      }
                    }}
                  >
                    <option value="">Choose a field...</option>
                    {getLayerFields(selectedFilterLayer).map((fieldName) => (
                      <option key={fieldName} value={fieldName}>
                        {fieldName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedFilterField && (
                <div className="filter-step">
                  <label>3. Select Value:</label>
                  <select 
                    value={selectedFilterValue} 
                    onChange={(e) => setSelectedFilterValue(e.target.value)}
                    disabled={isLoadingValues}
                  >
                    <option value="">Choose a value...</option>
                    {filterValues.map((value, index) => (
                      <option key={index} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <p className="filter-note">
                    {isLoadingValues 
                      ? '⏳ Loading unique values for the selected field...'
                      : filterValues.length > 0 
                        ? `✅ ${filterValues.length} unique values found`
                        : 'No values found for this field'
                    }
                  </p>
                </div>
              )}

              <div className="filter-actions">
                <button 
                  className="filter-button primary"
                  onClick={executeFilter}
                  disabled={!selectedFilterLayer || !selectedFilterField || !selectedFilterValue}
                >
                  🔍 Apply Filter
                </button>
                <button 
                  className="filter-button secondary"
                  onClick={() => setShowFilterPopup(false)}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Progress */}
      <LoadingProgress 
        progress={loadingProgress}
        message={isLoadingFeatures ? 'Loading features...' : 'Processing...'}
        isVisible={isLoadingFeatures || loadingProgress > 0}
      />

      {/* Message Center */}
      {message && (
        <div className="message-center">
          <div className="message-content">
            <span className="message-text">{message}</span>
            <button 
              className="message-close"
              onClick={() => setMessage('')}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Visitor Counter */}
      <VisitorCounter count={visitCount} />
    </div>
  );
}

// Wrap App with ErrorBoundary for better error handling
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
