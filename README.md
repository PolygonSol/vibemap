# 🗺️ Vibemap - Interactive GIS Mapping Application

A modern React-based interactive mapping application for exploring Ohio Department of Transportation (ODOT) infrastructure data. Built with Leaflet.js and featuring advanced filtering, measurement tools, and a nostalgic 1990s-style visitor counter.

## ✨ Features

### 🎯 **Core Functionality**
- **Interactive Map**: Explore ODOT infrastructure data with Leaflet.js
- **Multi-Layer Support**: Bridges, Roads, Conduits, Boundaries, and Lighting
- **Advanced Filtering**: Dynamic field loading and progressive querying
- **Measurement Tools**: Line and area measurement with accurate calculations
- **Feature Selection**: Draw rectangles to select and analyze features
- **1990s Visitor Counter**: Retro-style digital display with session management

### 🛠️ **Technical Features**
- **Progressive Loading**: Efficient data loading with intelligent caching
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Performance Optimized**: Memory leak prevention and efficient resource management
- **Modern UI/UX**: Clean interface with intuitive tool placement

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PolygonSol/vibemap.git
   cd vibemap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to view the application

## 🏗️ Project Structure

```
vibemap/
├── 📁 public/                 # Static assets
│   ├── index.html            # Main HTML file
│   ├── favicon.ico           # App icon
│   └── manifest.json         # PWA manifest
├── 📁 src/                   # Source code
│   ├── App.js               # Main application component
│   ├── App.css              # Application styles
│   ├── index.js             # Application entry point
│   ├── ninetiesCounter.js   # 1990s-style visitor counter
│   └── NinetiesCounterDisplay.js # Counter display component
├── package.json             # Dependencies and scripts
├── .htaccess                # Apache configuration for subdirectory deployment
└── README.md               # This file
```

## 🎮 Usage Guide

### **Map Navigation**
- **Pan**: Click and drag to move around the map
- **Zoom**: Use mouse wheel or zoom controls
- **Layer Toggle**: Use the layer controls on the right panel

### **Toolbar Functions**

#### 🔍 **Filter Tool**
1. Click the "Filter" button (top-left)
2. Select a layer (e.g., "bridges")
3. Choose a field (e.g., "COUNTY")
4. Select values to filter by
5. Click "Apply Filter" to see results

#### 🔲 **Draw Select Tool**
1. Click "Draw Select" button (top-right)
2. Draw a rectangle on the map
3. View selected features in the summary panel
4. Click on records to zoom and highlight features

#### 📏 **Line Measure Tool**
1. Click "Line Measure" button
2. Click points on the map to create a line
3. Double-click to finish and see distance measurement

#### 📐 **Area Measure Tool**
1. Click "Area Measure" button
2. Click points to create a polygon
3. Double-click to finish and see area calculation

## 🔧 Development

### **Available Scripts**

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from Create React App (not recommended)
npm run eject
```

### **Environment Variables**

Create a `.env` file in the root directory for local development:

```env
# Development server port (optional)
PORT=3000

# GIS service URLs (if needed for development)
REACT_APP_GIS_BASE_URL=https://gis.dot.state.oh.us
```

### **Code Style**

The project uses ESLint for code quality. Common warnings include:
- Missing dependencies in useEffect hooks
- Unused variables
- React Hook exhaustive-deps warnings

To fix warnings, add `// eslint-disable-next-line` comments where appropriate.

## 🗺️ Data Sources

The application connects to ODOT's ArcGIS MapServer services:

- **Base URL**: `https://gis.dot.state.oh.us/arcgis/rest/services/`
- **Services**:
  - `TIMS/Roadway_Information/MapServer` (Bridges, Roads, Conduits)
  - `TIMS/Boundaries/MapServer` (District Boundaries)
  - `TIMS/Lighting/MapServer` (Street Lighting)

## 🚀 Deployment

### **Subdirectory Deployment (Recommended)**

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Upload to web server**
   - Upload all files from `build/` to your server's `/vibemap/` directory
   - Ensure `.htaccess` is included for proper routing

3. **Access the application**
   - Navigate to `https://yourdomain.com/vibemap/`

### **Root Directory Deployment**

1. **Modify package.json**
   ```json
   {
     "homepage": "."
   }
   ```

2. **Build and deploy**
   ```bash
   npm run build
   # Upload build/ contents to root directory
   ```

## 🐛 Troubleshooting

### **Common Issues**

#### **CORS Errors**
- The application queries external GIS services
- CORS issues are typically server-side and require service provider configuration
- Test with different browsers or check network connectivity

#### **Performance Issues**
- Large datasets may take time to load initially
- Use the filter tool to reduce data volume
- Check browser console for memory warnings

#### **Layer Loading Problems**
- Verify GIS service availability
- Check network connectivity to `gis.dot.state.oh.us`
- Try refreshing the page

### **Development Issues**

#### **Port Already in Use**
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use a different port
PORT=3001 npm start
```

#### **Dependency Issues**
```bash
# Clear npm cache
npm cache clean --force
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ODOT**: For providing the GIS data services
- **Leaflet.js**: For the excellent mapping library
- **React**: For the powerful frontend framework
- **Create React App**: For the development tooling

## 📞 Support

For issues and questions:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review browser console for error messages
3. Open an issue on GitHub with detailed information

---

**Built with ❤️ for the Ohio Department of Transportation**
