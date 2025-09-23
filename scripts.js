// Simple 2D Track Visualizer
class TrackVisualizer2D {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.trackPoints = [];
    this.currentPosition = null;
    this.trailPoints = [];
    this.isInitialized = false;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.bounds = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    this.setupControls();
  }

  initCanvas() {
    if (this.isInitialized) return;
    
    this.canvas = document.getElementById('trackCanvas');
    if (!this.canvas) {
      console.log(' Track canvas not found');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.isInitialized = true;
    console.log(' 2D Track Visualizer initialized');
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.draw();
  }

  setTrackData(gpsData) {
    console.log(' Setting 2D track data from GPS points...');
    
    // Extract GPS coordinates
    this.trackPoints = gpsData.map(point => ({
      lat: parseFloat(point.gps_latitude),
      lng: parseFloat(point.gps_longitude)
    })).filter(point => !isNaN(point.lat) && !isNaN(point.lng));

    console.log(` Loaded ${this.trackPoints.length} GPS points`);

    if (this.trackPoints.length === 0) {
      console.log(' No valid GPS points found');
      return;
    }

    // Extract the overall track shape (reduce points to get clean shape)
    const trackShape = this.extractTrackShape(this.trackPoints);
    console.log(` Extracted track shape with ${trackShape.length} points`);

    // Calculate bounds
    this.bounds.minLat = Math.min(...trackShape.map(p => p.lat));
    this.bounds.maxLat = Math.max(...trackShape.map(p => p.lat));
    this.bounds.minLng = Math.min(...trackShape.map(p => p.lng));
    this.bounds.maxLng = Math.max(...trackShape.map(p => p.lng));

    console.log('📍 Track bounds:', this.bounds);

    // Calculate scale and offset for optimal display
    this.calculateTransform();
    this.draw();
    
    console.log(' 2D track reference created');
  }

  extractTrackShape(points) {
    // Reduce points to get the overall track shape
    const step = Math.max(1, Math.floor(points.length / 200)); // Max 200 points for clean shape
    const shape = [];
    
    for (let i = 0; i < points.length; i += step) {
      shape.push(points[i]);
    }
    
    // Ensure we close the loop
    if (shape.length > 0 && shape[0] !== shape[shape.length - 1]) {
      shape.push(shape[0]);
    }
    
    return shape;
  }

  calculateTransform() {
    if (!this.canvas || this.trackPoints.length === 0) return;

    const latRange = this.bounds.maxLat - this.bounds.minLat;
    const lngRange = this.bounds.maxLng - this.bounds.minLng;
    
    // Scale to fit canvas with padding
    const padding = 50;
    const scaleX = (this.canvas.width - padding * 2) / lngRange;
    const scaleY = (this.canvas.height - padding * 2) / latRange;
    
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = padding - this.bounds.minLng * this.scale;
    this.offsetY = padding - this.bounds.minLat * this.scale;
  }

  latLngToCanvas(lat, lng) {
    return {
      x: lng * this.scale + this.offsetX,
      y: this.canvas.height - (lat * this.scale + this.offsetY) // Flip Y axis
    };
  }

  draw() {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas with black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw thick white track reference
    this.drawTrack();

    // Draw trail
    if (this.trailPoints.length > 0) {
      this.drawTrail();
    }

    // Draw current position (big orange pointer)
    if (this.currentPosition) {
      this.drawCurrentPosition();
    }
  }

  drawTrack() {
    if (this.trackPoints.length < 2) return;

    // Draw thick white track reference
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 20; // Very thick line
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.trackPoints.forEach((point, index) => {
      const canvasPos = this.latLngToCanvas(point.lat, point.lng);
      if (index === 0) {
        this.ctx.moveTo(canvasPos.x, canvasPos.y);
      } else {
        this.ctx.lineTo(canvasPos.x, canvasPos.y);
      }
    });
    this.ctx.stroke();
  }

  drawTrail() {
    if (this.trailPoints.length < 2) return;

    this.ctx.strokeStyle = '#ff6b35';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = 0.8;
    
    this.ctx.beginPath();
    this.trailPoints.forEach((point, index) => {
      const canvasPos = this.latLngToCanvas(point.lat, point.lng);
      if (index === 0) {
        this.ctx.moveTo(canvasPos.x, canvasPos.y);
      } else {
        this.ctx.lineTo(canvasPos.x, canvasPos.y);
      }
    });
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  drawCurrentPosition() {
    const canvasPos = this.latLngToCanvas(this.currentPosition.lat, this.currentPosition.lng);
    
    // Draw big orange pointer
    this.ctx.fillStyle = '#ff6b35';
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x, canvasPos.y, 8, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Add glow effect
    this.ctx.shadowColor = '#ff6b35';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x, canvasPos.y, 6, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  updatePosition(lat, lng) {
    if (!lat || !lng || lat === 0 || lng === 0) return;
    
    this.currentPosition = { lat, lng };
    
    // Add to trail
    this.trailPoints.push({ lat, lng });
    
    // Limit trail length for performance
    if (this.trailPoints.length > 200) {
      this.trailPoints = this.trailPoints.slice(-200);
    }
    
    this.draw();
    console.log(`📍 Pointer moved to: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  }

  clearTrail() {
    this.trailPoints = [];
    this.draw();
    console.log('Trail cleared');
  }

  toggleTrack() {
    // For 2D, we can toggle track visibility by redrawing
    this.draw();
    console.log('Track visibility toggled');
  }

  centerTrack() {
    if (this.trackPoints.length > 0) {
      this.calculateTransform();
      this.draw();
    }
    console.log('Track centered');
  }

  resetView() {
    this.centerTrack();
    console.log('View reset');
  }

  setupControls() {
    document.addEventListener('DOMContentLoaded', () => {
      const clearBtn = document.getElementById('clearTrack');
      const toggleTrackBtn = document.getElementById('toggleTrack');
      const centerBtn = document.getElementById('centerTrack');
      const resetBtn = document.getElementById('resetView');
      
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearTrail());
      }
      
      if (toggleTrackBtn) {
        toggleTrackBtn.addEventListener('click', () => this.toggleTrack());
      }
      
      if (centerBtn) {
        centerBtn.addEventListener('click', () => this.centerTrack());
      }
      
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.resetView());
      }
    });
  }
}

// Initialize 2D Track Visualizer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log(' DOM loaded, initializing 2D Track Visualizer...');
  const canvasDiv = document.getElementById('trackCanvas');
  if (canvasDiv) {
    console.log(' Track canvas found:', canvasDiv);
    window.trackVisualizer = new TrackVisualizer2D();
    window.trackVisualizer.initCanvas();
    console.log(' 2D Track Visualizer initialized');
  } else {
    console.error(' Track canvas not found!');
  }
});

// Comprehensive Racing Telemetry Dashboard
class RacingTelemetryDashboard {
  constructor() {
    this.startTime = Date.now();
    this.csvData = [];
    this.currentIndex = 0;
    this.raceStartTime = null;
    
    // Race parameters
    this.targetRaceTime = 35 * 60; // 35 minutes in seconds
    this.totalRaceDistance = 14.8; // km
    this.totalLaps = 4;
    
    // Data tracking
    this.speedHistory = [];
    this.lapStartTime = null;
    this.lapStartDistance = 0;
    this.lapStartEnergy = 0;
    this.currentLap = 0;
    
    // Alert thresholds
    this.voltageThreshold = 42; // V
    this.currentThreshold = 30; // A
    this.energyBudget = 2000; // Wh allowed
    
    // Initialize 2D Track Visualizer
    this.trackVisualizer2D = null;
    
    // Playback control
    this.isPlaying = false;
    this.updateInterval = null;
    
    this.init();
  }

  async init() {
    this.setupLoadDataButton();
    this.setupPlayPauseButton();
    this.updateTelemetry(); // Show initial state
  }
  
  setupLoadDataButton() {
    const button = document.getElementById('loadDataBtn');
    if (button) {
      button.addEventListener('click', async () => {
        console.log(' Load Data button clicked!');
        await this.loadRealCSVData();
      });
      console.log(' Load Data button event listener added');
    } else {
      console.error(' Load Data button not found!');
    }
  }
  
  setupPlayPauseButton() {
    const button = document.getElementById('playPauseBtn');
    if (button) {
      button.addEventListener('click', () => {
        this.togglePlayPause();
      });
      console.log(' Play/Pause button event listener added');
    } else {
      console.error(' Play/Pause button not found!');
    }
  }
  
  hideTrackOverlay() {
    const overlay = document.getElementById('trackOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
  
  showTrackOverlay() {
    const overlay = document.getElementById('trackOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }
  
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  play() {
    if (this.csvData.length === 0) {
      console.log(' No data loaded to play');
      return;
    }
    
    this.isPlaying = true;
    const button = document.getElementById('playPauseBtn');
    button.textContent = 'Pause';
    
    // Hide overlay when starting
    this.hideTrackOverlay();
    
    this.updateInterval = setInterval(() => {
      this.updateTelemetry();
    }, 100); // Update every 100ms for smoother playback
    
    console.log(' Playback started');
  }
  
  pause() {
    this.isPlaying = false;
    const button = document.getElementById('playPauseBtn');
    button.textContent = 'Play';
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    console.log(' Playback paused');
  }
  
  async loadRealCSVData() {
    const buttonElement = document.getElementById('loadDataBtn');
    
    try {
      console.log('Starting to load data...');
      buttonElement.disabled = true;
      buttonElement.textContent = 'Loading...';
      
      const csvPath = './telemetry_data.csv';
      console.log('Loading real CSV data from:', csvPath);
      
      const response = await fetch(csvPath);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
            console.log('CSV text length:', csvText.length);
      
      if (!csvText || csvText.length < 100) {
        throw new Error('CSV file appears to be empty or too small');
      }
      
      const lines = csvText.split('\n');
      console.log(' Number of lines:', lines.length);
      
      if (lines.length < 2) {
        throw new Error('CSV file appears to be empty or invalid');
      }
      
      // Parse header
      const headers = lines[0].split(',');
      console.log(' CSV headers:', headers);
      
      // Parse data rows (optimized for large files)
      this.csvData = [];
      const totalRows = lines.length - 1;
      console.log(` Parsing ${totalRows} data rows...`);
      
      // Process in chunks to avoid blocking the UI
      const chunkSize = 1000;
      let processedRows = 0;
      
      for (let i = 1; i < lines.length; i += chunkSize) {
        const endIndex = Math.min(i + chunkSize, lines.length);
        
        for (let j = i; j < endIndex; j++) {
          if (lines[j].trim()) {
            const values = lines[j].split(',');
            const row = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index] ? values[index].trim() : '';
            });
            this.csvData.push(row);
          }
        }
        
        processedRows = endIndex - 1;
        const progress = Math.round((processedRows / totalRows) * 100);
        buttonElement.textContent = ` Loading... ${progress}%`;
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(` Loaded ${this.csvData.length} data points from real CSV`);
      if (this.csvData.length > 0) {
        this.raceStartTime = parseFloat(this.csvData[0].obc_timestamp);
        console.log(' Race start time:', this.raceStartTime);
        console.log(' First data point:', this.csvData[0]);
        console.log(' GPS coordinates:', {
          lat: this.csvData[0].gps_latitude,
          lon: this.csvData[0].gps_longitude
        });
      }
      
      buttonElement.textContent = 'Data Loaded';
      buttonElement.style.background = 'linear-gradient(135deg, #00ff00, #00cc00)';
      
      // Initialize 2D Track Visualizer with loaded data
      if (window.trackVisualizer) {
        console.log(' Setting track data for visualizer...');
        window.trackVisualizer.setTrackData(this.csvData);
        console.log(' Track visualizer initialized with', this.csvData.length, 'data points');
      } else {
        console.error(' Track visualizer not available!');
      }
      
      // Reset to first data point
      this.currentIndex = 0;
      
      // Enable play button
      const playButton = document.getElementById('playPauseBtn');
      if (playButton) {
        playButton.disabled = false;
        console.log(' Play button enabled');
      }
      
      // Show first data point
      console.log(' Running first telemetry update...');
      this.updateTelemetry();
      console.log(' First telemetry update completed');
      
    } catch (error) {
      console.error(' Error loading CSV data:', error);
      
      // Reset button on error
      buttonElement.disabled = false;
      buttonElement.textContent = 'Load Real Data';
      buttonElement.style.background = 'linear-gradient(135deg, #ff6b35, #ff8c42)';
      
      alert('Failed to load telemetry data: ' + error.message);
    }
  }

  async loadCSVData() {
    try {
      const csvPath = './telemetry_data.csv';
      console.log('Attempting to load CSV from:', csvPath);
      
      const response = await fetch(csvPath);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log('CSV text length:', csvText.length);
      
      const lines = csvText.split('\n');
      console.log('Number of lines:', lines.length);
      
      const headers = lines[0].split(',');
      console.log('Headers:', headers);
      
      this.csvData = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const row = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index] ? values[index].trim() : '';
          });
          this.csvData.push(row);
        }
      }
      
      console.log(` Loaded ${this.csvData.length} data points from CSV`);
      if (this.csvData.length > 0) {
        this.raceStartTime = parseFloat(this.csvData[0].obc_timestamp);
        console.log(' Race start time:', this.raceStartTime);
        console.log(' First data point:', this.csvData[0]);
        console.log(' GPS coordinates:', {
          lat: this.csvData[0].gps_latitude,
          lon: this.csvData[0].gps_longitude
        });
        console.log('🚗 Speed:', this.csvData[0].gps_speed);
        console.log('⚡ Voltage:', this.csvData[0].jm3_voltage);
        console.log('🔋 Current:', this.csvData[0].jm3_current);
      }
    } catch (error) {
      console.error('Error loading CSV data:', error);
      console.log('Falling back to simulation mode');
      // Fallback to simulation if CSV loading fails
      this.csvData = [];
    }
  }

  updateTelemetry() {
    if (this.csvData.length === 0) {
      console.log(' No CSV data available, using simulated telemetry');
      this.updateSimulatedTelemetry();
      return;
    }
    
    console.log(` Updating telemetry with real data (index: ${this.currentIndex}/${this.csvData.length})`);

    const currentData = this.csvData[this.currentIndex];
    
    // Check if we've reached the end of the data
    if (this.currentIndex >= this.csvData.length) {
      console.log(' Race data playback complete!');
      this.currentIndex = 0; // Loop back to start
      return;
    }
    
    // Extract raw data from CSV with correct unit conversions
    const speed = parseFloat(currentData.gps_speed) || 0; // km/h
    const volts = (parseFloat(currentData.jm3_voltage) || 0) / 1000; // Convert to V
    const current = (Math.abs(parseFloat(currentData.jm3_current)) || 0) / 1000; // Convert to A
    const distance = (parseFloat(currentData.dist) || 0) / 1000; // Convert to km
    const lapDistance = (parseFloat(currentData.lap_dist) || 0) / 1000; // Convert to km
    const lap = parseInt(currentData.lap_lap) || 0;
    const timestamp = parseFloat(currentData.obc_timestamp) || 0;
    const netJoule = parseFloat(currentData.jm3_netjoule) || 0;
    const lapNetJoule = parseFloat(currentData.lap_jm3_netjoule) || 0;
    
    // Debug logging for data extraction
    console.log(` Data Point ${this.currentIndex}:`, {
      speed: speed,
      volts: volts,
      current: current,
      distance: distance,
      lapDistance: lapDistance,
      lap: lap,
      timestamp: timestamp,
      gps_lat: currentData.gps_latitude,
      gps_lon: currentData.gps_longitude,
      raw_data: currentData
    });
    
        // Calculate comprehensive metrics with correct formulas
        const avgSpeed = this.calculateAverageSpeed(speed);
        const power = volts * current; // Power in Watts (V × A)
        const energyTotalWh = netJoule / 3600; // Convert Joules to Wh
        const energyTotalKWh = netJoule / 3600000; // Convert Joules to kWh
        const energyLap = lapNetJoule / 3600; // Convert Joules to Wh
        
        // Consumption calculation: Wh per km
        const consumption = distance > 0 ? energyTotalWh / distance : 0; // Wh/km
        
        // Efficiency calculation: km per kWh
        const efficiency = energyTotalKWh > 0 ? distance / energyTotalKWh : 0; // km/kWh
    
    // Timing calculations
    const raceTime = this.formatRaceTime(timestamp);
    const lapTime = this.calculateLapTime(lap, timestamp);
    const remainingTime = this.calculateRemainingTimeFromTimestamp(timestamp);
    const remainingDistance = this.totalRaceDistance - distance;
    
    console.log(` Calculated Metrics:`, {
      avgSpeed: avgSpeed,
      power: power,
            energyTotal: energyTotalWh,
      energyLap: energyLap,
      consumption: consumption,
      efficiency: efficiency,
      raceTime: raceTime,
      remainingTime: remainingTime,
      elapsedSeconds: timestamp - this.raceStartTime,
      raceStartTime: this.raceStartTime,
      currentTimestamp: timestamp
    });
    
        // Update lap tracking
        this.updateLapTracking(lap, distance, energyTotalWh, timestamp);
    
        // Update DOM elements with correct data
        console.log(' Updating DOM elements...');
        this.updateMainDataSection(speed, avgSpeed, efficiency, timestamp);
        this.updateVehiclePerformance(speed, avgSpeed, distance, lapDistance, lap);
        this.updateElectricalSystem(volts, current, power, energyTotalWh, energyLap);
        this.updateEfficiencyMetrics(consumption, efficiency);
    
    // Update throttle and brake barometers
    const previousData = this.currentIndex > 0 ? this.csvData[this.currentIndex - 1] : null;
    this.updateThrottleBrakeBarometers(currentData, previousData);
    
    this.updateTimingStatus(raceTime, lapTime, remainingTime, remainingDistance);
    this.updateLocation(currentData.gps_latitude, currentData.gps_longitude);
    console.log(' DOM elements updated');

    // Move to next data point
    this.currentIndex = (this.currentIndex + 1) % this.csvData.length;
  }

  updateSimulatedTelemetry() {
    // Fallback simulation when CSV data is not available
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.startTime;

    const speed = this.generateSpeed();
    const avgSpeed = this.calculateAverageSpeed(speed);
    const time = this.formatTime(elapsedTime);
    const laps = this.calculateLaps();
    const volts = this.generateVoltage();
    const current = this.generateCurrent(speed);
    // Generate simulated GPS coordinates
    const simulatedLat = 25.4885 + (Math.sin(elapsedTime / 10000) * 0.01);
    const simulatedLon = 51.4503 + (Math.cos(elapsedTime / 10000) * 0.01);
    
    const location = this.getLocationFromGPS(simulatedLat, simulatedLon);
    const efficiency = this.calculateEfficiency(speed, current);
    const consumption = this.calculateConsumption(current, volts);

    this.storeDataForGraphs(volts, current, efficiency, consumption);

    this.updateElement('speed', Math.round(speed));
    this.updateElement('avgSpeed', Math.round(avgSpeed));
    this.updateElement('raceTime', time);
    this.updateElement('laps', laps);
    this.updateElement('lapCounter', `${laps}/4`); // Update header lap counter
    this.updateElement('volts', volts.toFixed(1));
    this.updateElement('current', current.toFixed(1));
    this.updateElement('location', location);
    this.updateElement('efficiency', Math.round(efficiency));
    this.updateElement('consumption', consumption.toFixed(1));
    
    // Update GPS coordinates and map
    this.updateElement('latitude', simulatedLat.toFixed(6));
    this.updateElement('longitude', simulatedLon.toFixed(6));
    if (window.leafletMapsTracker) {
      window.leafletMapsTracker.updatePosition(simulatedLat, simulatedLon);
    }
    
    const efficiencyBar = document.getElementById('efficiencyBar');
    efficiencyBar.style.width = efficiency + '%';
  }

  storeDataForGraphs(volts, current, efficiency, consumption) {
    // Store data points for graphs
    this.dataHistory.volts.push(volts);
    this.dataHistory.current.push(current);
    this.dataHistory.efficiency.push(efficiency);
    this.dataHistory.consumption.push(consumption);
    
    // Keep only the last maxDataPoints
    Object.keys(this.dataHistory).forEach(key => {
      if (this.dataHistory[key].length > this.maxDataPoints) {
        this.dataHistory[key].shift();
      }
    });
  }

  // Calculation methods
  calculateLapConsumption(energyLap, distance) {
    const lapDistance = distance - this.lapStartDistance;
    return lapDistance > 0 ? energyLap / lapDistance : 0;
  }
  
  calculateLapTime(lap, timestamp) {
    if (lap !== this.currentLap) {
      this.currentLap = lap;
      this.lapStartTime = timestamp;
    }
    
    if (this.lapStartTime && timestamp > this.lapStartTime) {
      const lapSeconds = timestamp - this.lapStartTime;
      const minutes = Math.floor(lapSeconds / 60);
      const seconds = Math.floor(lapSeconds % 60);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return '00:00';
  }
  
  calculateRemainingTimeFromTimestamp(timestamp) {
    if (!this.raceStartTime) return '35:00';
    
    const elapsedSeconds = timestamp - this.raceStartTime;
    const remainingSeconds = Math.max(0, this.targetRaceTime - elapsedSeconds);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
    updateLapTracking(lap, distance, energyTotalWh, timestamp) {
        if (lap !== this.currentLap) {
            this.currentLap = lap;
            this.lapStartDistance = distance;
            this.lapStartEnergy = energyTotalWh;
      this.lapStartTime = timestamp;
    }
  }

  formatRaceTime(timestamp) {
    if (!this.raceStartTime) return '00:00';
    
    const elapsedSeconds = timestamp - this.raceStartTime;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = Math.floor(elapsedSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getLocationFromGPS(lat, lon) {
    // Simple location mapping based on GPS coordinates
    // You can enhance this with actual track mapping
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (latitude >= 25.4884 && latitude <= 25.4885) {
      if (longitude >= 51.4503) return 'Start/Finish Line';
      if (longitude >= 51.4502) return 'Turn 1';
      if (longitude >= 51.4501) return 'Turn 2';
      return 'Turn 3';
    }
    
    return 'Track Section';
  }

  // Graph methods removed - now using flip effect with placeholder

  generateSpeed() {
    // Simulate realistic speed variations
    const baseSpeed = 180 + Math.sin(Date.now() / 10000) * 40;
    const variation = (Math.random() - 0.5) * 20;
    return Math.max(0, baseSpeed + variation);
  }

  calculateAverageSpeed(currentSpeed) {
    this.speedHistory.push(currentSpeed);
    if (this.speedHistory.length > 100) {
      this.speedHistory.shift();
    }
    return this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length;
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  calculateLaps() {
    this.totalDistance += this.generateSpeed() * 0.1 / 3600; // Convert to km
    const trackLength = 4.5; // km
    this.lapCount = Math.floor(this.totalDistance / trackLength);
    return this.lapCount;
  }

  generateVoltage() {
    // Simulate battery voltage decreasing over time
    const baseVoltage = 48.0;
    const discharge = (Date.now() - this.startTime) / 1000000; // Gradual discharge
    return Math.max(42.0, baseVoltage - discharge);
  }

  generateCurrent(speed) {
    // Higher speed = higher current draw
    const baseCurrent = 50 + (speed / 200) * 100;
    const variation = (Math.random() - 0.5) * 20;
    return Math.max(0, baseCurrent + variation);
  }

  updateLocation() {
    // Change location every few seconds
    if (Math.random() < 0.01) {
      this.currentLocationIndex = (this.currentLocationIndex + 1) % this.locations.length;
    }
    return this.locations[this.currentLocationIndex];
  }

  calculateEfficiency(speed, current) {
    // Efficiency based on speed vs current ratio
    const optimalSpeed = 200;
    const speedFactor = Math.max(0, 1 - Math.abs(speed - optimalSpeed) / optimalSpeed);
    const currentFactor = Math.max(0, 1 - (current - 50) / 100);
    return Math.min(100, (speedFactor + currentFactor) * 50);
  }

  calculateConsumption(current, voltage) {
    const power = current * voltage; // Watts
    const speed = this.generateSpeed(); // km/h
    return speed > 0 ? power / speed : 0; // Wh/km
  }

  // Update methods for different sections
  updateVehiclePerformance(speed, avgSpeed, distance, lapDistance, lap) {
    // Calculate elapsed time from race start
    const elapsedTime = this.raceStartTime ? (this.csvData[this.currentIndex].obc_timestamp - this.raceStartTime) : 0;
    const remainingTime = this.calculateRemainingTime(elapsedTime);
    this.updateCombinedTelemetryCard(speed, avgSpeed, distance, lap, elapsedTime, remainingTime);
    
    // Update the prominent lap counter in header
    this.updateElement('lapCounter', `${lap}/4`);
  }
  
  updateCombinedTelemetryCard(speed, avgSpeed, distance, lap, elapsedTime, remainingTime) {
    // Update Average Speed
    this.updateElement('avgSpeed', avgSpeed.toFixed(1));
    this.updateAvgSpeedIndicator(avgSpeed);
    
    // Update Remaining Time
    this.updateElement('remainingTime', remainingTime);
    this.updateRemainingTimeIndicator(remainingTime, lap);
    
        // Update Distance Covered
        this.updateElement('distanceCovered', distance.toFixed(2));
        this.updateDistanceIndicator(distance);
        
        // Update Overall Status Indicator
        this.updateOverallStatusIndicator(avgSpeed, remainingTime, lap, distance);
  }
  
  updateAvgSpeedIndicator(avgSpeed) {
    const indicator = document.getElementById('avgSpeedIndicator');
    if (indicator) {
      if (avgSpeed >= 60) {
        indicator.className = 'status-indicator good';
      } else if (avgSpeed >= 45) {
        indicator.className = 'status-indicator warning';
      } else {
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateRemainingTimeIndicator(remainingTimeString, lap) {
    const indicator = document.getElementById('remainingTimeIndicator');
    if (indicator) {
      // Parse the MM:SS format to get total seconds
      const [minutes, seconds] = remainingTimeString.split(':').map(Number);
      const remainingSeconds = minutes * 60 + seconds;
      const remainingMinutes = remainingSeconds / 60;
      
      const lapsRemaining = Math.max(1, 4 - lap);
      const timePerLapNeeded = remainingMinutes / lapsRemaining;
      
      if (timePerLapNeeded >= 8) { // Good - plenty of time
        indicator.className = 'status-indicator good';
      } else if (timePerLapNeeded >= 6) { // Warning - tight but manageable
        indicator.className = 'status-indicator warning';
      } else { // Danger - not enough time
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateDistanceIndicator(distance) {
    const indicator = document.getElementById('distanceIndicator');
    if (indicator) {
      const targetDistance = 14.8; // Total race distance
      const progress = (distance / targetDistance) * 100;
      
      if (progress >= 75) { // Good - almost done
        indicator.className = 'status-indicator good';
      } else if (progress >= 50) { // Warning - halfway
        indicator.className = 'status-indicator warning';
      } else { // Danger - early in race
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateAvgLapTimeIndicator(avgLapTime) {
    const indicator = document.getElementById('avgLapTimeIndicator');
    if (indicator) {
      const lapTimeMinutes = avgLapTime / 60;
      
      if (lapTimeMinutes <= 7) { // Good - fast laps
        indicator.className = 'status-indicator good';
      } else if (lapTimeMinutes <= 9) { // Warning - average pace
        indicator.className = 'status-indicator warning';
      } else { // Danger - slow laps
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateOverallStatusIndicator(avgSpeed, remainingTime, lap, distance) {
    const indicator = document.getElementById('overallStatusIndicator');
    if (indicator) {
      // Calculate overall race status
      const remainingMinutes = remainingTime / 60;
      const lapsRemaining = 4 - lap;
      const timePerLapNeeded = remainingMinutes / lapsRemaining;
      const lapTimeMinutes = (remainingTime / lap) / 60;
      
      // Overall assessment
      let status = 'good';
      if (avgSpeed < 45 || timePerLapNeeded < 6 || lapTimeMinutes > 9) {
        status = 'danger';
      } else if (avgSpeed < 60 || timePerLapNeeded < 8 || lapTimeMinutes > 7) {
        status = 'warning';
      }
      
      indicator.className = `status-indicator ${status}`;
    }
  }
  
  calculateAvgLapTime(elapsedTime, lap) {
    if (lap <= 0) return 0;
    return elapsedTime / lap;
  }
  
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  calculateElapsedTime() {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    return (Date.now() - this.startTime) / 1000;
  }
  
  calculateRemainingTime(elapsedTime) {
    const totalTime = 35 * 60; // 35 minutes in seconds
    const remainingSeconds = Math.max(0, totalTime - elapsedTime);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
    updateElectricalSystem(volts, current, power, energyTotalWh, energyLap) {
        // Update Voltage (V) → jm3_voltage / 1000
        this.updateElementWithColor('voltage', volts.toFixed(1), this.getVoltageColor(volts));
        
        // Update Current (A) → jm3_current / 1000
        this.updateElementWithColor('current', current.toFixed(1), this.getCurrentColor(current));
        
        // Update Power (W) → (V × A)
        this.updateElementWithColor('power', Math.round(power), this.getPowerColor(power));
        
        // Update Total Energy Used (Wh) → jm3_netjoule / 3600
        this.updateElementWithColor('totalEnergy', energyTotalWh.toFixed(0), this.getEnergyColor(energyTotalWh));
        
        // Update Lap Energy (Wh) → lap_jm3_netjoule / 3600
        this.updateElementWithColor('lapEnergy', energyLap.toFixed(0), this.getEnergyColor(energyLap));
    }
  
  updateVoltageIndicator(volts) {
    const indicator = document.getElementById('voltageIndicator');
    if (indicator) {
      if (volts >= 45 && volts <= 55) { // Good voltage range
        indicator.className = 'status-indicator good';
      } else if (volts >= 40 && volts <= 60) { // Warning range
        indicator.className = 'status-indicator warning';
      } else { // Danger - too low or too high
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateCurrentIndicator(current) {
    const indicator = document.getElementById('currentIndicator');
    if (indicator) {
      if (current >= 5 && current <= 25) { // Good current range
        indicator.className = 'status-indicator good';
      } else if (current >= 2 && current <= 30) { // Warning range
        indicator.className = 'status-indicator warning';
      } else { // Danger - too low or too high
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updatePowerIndicator(power) {
    const indicator = document.getElementById('powerIndicator');
    if (indicator) {
      if (power >= 200 && power <= 1200) { // Good power range
        indicator.className = 'status-indicator good';
      } else if (power >= 100 && power <= 1500) { // Warning range
        indicator.className = 'status-indicator warning';
      } else { // Danger - too low or too high
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateTotalEnergyIndicator(energyTotalWh) {
    const indicator = document.getElementById('totalEnergyIndicator');
    if (indicator) {
      const maxEnergy = 2000; // Maximum allowed energy in Wh
      const energyPercent = (energyTotalWh / maxEnergy) * 100;
      
      if (energyPercent <= 60) { // Good - plenty of energy left
        indicator.className = 'status-indicator good';
      } else if (energyPercent <= 80) { // Warning - getting low
        indicator.className = 'status-indicator warning';
      } else { // Danger - very low energy
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateLapEnergyIndicator(energyLap) {
    const indicator = document.getElementById('lapEnergyIndicator');
    if (indicator) {
      const targetLapEnergy = 500; // Target energy per lap in Wh
      
      if (energyLap <= targetLapEnergy * 0.8) { // Good - efficient lap
        indicator.className = 'status-indicator good';
      } else if (energyLap <= targetLapEnergy * 1.2) { // Warning - average efficiency
        indicator.className = 'status-indicator warning';
      } else { // Danger - inefficient lap
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateElectricalStatusIndicator(volts, current, energyTotalWh, energyLap) {
    const indicator = document.getElementById('electricalStatusIndicator');
    if (indicator) {
      // Calculate overall electrical health
      let status = 'good';
      
      // Check voltage
      if (volts < 40 || volts > 60) status = 'danger';
      else if (volts < 45 || volts > 55) status = 'warning';
      
      // Check current
      if (current < 2 || current > 30) status = 'danger';
      else if (current < 5 || current > 25) status = 'warning';
      
      // Check total energy
      const maxEnergy = 2000;
      const energyPercent = (energyTotalWh / maxEnergy) * 100;
      if (energyPercent > 80) status = 'danger';
      else if (energyPercent > 60) status = 'warning';
      
      // Check lap energy efficiency
      const targetLapEnergy = 500;
      if (energyLap > targetLapEnergy * 1.2) status = 'danger';
      else if (energyLap > targetLapEnergy * 1.0) status = 'warning';
      
      indicator.className = `status-indicator ${status}`;
    }
  }
  
  updateElementWithColor(id, value, colorClass) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      element.className = colorClass;
    }
  }
  
  getVoltageColor(volts) {
    if (volts < 42) return 'reading-low';  // Low voltage warning
    if (volts > 60) return 'reading-high';  // High voltage warning
    return 'reading-ok';           // Normal voltage
  }
  
  getCurrentColor(current) {
    if (current < 5) return 'reading-low';  // Low current
    if (current > 30) return 'reading-high'; // High current warning
    return 'reading-ok';           // Normal current
  }
  
    updateEfficiencyMetrics(consumption, efficiency) {
        // Update Consumption (Wh/km) → Total Energy (Wh) ÷ Distance (km)
        this.updateElementWithColor('consumption', consumption.toFixed(0), this.getConsumptionColor(consumption));
    }
  
  updateEfficiencyIndicator(efficiency) {
    const indicator = document.getElementById('efficiencyIndicator');
    if (indicator) {
      if (efficiency >= 45) { // Good efficiency
        indicator.className = 'status-indicator good';
      } else if (efficiency >= 30) { // Warning efficiency
        indicator.className = 'status-indicator warning';
      } else { // Danger - low efficiency
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateConsumptionIndicator(consumption) {
    const indicator = document.getElementById('consumptionIndicator');
    if (indicator) {
      if (consumption <= 200) { // Good - low consumption
        indicator.className = 'status-indicator good';
      } else if (consumption <= 300) { // Warning - moderate consumption
        indicator.className = 'status-indicator warning';
      } else { // Danger - high consumption
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateEfficiencyStatusIndicator(efficiency, consumption) {
    const indicator = document.getElementById('efficiencyStatusIndicator');
    if (indicator) {
      let status = 'good';
      
      // Check efficiency
      if (efficiency < 30) status = 'danger';
      else if (efficiency < 45) status = 'warning';
      
      // Check consumption
      if (consumption > 300) status = 'danger';
      else if (consumption > 200) status = 'warning';
      
      indicator.className = `status-indicator ${status}`;
    }
  }
  
  updateThrottleBrakeBarometers(currentData, previousData) {
    // Calculate throttle and brake flags
    const throttleFlag = this.calculateThrottleFlag(currentData, previousData);
    const brakeFlag = this.calculateBrakeFlag(currentData, previousData);
    
    // Update throttle barometer
    this.updateThrottleBarometer(throttleFlag);
    
    // Update brake barometer
    this.updateBrakeBarometer(brakeFlag);
  }
  
  calculateThrottleFlag(currentData, previousData) {
    if (!previousData) return false;
    
    const current = parseFloat(currentData.jm3_current) / 1000;
    const speed = parseFloat(currentData.gps_speed);
    const prevSpeed = parseFloat(previousData.gps_speed);
    const speedDiff = speed - prevSpeed;
    
    // Throttle when current > threshold AND speed is increasing
    const throttleThreshold = 10; // A
    return (current > throttleThreshold) && (speedDiff > 0);
  }
  
  calculateBrakeFlag(currentData, previousData) {
    if (!previousData) return false;
    
    const current = parseFloat(currentData.jm3_current) / 1000;
    const speed = parseFloat(currentData.gps_speed);
    const prevSpeed = parseFloat(previousData.gps_speed);
    const acceleration = (speed - prevSpeed) / 1; // Assuming 1 second intervals
    
    // Brake when acceleration < -0.5 AND current < 2A
    return (acceleration < -0.5) && (current < 2);
  }
  
  updateThrottleBarometer(throttleFlag) {
    const barometer = document.getElementById('throttleBarometer');
    
    if (barometer) {
      // Calculate throttle percentage based on recent throttle activity
      this.throttleHistory = this.throttleHistory || [];
      this.throttleHistory.push(throttleFlag ? 1 : 0);
      
      // Keep only last 10 readings
      if (this.throttleHistory.length > 10) {
        this.throttleHistory.shift();
      }
      
      // Calculate average throttle activity
      const throttlePercent = (this.throttleHistory.reduce((a, b) => a + b, 0) / this.throttleHistory.length) * 100;
      
      barometer.style.width = `${throttlePercent}%`;
      
      // Add throttle class for styling
      barometer.className = 'barometer-fill throttle';
    }
  }
  
  updateBrakeBarometer(brakeFlag) {
    const barometer = document.getElementById('brakeBarometer');
    
    if (barometer) {
      // Calculate brake percentage based on recent brake activity
      this.brakeHistory = this.brakeHistory || [];
      this.brakeHistory.push(brakeFlag ? 1 : 0);
      
      // Keep only last 10 readings
      if (this.brakeHistory.length > 10) {
        this.brakeHistory.shift();
      }
      
      // Calculate average brake activity
      const brakePercent = (this.brakeHistory.reduce((a, b) => a + b, 0) / this.brakeHistory.length) * 100;
      
      barometer.style.width = `${brakePercent}%`;
      
      // Add brake class for styling
      barometer.className = 'barometer-fill brake';
    }
  }
  
  updateTimingStatus(raceTime, lapTime, remainingTime, remainingDistance) {
    this.updateElement('raceTime', raceTime);
    this.updateElement('lapTime', lapTime);
    this.updateElement('remainingTime', remainingTime);
    this.updateElement('remainingDistance', remainingDistance.toFixed(1));
  }
  
    updateAlerts(volts, current, energyTotalWh) {
    // Voltage alert
    const voltageAlert = document.getElementById('voltageAlert');
    if (volts < this.voltageThreshold) {
      voltageAlert.className = 'alert-item danger';
      voltageAlert.querySelector('.alert-text').textContent = `LOW VOLTAGE: ${volts.toFixed(1)}V`;
    } else {
      voltageAlert.className = 'alert-item';
      voltageAlert.querySelector('.alert-text').textContent = `Voltage OK: ${volts.toFixed(1)}V`;
    }
    
    // Current alert
    const currentAlert = document.getElementById('currentAlert');
    if (current > this.currentThreshold) {
      currentAlert.className = 'alert-item warning';
      currentAlert.querySelector('.alert-text').textContent = `HIGH CURRENT: ${current.toFixed(1)}A`;
    } else {
      currentAlert.className = 'alert-item';
      currentAlert.querySelector('.alert-text').textContent = `Current OK: ${current.toFixed(1)}A`;
    }
    
    // Energy alert
    const energyAlert = document.getElementById('energyAlert');
    const energyRemaining = this.energyBudget - energyTotalWh;
    if (energyRemaining < 200) {
      energyAlert.className = 'alert-item danger';
      energyAlert.querySelector('.alert-text').textContent = `LOW ENERGY: ${energyRemaining.toFixed(0)}Wh left`;
    } else if (energyRemaining < 500) {
      energyAlert.className = 'alert-item warning';
      energyAlert.querySelector('.alert-text').textContent = `Energy: ${energyRemaining.toFixed(0)}Wh left`;
    } else {
      energyAlert.className = 'alert-item';
      energyAlert.querySelector('.alert-text').textContent = `Energy OK: ${energyRemaining.toFixed(0)}Wh left`;
    }
  }
  
  updateLocation(lat, lon) {
    // Parse GPS coordinates properly
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    // Only update if coordinates are valid
    if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
      console.log(' Invalid GPS coordinates:', { lat, lon });
      return;
    }
    
    console.log(`📍 Updating location: ${latitude}, ${longitude}`);
    
    const location = this.getLocationFromGPS(latitude, longitude);
    this.updateElement('location', location);
    
    // Update GPS coordinates display
    this.updateElement('latitude', latitude.toFixed(6));
    this.updateElement('longitude', longitude.toFixed(6));
    
    // Update 2D Track Visualizer with new position
    if (window.trackVisualizer) {
      console.log(` Updating 2D Track Visualizer: ${latitude}, ${longitude}`);
      window.trackVisualizer.updatePosition(latitude, longitude);
    } else {
      console.log(' 2D Track Visualizer not available yet');
    }
  }

  // Update main data section with color coding
  updateMainDataSection(speed, avgSpeed, efficiency, timestamp) {
    // Update timer with progress bar
    const elapsedMinutes = (timestamp - this.raceStartTime) / 60;
    const totalMinutes = 35; // 35 minute race limit
    const progressPercent = Math.min((elapsedMinutes / totalMinutes) * 100, 100);
    
    this.updateElement('mainTimer', this.formatRaceTime(timestamp));
    this.updateTimerProgress(progressPercent);
    this.updateTimerColor(progressPercent);
    
    // Update speed with color coding
    this.updateElement('mainSpeed', Math.round(speed));
    this.updateSpeedColor(speed, avgSpeed);
    
    // Update efficiency with color coding
    this.updateElement('mainEfficiency', efficiency.toFixed(1));
    this.updateEfficiencyColor(efficiency);
  }
  
  updateTimerProgress(percent) {
    // Timer progress removed - keeping simple timer display
  }
  
  updateTimerColor(progressPercent) {
    const timerElement = document.getElementById('mainTimer');
    if (timerElement) {
      timerElement.className = 'main-data-value';
      if (progressPercent < 33) {
        timerElement.classList.add('timer-green');
      } else if (progressPercent < 66) {
        timerElement.classList.add('timer-yellow');
      } else {
        timerElement.classList.add('timer-red');
      }
    }
  }
  
  updateSpeedColor(speed, avgSpeed) {
    const speedElement = document.getElementById('mainSpeed');
    if (speedElement) {
      speedElement.className = 'main-data-value';
      const speedDiff = Math.abs(speed - avgSpeed);
      const tolerance = avgSpeed * 0.1; // 10% tolerance
      
      if (speedDiff <= tolerance) {
        speedElement.classList.add('speed-green'); // Around average speed
      } else if (speed > avgSpeed) {
        speedElement.classList.add('speed-red'); // Higher than average
      } else {
        speedElement.classList.add('speed-yellow'); // Slower than average
      }
    }
  }
  
  updateEfficiencyColor(efficiency) {
    const efficiencyElement = document.getElementById('mainEfficiency');
    if (efficiencyElement) {
      efficiencyElement.className = 'main-data-value';
      if (efficiency < 40) {
        efficiencyElement.classList.add('efficiency-red');
      } else if (efficiency < 55) {
        efficiencyElement.classList.add('efficiency-yellow');
      } else {
        efficiencyElement.classList.add('efficiency-green');
      }
    }
  }

  // Color coding methods for metric values
  getVoltageColor(volts) {
    if (volts < 42) return 'metric-low';  // Low voltage warning
    if (volts > 60) return 'metric-high';  // High voltage warning
    return 'metric-good';          // Good voltage range
  }
  
  getCurrentColor(current) {
    if (current < 2) return 'metric-low';  // Low current
    if (current > 30) return 'metric-high'; // High current warning
    return 'metric-good';          // Good current range
  }
  
  getPowerColor(power) {
    if (power < 100) return 'metric-low';  // Low power
    if (power > 1500) return 'metric-high'; // High power warning
    return 'metric-good';          // Good power range
  }
  
  getEnergyColor(energy) {
    if (energy < 100) return 'metric-low'; // Low energy usage
    if (energy > 1500) return 'metric-high'; // High energy usage
    return 'metric-good';          // Good energy range
  }
  
  getConsumptionColor(consumption) {
    if (consumption < 200) return 'metric-good'; // Good consumption
    if (consumption < 300) return 'metric-warning'; // Warning consumption
    return 'metric-high';             // High consumption
  }
  
  getEfficiencyColor(efficiency) {
    if (efficiency >= 45) return 'metric-good';     // Good efficiency
    if (efficiency >= 30) return 'metric-warning';  // Warning efficiency
    return 'metric-high';                            // Low efficiency
  }
  
  updateElementWithColor(id, value, colorClass) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      element.className = `metric-value ${colorClass}`;
      console.log(` Updated element ${id} with value: ${value} (${colorClass})`);
    } else {
      console.error(` Element with id '${id}' not found!`);
    }
  }
  
    updateConsumption(consumption) {
        // This method is called but consumption is already updated in updateCombinedTelemetryCard
        // Keeping it for consistency
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`Updated element ${id} with value: ${value}`);
        } else {
            console.error(`Element with id '${id}' not found!`);
        }
    }
}

// Initialize the comprehensive racing telemetry dashboard
document.addEventListener('DOMContentLoaded', () => {
  console.log(' Initializing Racing Telemetry Dashboard...');
  window.racingDashboard = new RacingTelemetryDashboard();
  
  // Dashboard displays comprehensive racing metrics in real-time
  // All calculations are based on actual CSV telemetry data
  console.log(' Racing Telemetry Dashboard initialized');
});
