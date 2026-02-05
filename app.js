
// ✅ Configuration
const CONFIG = {
    // Device-specific configuration (must match ESP32 firmware)
    deviceId: 'DB001',  // Must match DEVICE_ID in ESP32 firmware
    baseTopic: 'atomic', // Must match BASE_TOPIC in ESP32 firmware
    
    // MQTT Configuration for HiveMQ Cloud
    mqtt: {
        server: '0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud',
        username: 'SMARTHOMEDB',
        password: 'Aa1234567@',
        port: 8883,
        clientId: 'atomic-pwa-' + Math.random().toString(16).substr(2, 8)
    },
    
    // App configuration
    app: {
        version: '2.0.0',
        logRetention: 100,
        reconnectDelay: 3000,
        heartbeatInterval: 30000,
        scheduleCheckInterval: 60000
    }
};

// ✅ Relay Configuration (16 relays matching ESP32 firmware)
const RELAYS = [
    { id: 1, name: "Main Lights", icon: "fa-lightbulb", state: false, pin: 16 },
    { id: 2, name: "Kitchen", icon: "fa-utensils", state: false, pin: 17 },
    { id: 3, name: "Living Room", icon: "fa-couch", state: false, pin: 18 },
    { id: 4, name: "Bedroom 1", icon: "fa-bed", state: false, pin: 19 },
    { id: 5, name: "Bedroom 2", icon: "fa-bed", state: false, pin: 21 },
    { id: 6, name: "Bedroom 3", icon: "fa-bed", state: false, pin: 22 },
    { id: 7, name: "Bathroom", icon: "fa-bath", state: false, pin: 23 },
    { id: 8, name: "Water Heater", icon: "fa-fire", state: false, pin: 25 },
    { id: 9, name: "AC Unit 1", icon: "fa-snowflake", state: false, pin: 26 },
    { id: 10, name: "AC Unit 2", icon: "fa-snowflake", state: false, pin: 27 },
    { id: 11, name: "Security Lights", icon: "fa-shield-alt", state: false, pin: 32 },
    { id: 12, name: "Garage Door", icon: "fa-garage", state: false, pin: 33 },
    { id: 13, name: "Water Pump", icon: "fa-tint", state: false, pin: 12 },
    { id: 14, name: "Garden Lights", icon: "fa-tree", state: false, pin: 13 },
    { id: 15, name: "Entertainment", icon: "fa-tv", state: false, pin: 14 },
    { id: 16, name: "Main Supply", icon: "fa-bolt", state: false, pin: 15 }
];

// ✅ Preset Modes (matching ESP32 command structure)
const PRESET_MODES = {
    'home': {
        name: 'Home Mode',
        description: 'Lights & Essentials for comfortable living',
        icon: 'fa-home',
        relays: [1, 2, 3, 4, 5, 6, 7, 13], // ON relays
        state: true
    },
    
    'away': {
        name: 'Away Mode',
        description: 'Security lighting while away',
        icon: 'fa-car',
        relays: [11, 12], // Security lights and garage
        state: true
    },
    
    'night': {
        name: 'Night Mode',
        description: 'Only bedrooms for sleeping',
        icon: 'fa-moon',
        relays: [4, 5, 6, 11], // Bedrooms + security
        state: true
    },
    
    'energy': {
        name: 'Energy Save',
        description: 'Minimal power consumption',
        icon: 'fa-leaf',
        relays: [13, 16], // Water pump + main supply only
        state: true
    },
    
    'party': {
        name: 'Party Mode',
        description: 'All lights and entertainment',
        icon: 'fa-music',
        relays: [1, 2, 3, 7, 11, 14, 15], // Entertainment + lights
        state: true
    },
    
    'morning': {
        name: 'Morning Routine',
        description: 'Morning preparation',
        icon: 'fa-sun',
        relays: [1, 2, 7, 8, 13], // Lights, kitchen, water heater
        state: true
    }
};

// ✅ Application State
const AppState = {
    mqttClient: null,
    isConnected: false,
    startTime: Date.now(),
    messageCount: 0,
    schedules: [],
    scheduleInterval: null,
    heartbeatInterval: null,
    config: { ...CONFIG },
    
    // DOM Elements (will be initialized)
    elements: {},
    
    // Statistics
    stats: {
        relaysOn: 0,
        relaysOff: 16,
        lastUpdate: null,
        wifiStrength: 0,
        uptime: 0
    }
};

// ✅ Initialize Application
function initApp() {
    console.log('🚀 Initializing Atomic Smart DB PWA v' + AppState.config.app.version);
    
    // Load saved configuration
    loadSavedConfig();
    
    // Initialize DOM elements
    initDOMElements();
    
    // Initialize UI
    initUI();
    
    // Initialize schedules
    initSchedules();
    
    // Connect to MQTT
    setTimeout(connectMQTT, 1000);
    
    // Start background tasks
    startBackgroundTasks();
    
    logMessage('📱 PWA initialized successfully');
    showToast('Welcome to Atomic Smart DB!', 'success');
}

// ✅ Load saved configuration from localStorage
function loadSavedConfig() {
    try {
        const savedConfig = localStorage.getItem('atomic-smart-config');
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            
            // Update device-specific config
            if (parsed.deviceId) AppState.config.deviceId = parsed.deviceId;
            if (parsed.baseTopic) AppState.config.baseTopic = parsed.baseTopic;
            
            // Update MQTT config
            if (parsed.mqtt) {
                if (parsed.mqtt.server) AppState.config.mqtt.server = parsed.mqtt.server;
                if (parsed.mqtt.username) AppState.config.mqtt.username = parsed.mqtt.username;
                if (parsed.mqtt.password) AppState.config.mqtt.password = parsed.mqtt.password;
                if (parsed.mqtt.port) AppState.config.mqtt.port = parsed.mqtt.port;
            }
            
            console.log('📂 Loaded saved configuration');
        }
    } catch (error) {
        console.error('❌ Error loading config:', error);
    }
}

// ✅ Save configuration to localStorage
function saveConfig() {
    try {
        localStorage.setItem('atomic-smart-config', JSON.stringify(AppState.config));
        console.log('💾 Configuration saved');
    } catch (error) {
        console.error('❌ Error saving config:', error);
    }
}

// ✅ Initialize DOM Elements
function initDOMElements() {
    AppState.elements = {
        // Status elements
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        connectionDetails: document.getElementById('connectionDetails'),
        mqttBroker: document.getElementById('mqttBroker'),
        
        // Stats elements
        statOn: document.getElementById('statOn'),
        statOff: document.getElementById('statOff'),
        statTotal: document.getElementById('statTotal'),
        deviceStats: document.getElementById('deviceStats'),
        deviceName: document.getElementById('deviceName'),
        deviceId: document.getElementById('deviceId'),
        
        // Relay grids
        relaysGrid: document.getElementById('relaysGrid'),
        advancedControlsGrid: document.getElementById('advancedControlsGrid'),
        presetsGrid: document.getElementById('presetsGrid'),
        
        // Activity log
        activityLog: document.getElementById('activityLog'),
        
        // Analytics
        analyticsDeviceId: document.getElementById('analyticsDeviceId'),
        analyticsMqttStatus: document.getElementById('analyticsMqttStatus'),
        analyticsWifiSignal: document.getElementById('analyticsWifiSignal'),
        analyticsUptime: document.getElementById('analyticsUptime'),
        analyticsMemory: document.getElementById('analyticsMemory'),
        analyticsActiveRelays: document.getElementById('analyticsActiveRelays'),
        
        // Chart
        chartOnCount: document.getElementById('chartOnCount'),
        chartOffCount: document.getElementById('chartOffCount'),
        
        // Settings inputs
        deviceIdInput: document.getElementById('deviceIdInput'),
        mqttServer: document.getElementById('mqttServer'),
        mqttUsername: document.getElementById('mqttUsername'),
        mqttPassword: document.getElementById('mqttPassword'),
        mqttPort: document.getElementById('mqttPort'),
        baseTopic: document.getElementById('baseTopic'),
        
        // Schedule elements
        scheduleList: document.getElementById('scheduleList'),
        scheduleModal: document.getElementById('scheduleModal'),
        
        // Toast
        toast: document.getElementById('toast')
    };
    
    // Update UI with current config
    updateConfigUI();
}

// ✅ Update configuration UI
function updateConfigUI() {
    if (AppState.elements.deviceIdInput) {
        AppState.elements.deviceIdInput.value = AppState.config.deviceId;
    }
    if (AppState.elements.mqttServer) {
        AppState.elements.mqttServer.value = AppState.config.mqtt.server;
    }
    if (AppState.elements.mqttUsername) {
        AppState.elements.mqttUsername.value = AppState.config.mqtt.username;
    }
    if (AppState.elements.mqttPassword) {
        AppState.elements.mqttPassword.value = AppState.config.mqtt.password;
    }
    if (AppState.elements.mqttPort) {
        AppState.elements.mqttPort.value = AppState.config.mqtt.port;
    }
    if (AppState.elements.baseTopic) {
        AppState.elements.baseTopic.value = AppState.config.baseTopic;
    }
}

// ✅ Initialize UI
function initUI() {
    // Create relay cards for dashboard
    createRelayCards();
    
    // Create advanced controls for controls page
    createAdvancedControls();
    
    // Create preset buttons
    createPresetButtons();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update device info
    updateDeviceInfo();
    
    // Update statistics
    updateStats();
    
    console.log('🎨 UI initialized');
}

// ✅ Create relay cards for dashboard
function createRelayCards() {
    if (!AppState.elements.relaysGrid) return;
    
    AppState.elements.relaysGrid.innerHTML = '';
    
    RELAYS.forEach(relay => {
        const relayCard = document.createElement('div');
        relayCard.className = `relay-card ${relay.state ? 'active' : ''}`;
        relayCard.id = `relay-${relay.id}`;
        relayCard.innerHTML = `
            <div class="relay-header">
                <div class="relay-name">
                    <div class="relay-number">${relay.id}</div>
                    <div class="relay-title">
                        <i class="fas ${relay.icon}"></i>
                        ${relay.name}
                    </div>
                </div>
                <div class="relay-status">
                    <div class="status-led ${relay.state ? 'on' : ''}"></div>
                    <span class="status-text">${relay.state ? 'ON' : 'OFF'}</span>
                </div>
            </div>
            <div class="relay-controls">
                <button class="btn-relay on" onclick="controlRelay(${relay.id}, true)" ${relay.state ? 'disabled' : ''}>
                    <i class="fas fa-power-off"></i>
                    TURN ON
                </button>
                <button class="btn-relay off" onclick="controlRelay(${relay.id}, false)" ${!relay.state ? 'disabled' : ''}>
                    <i class="fas fa-power-off"></i>
                    TURN OFF
                </button>
            </div>
        `;
        AppState.elements.relaysGrid.appendChild(relayCard);
    });
    
    console.log(`🎯 Created ${RELAYS.length} relay cards`);
}

// ✅ Create advanced controls for controls page
function createAdvancedControls() {
    if (!AppState.elements.advancedControlsGrid) return;
    
    AppState.elements.advancedControlsGrid.innerHTML = '';
    
    RELAYS.forEach(relay => {
        const advancedCard = document.createElement('div');
        advancedCard.className = 'advanced-relay-card';
        advancedCard.innerHTML = `
            <div class="advanced-relay-header">
                <div class="relay-id">${relay.id}</div>
                <div class="relay-name">${relay.name}</div>
                <div class="relay-status-mini ${relay.state ? 'on' : 'off'}">
                    <i class="fas ${relay.icon}"></i>
                </div>
            </div>
            <div class="advanced-controls">
                <button class="btn-toggle ${relay.state ? 'on' : ''}" onclick="controlRelay(${relay.id}, true)">
                    ON
                </button>
                <button class="btn-toggle ${!relay.state ? 'off' : ''}" onclick="controlRelay(${relay.id}, false)">
                    OFF
                </button>
            </div>
            <div class="relay-info">
                <small>Pin: GPIO${relay.pin}</small>
                <small>State: <span class="state-indicator">${relay.state ? 'ON' : 'OFF'}</span></small>
            </div>
        `;
        AppState.elements.advancedControlsGrid.appendChild(advancedCard);
    });
}

// ✅ Create preset buttons
function createPresetButtons() {
    if (!AppState.elements.presetsGrid) return;
    
    AppState.elements.presetsGrid.innerHTML = '';
    
    Object.entries(PRESET_MODES).forEach(([id, preset]) => {
        const presetBtn = document.createElement('button');
        presetBtn.className = 'preset-btn';
        presetBtn.setAttribute('data-preset', id);
        presetBtn.innerHTML = `
            <i class="fas ${preset.icon}"></i>
            <span>${preset.name}</span>
            <small>${preset.description}</small>
        `;
        
        presetBtn.addEventListener('click', () => applyPreset(id));
        AppState.elements.presetsGrid.appendChild(presetBtn);
    });
    
    // Add custom preset button
    const customBtn = document.createElement('button');
    customBtn.className = 'preset-btn custom';
    customBtn.innerHTML = `
        <i class="fas fa-plus"></i>
        <span>Save Current</span>
        <small>Save as custom preset</small>
    `;
    customBtn.addEventListener('click', saveCurrentPreset);
    AppState.elements.presetsGrid.appendChild(customBtn);
}

// ✅ Setup event listeners
function setupEventListeners() {
    // Quick action buttons
    document.getElementById('btnAllOn')?.addEventListener('click', () => controlAllRelays(true));
    document.getElementById('btnAllOff')?.addEventListener('click', () => controlAllRelays(false));
    document.getElementById('btnRefresh')?.addEventListener('click', requestStatus);
    
    // Group buttons
    document.getElementById('btnGroupBedrooms')?.addEventListener('click', () => controlGroup([4, 5, 6], true));
    document.getElementById('btnGroupEssentials')?.addEventListener('click', () => controlGroup([1, 2, 13, 16], true));
    document.getElementById('btnRange1_8')?.addEventListener('click', () => controlRange(1, 8, true));
    document.getElementById('btnRange9_16')?.addEventListener('click', () => controlRange(9, 16, true));
    
    // Clear log button
    document.getElementById('btnClearLog')?.addEventListener('click', () => {
        if (AppState.elements.activityLog) {
            AppState.elements.activityLog.innerHTML = '';
            logMessage('📋 Log cleared');
        }
    });
    
    // Settings buttons
    document.getElementById('btnSaveMQTT')?.addEventListener('click', saveMQTTSettings);
    document.getElementById('btnSendWifiConfig')?.addEventListener('click', sendWiFiConfig);
    document.getElementById('btnFactoryReset')?.addEventListener('click', factoryResetDevice);
    document.getElementById('btnRebootDevice')?.addEventListener('click', rebootDevice);
    document.getElementById('btnExportConfig')?.addEventListener('click', exportConfig);
    document.getElementById('btnClearLocalData')?.addEventListener('click', clearLocalData);
    
    // Schedule buttons
    document.getElementById('btnAddSchedule')?.addEventListener('click', openScheduleModal);
    document.getElementById('btnSaveSchedule')?.addEventListener('click', saveSchedule);
    document.getElementById('btnCancelSchedule')?.addEventListener('click', closeScheduleModal);
    document.getElementById('btnCloseScheduleModal')?.addEventListener('click', closeScheduleModal);
    
    // Modal buttons
    document.getElementById('btnSettingsModal')?.addEventListener('click', openSettingsModal);
    document.getElementById('btnCloseModal')?.addEventListener('click', closeSettingsModal);
    document.getElementById('btnReconnect')?.addEventListener('click', reconnectMQTT);
    
    // Modal quick actions
    document.getElementById('modalAllOn')?.addEventListener('click', () => controlAllRelays(true));
    document.getElementById('modalAllOff')?.addEventListener('click', () => controlAllRelays(false));
    document.getElementById('modalRefresh')?.addEventListener('click', requestStatus);
    document.getElementById('modalRestore')?.addEventListener('click', restoreStates);
    
    // Fullscreen button
    document.getElementById('btnFullscreen')?.addEventListener('click', toggleFullscreen);
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') closeSettingsModal();
        if (e.target.id === 'scheduleModal') closeScheduleModal();
    });
    
    // Time update
    setInterval(updateTime, 1000);
    updateTime();
    
    // Uptime update
    setInterval(updateUptime, 1000);
    updateUptime();
    
    console.log('🎮 Event listeners setup complete');
}

// ✅ Update device information
function updateDeviceInfo() {
    if (AppState.elements.deviceName) {
        AppState.elements.deviceName.textContent = `Device: ${AppState.config.deviceId}`;
    }
    if (AppState.elements.deviceId) {
        AppState.elements.deviceId.textContent = AppState.config.deviceId;
    }
    if (AppState.elements.analyticsDeviceId) {
        AppState.elements.analyticsDeviceId.textContent = AppState.config.deviceId;
    }
}

// ✅ Update statistics
function updateStats() {
    const onCount = RELAYS.filter(r => r.state).length;
    const offCount = RELAYS.length - onCount;
    
    AppState.stats.relaysOn = onCount;
    AppState.stats.relaysOff = offCount;
    
    // Update dashboard stats
    if (AppState.elements.statOn) {
        AppState.elements.statOn.textContent = `${onCount} ON`;
        AppState.elements.statOn.className = onCount === 0 ? 'stat-badge muted' : 
                                           onCount === RELAYS.length ? 'stat-badge success' : 
                                           'stat-badge warning';
    }
    if (AppState.elements.statOff) {
        AppState.elements.statOff.textContent = `${offCount} OFF`;
    }
    if (AppState.elements.statTotal) {
        AppState.elements.statTotal.textContent = `${RELAYS.length} Total`;
    }
    if (AppState.elements.deviceStats) {
        AppState.elements.deviceStats.textContent = `${RELAYS.length} Relays • ${onCount} ON`;
    }
    
    // Update controls page stats
    const controlsStatOn = document.getElementById('controlsStatOn');
    const controlsStatOff = document.getElementById('controlsStatOff');
    if (controlsStatOn) controlsStatOn.textContent = `${onCount} ON`;
    if (controlsStatOff) controlsStatOff.textContent = `${offCount} OFF`;
    
    // Update analytics
    if (AppState.elements.analyticsActiveRelays) {
        AppState.elements.analyticsActiveRelays.textContent = onCount;
    }
    if (AppState.elements.chartOnCount) {
        AppState.elements.chartOnCount.textContent = onCount;
    }
    if (AppState.elements.chartOffCount) {
        AppState.elements.chartOffCount.textContent = offCount;
    }
    
    // Update chart
    updateRelayChart();
}

// ✅ Update relay chart
function updateRelayChart() {
    const chartContainer = document.getElementById('relayChart');
    if (!chartContainer) return;
    
    const onCount = AppState.stats.relaysOn;
    const offCount = AppState.stats.relaysOff;
    const total = RELAYS.length;
    
    chartContainer.innerHTML = '';
    
    // Create ON bar
    const onBar = document.createElement('div');
    onBar.className = 'chart-bar';
    onBar.style.height = `${(onCount / total) * 100}%`;
    onBar.style.background = 'hsl(var(--success))';
    chartContainer.appendChild(onBar);
    
    // Create OFF bar
    const offBar = document.createElement('div');
    offBar.className = 'chart-bar';
    offBar.style.height = `${(offCount / total) * 100}%`;
    offBar.style.background = 'hsl(var(--muted-foreground))';
    chartContainer.appendChild(offBar);
}

// ✅ MQTT Functions
function connectMQTT() {
    updateConnectionStatus('Connecting...', 'connecting');
    
    const options = {
        username: AppState.config.mqtt.username,
        password: AppState.config.mqtt.password,
        clientId: AppState.config.mqtt.clientId,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        keepalive: 60
    };
    
    try {
        AppState.mqttClient = mqtt.connect(AppState.config.mqtt.server, options);
        
        AppState.mqttClient.on('connect', () => {
            AppState.isConnected = true;
            updateConnectionStatus('Connected', 'connected');
            showToast('✅ Connected to MQTT broker', 'success');
            logMessage(`✅ Connected to MQTT broker: ${AppState.config.mqtt.server}`);
            
            // Subscribe to device-specific topics
            subscribeToTopics();
            
            // Request initial status
            setTimeout(requestStatus, 1000);
        });
        
        AppState.mqttClient.on('message', handleMQTTMessage);
        AppState.mqttClient.on('error', handleMQTTError);
        AppState.mqttClient.on('reconnect', () => updateConnectionStatus('Reconnecting...', 'connecting'));
        AppState.mqttClient.on('close', () => {
            AppState.isConnected = false;
            updateConnectionStatus('Disconnected', 'error');
        });
        
    } catch (error) {
        console.error('❌ MQTT connection error:', error);
        updateConnectionStatus('Failed', 'error');
        showToast(`Connection failed: ${error.message}`, 'error');
    }
}

// ✅ Subscribe to device-specific topics
function subscribeToTopics() {
    if (!AppState.mqttClient || !AppState.isConnected) return;
    
    const base = `${AppState.config.baseTopic}/${AppState.config.deviceId}`;
    
    // Subscribe to status topics
    AppState.mqttClient.subscribe(`${base}/status/+`, { qos: 1 });
    
    // Subscribe to device info topic
    AppState.mqttClient.subscribe(`${base}/device/info`, { qos: 1 });
    
    // Subscribe to heartbeat topic
    AppState.mqttClient.subscribe(`${base}/heartbeat`, { qos: 1 });
    
    // Subscribe to broadcast topics
    AppState.mqttClient.subscribe(`${AppState.config.baseTopic}/discovery`, { qos: 1 });
    
    logMessage(`📡 Subscribed to topics: ${base}/#`);
}

// ✅ Handle MQTT messages
function handleMQTTMessage(topic, message) {
    AppState.messageCount++;
    
    const msgStr = message.toString();
    logMessage(`📨 [${topic}]: ${msgStr}`);
    
    // Update message count
    if (AppState.elements.messageCount) {
        AppState.elements.messageCount.textContent = AppState.messageCount;
    }
    
    // Parse message based on topic
    if (topic.includes('/status/relay')) {
        // Relay status update
        handleRelayStatusUpdate(topic, msgStr);
    } else if (topic.includes('/device/info')) {
        // Device information
        handleDeviceInfo(msgStr);
    } else if (topic.includes('/heartbeat')) {
        // Device heartbeat
        handleHeartbeat(msgStr);
    } else if (topic.includes('/discovery')) {
        // Device discovery
        handleDiscovery(msgStr);
    }
}

// ✅ Handle relay status update
function handleRelayStatusUpdate(topic, message) {
    try {
        const data = JSON.parse(message);
        
        if (data.relay && data.state !== undefined) {
            const relayId = parseInt(data.relay);
            const state = data.state === 'ON' || data.state === true;
            
            updateRelayState(relayId, state);
            
            // Update analytics
            AppState.stats.lastUpdate = new Date();
            
            // Update analytics UI
            if (AppState.elements.analyticsMqttStatus) {
                AppState.elements.analyticsMqttStatus.textContent = 'Connected';
                AppState.elements.analyticsMqttStatus.className = 'value status-good';
            }
        }
    } catch (error) {
        console.error('❌ Error parsing relay status:', error);
    }
}

// ✅ Handle device information
function handleDeviceInfo(message) {
    try {
        const data = JSON.parse(message);
        
        // Update analytics with device info
        if (data.heap_free && AppState.elements.analyticsMemory) {
            const heapMB = (data.heap_free / 1024).toFixed(1);
            AppState.elements.analyticsMemory.textContent = `${heapMB}KB free`;
        }
        
        if (data.rssi && AppState.elements.analyticsWifiSignal) {
            AppState.elements.analyticsWifiSignal.textContent = `${data.rssi} dBm`;
        }
        
        if (data.uptime && AppState.elements.analyticsUptime) {
            const hours = Math.floor(data.uptime / 3600);
            const minutes = Math.floor((data.uptime % 3600) / 60);
            const seconds = data.uptime % 60;
            AppState.elements.analyticsUptime.textContent = 
                `${hours.toString().padStart(2, '0')}:` +
                `${minutes.toString().padStart(2, '0')}:` +
                `${seconds.toString().padStart(2, '0')}`;
        }
    } catch (error) {
        console.error('❌ Error parsing device info:', error);
    }
}

// ✅ Handle heartbeat
function handleHeartbeat(message) {
    try {
        const data = JSON.parse(message);
        AppState.stats.uptime = data.uptime || 0;
        AppState.stats.wifiStrength = data.rssi || 0;
        
        // Update connection status
        updateConnectionStatus('Connected', 'connected');
    } catch (error) {
        console.error('❌ Error parsing heartbeat:', error);
    }
}

// ✅ Handle discovery
function handleDiscovery(message) {
    try {
        const data = JSON.parse(message);
        if (data.device_id !== AppState.config.deviceId) {
            logMessage(`📡 Discovered device: ${data.device_id} at ${data.ip}`);
        }
    } catch (error) {
        console.error('❌ Error parsing discovery:', error);
    }
}

// ✅ Handle MQTT error
function handleMQTTError(error) {
    console.error('❌ MQTT Error:', error);
    updateConnectionStatus('Error', 'error');
    showToast(`MQTT error: ${error.message}`, 'error');
}

// ✅ Update connection status
function updateConnectionStatus(text, status) {
    if (AppState.elements.statusText) {
        AppState.elements.statusText.textContent = text;
    }
    if (AppState.elements.connectionDetails) {
        AppState.elements.connectionDetails.textContent = text;
    }
    if (AppState.elements.mqttBroker) {
        AppState.elements.mqttBroker.textContent = AppState.config.mqtt.server.split('/')[2];
    }
    
    if (AppState.elements.statusDot) {
        AppState.elements.statusDot.className = 'status-dot';
        if (status === 'connected') {
            AppState.elements.statusDot.classList.add('connected');
        } else if (status === 'error') {
            AppState.elements.statusDot.style.background = 'hsl(var(--destructive))';
        } else if (status === 'connecting') {
            AppState.elements.statusDot.style.background = 'hsl(var(--warning))';
        }
    }
    
    // Update modal status
    const modalStatus = document.getElementById('modalMqttStatus');
    if (modalStatus) {
        modalStatus.textContent = text;
        modalStatus.className = status === 'connected' ? 'status-badge connected' : 'status-badge';
    }
    
    // Update analytics status
    if (AppState.elements.analyticsMqttStatus) {
        AppState.elements.analyticsMqttStatus.textContent = text;
        AppState.elements.analyticsMqttStatus.className = status === 'connected' ? 'value status-good' : 'value';
    }
}

// ✅ Control Functions
function controlRelay(relayId, state) {
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        relay: relayId,
        state: state ? 'ON' : 'OFF'
    };
    
    publishCommand('relay/set', command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} relay ${relayId}`, 'info');
}

function controlAllRelays(state) {
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        all: true,
        state: state ? 'ON' : 'OFF'
    };
    
    publishCommand('relay/set', command);
    showToast(`${state ? 'Turning ALL relays ON' : 'Turning ALL relays OFF'}`, 'info');
}

function controlGroup(relayIds, state) {
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        relays: relayIds,
        state: state ? 'ON' : 'OFF'
    };
    
    publishCommand('relay/set', command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} relays ${relayIds.join(', ')}`, 'info');
}

function controlRange(start, end, state) {
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        start: start,
        end: end,
        state: state ? 'ON' : 'OFF'
    };
    
    publishCommand('relay/set', command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} relays ${start}-${end}`, 'info');
}

function applyPreset(presetId) {
    const preset = PRESET_MODES[presetId];
    if (!preset) {
        showToast('Preset not found', 'error');
        return;
    }
    
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        relays: preset.relays,
        state: preset.state ? 'ON' : 'OFF'
    };
    
    publishCommand('relay/set', command);
    showToast(`Applying ${preset.name}...`, 'info');
}

function saveCurrentPreset() {
    const presetName = prompt('Enter preset name:');
    if (!presetName) return;
    
    const relayStates = {};
    RELAYS.forEach(relay => {
        relayStates[relay.id] = relay.state;
    });
    
    const presetId = 'custom_' + presetName.toLowerCase().replace(/\s+/g, '_');
    
    // Save to localStorage
    const customPresets = JSON.parse(localStorage.getItem('atomic-custom-presets') || '{}');
    customPresets[presetId] = {
        name: presetName,
        description: 'Custom preset',
        icon: 'fa-star',
        relays: Object.keys(relayStates).filter(id => relayStates[id]),
        state: true
    };
    
    localStorage.setItem('atomic-custom-presets', JSON.stringify(customPresets));
    showToast(`Preset "${presetName}" saved!`, 'success');
    
    // Refresh presets
    loadCustomPresets();
}

function loadCustomPresets() {
    try {
        const customPresets = JSON.parse(localStorage.getItem('atomic-custom-presets') || '{}');
        Object.assign(PRESET_MODES, customPresets);
        
        // Refresh preset buttons
        createPresetButtons();
    } catch (error) {
        console.error('❌ Error loading custom presets:', error);
    }
}

function requestStatus() {
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        command: 'status'
    };
    
    publishCommand('command', command);
    showToast('Requesting status update...', 'info');
}

function restoreStates() {
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        command: 'restore'
    };
    
    publishCommand('command', command);
    showToast('Restoring relay states from EEPROM...', 'info');
}

// ✅ Publish command to MQTT
function publishCommand(subtopic, data) {
    if (!AppState.mqttClient || !AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const topic = `${AppState.config.baseTopic}/${AppState.config.deviceId}/${subtopic}`;
    const message = JSON.stringify(data);
    
    AppState.mqttClient.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
            console.error('❌ MQTT publish error:', error);
            showToast(`Failed to send command: ${error.message}`, 'error');
        } else {
            console.log(`✅ Published to ${topic}:`, data);
        }
    });
}

// ✅ Update relay state and UI
function updateRelayState(relayId, state) {
    const relay = RELAYS.find(r => r.id === relayId);
    if (!relay) return;
    
    relay.state = state;
    
    // Update dashboard card
    const card = document.getElementById(`relay-${relayId}`);
    if (card) {
        card.className = `relay-card ${state ? 'active' : ''}`;
        
        const led = card.querySelector('.status-led');
        const statusText = card.querySelector('.status-text');
        const btnOn = card.querySelector('.btn-relay.on');
        const btnOff = card.querySelector('.btn-relay.off');
        
        if (led) led.className = `status-led ${state ? 'on' : ''}`;
        if (statusText) statusText.textContent = state ? 'ON' : 'OFF';
        if (btnOn) btnOn.disabled = state;
        if (btnOff) btnOff.disabled = !state;
    }
    
    // Update advanced controls
    const advancedCard = document.querySelector(`#advancedControlsGrid .advanced-relay-card:nth-child(${relayId})`);
    if (advancedCard) {
        const btnOn = advancedCard.querySelector('.btn-toggle.on');
        const btnOff = advancedCard.querySelector('.btn-toggle.off');
        const stateIndicator = advancedCard.querySelector('.state-indicator');
        
        if (btnOn) btnOn.className = `btn-toggle ${state ? 'on' : ''}`;
        if (btnOff) btnOff.className = `btn-toggle ${!state ? 'off' : ''}`;
        if (stateIndicator) stateIndicator.textContent = state ? 'ON' : 'OFF';
    }
    
    // Update stats
    updateStats();
    
    // Log the change
    logMessage(`Relay ${relayId}: ${state ? 'ON' : 'OFF'}`);
}

// ✅ Schedule Functions
function initSchedules() {
    loadSchedules();
    renderSchedules();
    startScheduleChecker();
}

function loadSchedules() {
    try {
        const saved = localStorage.getItem('atomic-schedules');
        if (saved) {
            AppState.schedules = JSON.parse(saved);
            console.log(`📅 Loaded ${AppState.schedules.length} schedules`);
        } else {
            // Default schedules
            AppState.schedules = [
                {
                    id: '1',
                    name: 'Morning Routine',
                    time: '06:00',
                    preset: 'morning',
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                    enabled: true,
                    lastTriggered: null
                },
                {
                    id: '2',
                    name: 'Night Mode',
                    time: '22:00',
                    preset: 'night',
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                    enabled: true,
                    lastTriggered: null
                }
            ];
            saveSchedules();
        }
    } catch (error) {
        console.error('❌ Error loading schedules:', error);
    }
}

function saveSchedules() {
    localStorage.setItem('atomic-schedules', JSON.stringify(AppState.schedules));
}

function renderSchedules() {
    if (!AppState.elements.scheduleList) return;
    
    AppState.elements.scheduleList.innerHTML = '';
    
    if (AppState.schedules.length === 0) {
        AppState.elements.scheduleList.innerHTML = `
            <div class="no-schedules glass">
                <i class="fas fa-clock fa-2x"></i>
                <p>No schedules yet. Add your first schedule!</p>
            </div>
        `;
        return;
    }
    
    AppState.schedules.forEach(schedule => {
        const scheduleItem = document.createElement('div');
        scheduleItem.className = 'schedule-item glass';
        scheduleItem.id = `schedule-${schedule.id}`;
        
        const daysDisplay = schedule.days.map(day => 
            `<span class="day-badge">${day.toUpperCase().substring(0, 2)}</span>`
        ).join('');
        
        scheduleItem.innerHTML = `
            <div class="schedule-info">
                <div class="schedule-time">
                    <i class="fas fa-clock"></i>
                    <span>${schedule.time}</span>
                </div>
                <div class="schedule-action">${schedule.name}</div>
                <div class="schedule-days">${daysDisplay}</div>
                <div class="schedule-status ${schedule.enabled ? 'enabled' : 'disabled'}">
                    ${schedule.enabled ? 'ENABLED' : 'DISABLED'}
                </div>
            </div>
            <div class="schedule-actions">
                <button class="btn-toggle" onclick="toggleSchedule('${schedule.id}')" 
                        title="${schedule.enabled ? 'Disable' : 'Enable'}">
                    <i class="fas fa-power-${schedule.enabled ? 'off' : 'on'}"></i>
                </button>
                <button class="btn-toggle" onclick="editSchedule('${schedule.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-toggle" onclick="deleteSchedule('${schedule.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        AppState.elements.scheduleList.appendChild(scheduleItem);
    });
}

function openScheduleModal(scheduleId = null) {
    const modal = document.getElementById('scheduleModal');
    const scheduleName = document.getElementById('scheduleName');
    const scheduleTime = document.getElementById('scheduleTime');
    const schedulePreset = document.getElementById('schedulePreset');
    const scheduleRepeat = document.getElementById('scheduleRepeat');
    const scheduleEnabled = document.getElementById('scheduleEnabled');
    
    if (scheduleId) {
        // Edit existing schedule
        const schedule = AppState.schedules.find(s => s.id === scheduleId);
        if (schedule) {
            scheduleName.value = schedule.name;
            scheduleTime.value = schedule.time;
            schedulePreset.value = schedule.preset;
            scheduleEnabled.checked = schedule.enabled;
            
            // Clear and set selected days
            Array.from(scheduleRepeat.options).forEach(option => {
                option.selected = schedule.days.includes(option.value);
            });
            
            modal.dataset.editingId = scheduleId;
        }
    } else {
        // New schedule
        scheduleName.value = '';
        scheduleTime.value = '06:00';
        schedulePreset.value = 'morning';
        scheduleEnabled.checked = true;
        
        // Select all days by default
        Array.from(scheduleRepeat.options).forEach(option => {
            option.selected = true;
        });
        
        delete modal.dataset.editingId;
    }
    
    modal.style.display = 'flex';
}

function closeScheduleModal() {
    document.getElementById('scheduleModal').style.display = 'none';
}

function saveSchedule() {
    const scheduleName = document.getElementById('scheduleName').value.trim();
    const scheduleTime = document.getElementById('scheduleTime').value;
    const schedulePreset = document.getElementById('schedulePreset').value;
    const scheduleRepeat = document.getElementById('scheduleRepeat');
    const scheduleEnabled = document.getElementById('scheduleEnabled').checked;
    
    // Validate
    if (!scheduleName) {
        showToast('Please enter a schedule name', 'error');
        return;
    }
    
    if (!scheduleTime) {
        showToast('Please select a time', 'error');
        return;
    }
    
    // Get selected days
    const selectedDays = Array.from(scheduleRepeat.selectedOptions).map(option => option.value);
    if (selectedDays.length === 0) {
        showToast('Please select at least one day', 'error');
        return;
    }
    
    const modal = document.getElementById('scheduleModal');
    const editingId = modal.dataset.editingId;
    
    if (editingId) {
        // Update existing schedule
        const scheduleIndex = AppState.schedules.findIndex(s => s.id === editingId);
        if (scheduleIndex !== -1) {
            AppState.schedules[scheduleIndex] = {
                ...AppState.schedules[scheduleIndex],
                name: scheduleName,
                time: scheduleTime,
                preset: schedulePreset,
                days: selectedDays,
                enabled: scheduleEnabled
            };
            showToast('Schedule updated successfully', 'success');
        }
    } else {
        // Create new schedule
        const newSchedule = {
            id: Date.now().toString(),
            name: scheduleName,
            time: scheduleTime,
            preset: schedulePreset,
            days: selectedDays,
            enabled: scheduleEnabled,
            lastTriggered: null
        };
        
        AppState.schedules.push(newSchedule);
        showToast('Schedule created successfully', 'success');
    }
    
    saveSchedules();
    renderSchedules();
    closeScheduleModal();
}

function toggleSchedule(scheduleId) {
    const scheduleIndex = AppState.schedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex !== -1) {
        AppState.schedules[scheduleIndex].enabled = !AppState.schedules[scheduleIndex].enabled;
        saveSchedules();
        renderSchedules();
        showToast(`Schedule ${AppState.schedules[scheduleIndex].enabled ? 'enabled' : 'disabled'}`, 'success');
    }
}

function editSchedule(scheduleId) {
    openScheduleModal(scheduleId);
}

function deleteSchedule(scheduleId) {
    if (confirm('Are you sure you want to delete this schedule?')) {
        AppState.schedules = AppState.schedules.filter(s => s.id !== scheduleId);
        saveSchedules();
        renderSchedules();
        showToast('Schedule deleted', 'success');
    }
}

function startScheduleChecker() {
    // Clear existing interval
    if (AppState.scheduleInterval) {
        clearInterval(AppState.scheduleInterval);
    }
    
    // Check schedules every minute
    AppState.scheduleInterval = setInterval(checkSchedules, 60000);
    
    // Also check immediately on load
    setTimeout(checkSchedules, 1000);
    
    console.log('⏰ Schedule checker started');
}

function checkSchedules() {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:mm
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().substring(0, 3);
    
    AppState.schedules.forEach(schedule => {
        if (!schedule.enabled) return;
        if (!schedule.days.includes(currentDay)) return;
        if (schedule.time !== currentTime) return;
        
        // Check if already triggered at this time today
        const today = now.toDateString();
        if (schedule.lastTriggered === today) return;
        
        // Trigger the schedule
        triggerSchedule(schedule);
        
        // Update last triggered
        schedule.lastTriggered = today;
        saveSchedules();
    });
}

function triggerSchedule(schedule) {
    console.log(`⏰ Triggering schedule: ${schedule.name} at ${schedule.time}`);
    
    const preset = PRESET_MODES[schedule.preset];
    if (!preset) {
        showToast(`❌ Preset "${schedule.preset}" not found`, 'error');
        return;
    }
    
    // Apply the preset
    applyPreset(schedule.preset);
    
    // Show notification
    showToast(`⏰ Schedule: ${preset.name} activated`, 'success');
    logMessage(`⏰ Schedule triggered: ${schedule.name} → ${preset.name}`);
}

// ✅ Settings Functions
function saveMQTTSettings() {
    // Get values from form
    const deviceId = AppState.elements.deviceIdInput?.value || 'DB001';
    const server = AppState.elements.mqttServer?.value || '';
    const username = AppState.elements.mqttUsername?.value || '';
    const password = AppState.elements.mqttPassword?.value || '';
    const port = parseInt(AppState.elements.mqttPort?.value) || 8883;
    const baseTopic = AppState.elements.baseTopic?.value || 'atomic';
    
    // Update configuration
    AppState.config.deviceId = deviceId;
    AppState.config.baseTopic = baseTopic;
    AppState.config.mqtt.server = server;
    AppState.config.mqtt.username = username;
    AppState.config.mqtt.password = password;
    AppState.config.mqtt.port = port;
    
    // Save to localStorage
    saveConfig();
    
    // Update UI
    updateDeviceInfo();
    
    // Reconnect with new settings
    showToast('Settings saved. Reconnecting...', 'success');
    
    setTimeout(() => {
        if (AppState.mqttClient) {
            AppState.mqttClient.end(true);
        }
        connectMQTT();
    }, 1000);
}

function sendWiFiConfig() {
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const wifiSsid = document.getElementById('wifiSsid')?.value || '';
    const wifiPassword = document.getElementById('wifiPassword')?.value || '';
    
    if (!wifiSsid) {
        showToast('Please enter WiFi SSID', 'error');
        return;
    }
    
    const command = {
        wifi_ssid: wifiSsid,
        wifi_password: wifiPassword
    };
    
    publishCommand('config/set', command);
    showToast('WiFi configuration sent to device', 'info');
}

function factoryResetDevice() {
    if (!confirm('Are you sure you want to factory reset the device? This cannot be undone.')) {
        return;
    }
    
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        command: 'factory_reset'
    };
    
    publishCommand('system', command);
    showToast('Factory reset command sent to device', 'warning');
}

function rebootDevice() {
    if (!confirm('Are you sure you want to reboot the device?')) {
        return;
    }
    
    if (!AppState.isConnected) {
        showToast('Not connected to MQTT', 'error');
        return;
    }
    
    const command = {
        command: 'restart'
    };
    
    publishCommand('system', command);
    showToast('Reboot command sent to device', 'info');
}

function exportConfig() {
    const configData = {
        app: AppState.config,
        relays: RELAYS,
        presets: PRESET_MODES,
        schedules: AppState.schedules
    };
    
    const dataStr = JSON.stringify(configData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `atomic-smart-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Configuration exported successfully', 'success');
}

function clearLocalData() {
    if (!confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
        return;
    }
    
    localStorage.clear();
    showToast('Local data cleared. Refreshing...', 'success');
    
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// ✅ UI Helper Functions
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = timeString;
    }
}

function updateUptime() {
    const elapsed = Date.now() - AppState.startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const uptimeString = `${hours.toString().padStart(2, '0')}:` +
                        `${minutes.toString().padStart(2, '0')}:` +
                        `${seconds.toString().padStart(2, '0')}`;
    
    if (AppState.elements.uptime) {
        AppState.elements.uptime.textContent = uptimeString;
    }
    
    AppState.stats.uptime = elapsed;
}

function logMessage(message) {
    if (!AppState.elements.activityLog) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `<span class="log-time">[${timestamp}]</span>
                        <span class="log-message">${message}</span>`;
    
    AppState.elements.activityLog.appendChild(logItem);
    AppState.elements.activityLog.scrollTop = AppState.elements.activityLog.scrollHeight;
    
    // Limit log size
    const logItems = AppState.elements.activityLog.querySelectorAll('.log-item');
    if (logItems.length > AppState.config.app.logRetention) {
        logItems[0].remove();
    }
}

function showToast(message, type = 'info') {
    if (!AppState.elements.toast) return;
    
    AppState.elements.toast.textContent = message;
    AppState.elements.toast.className = `toast ${type}`;
    AppState.elements.toast.classList.add('show');
    
    setTimeout(() => {
        AppState.elements.toast.classList.remove('show');
    }, 3000);
}

function openSettingsModal() {
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function reconnectMQTT() {
    if (AppState.mqttClient) {
        AppState.mqttClient.end(true);
    }
    connectMQTT();
    closeSettingsModal();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen error:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// ✅ Start background tasks
function startBackgroundTasks() {
    // Start heartbeat interval
    AppState.heartbeatInterval = setInterval(() => {
        if (AppState.isConnected) {
            // Send keepalive ping
            publishCommand('heartbeat', { ping: true });
        }
    }, AppState.config.app.heartbeatInterval);
    
    console.log('🔄 Background tasks started');
}

// ✅ Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Navigation system
    setupNavigation();
    
    // Initialize app
    initApp();
    
    // Load custom presets
    loadCustomPresets();
});

// ✅ Setup navigation system
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    function setActivePage(pageId) {
        // Update navigation
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) {
                item.classList.add('active');
            }
        });
        
        // Update pages
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === pageId + 'Page') {
                page.classList.add('active');
            }
        });
        
        // Update page title
        const pageTitles = {
            'dashboard': 'Smart Home Dashboard',
            'controls': 'Advanced Controls',
            'analytics': 'System Analytics',
            'settings': 'Settings'
        };
        
        const pageTitle = document.getElementById('pageTitle');
        const breadcrumb = document.getElementById('breadcrumb');
        
        if (pageTitle) pageTitle.textContent = pageTitles[pageId] || 'Dashboard';
        if (breadcrumb) {
            breadcrumb.textContent = 
                pageId.charAt(0).toUpperCase() + pageId.slice(1) + ' / ' + 
                (pageId === 'dashboard' ? 'All Relays' : 'Overview');
        }
        
        // Update URL
        window.location.hash = pageId;
    }
    
    // Navigation click handlers
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            setActivePage(pageId);
        });
    });
    
    // Handle URL hash changes
    window.addEventListener('hashchange', function() {
        const pageId = window.location.hash.substring(1) || 'dashboard';
        setActivePage(pageId);
    });
    
    // Initialize with current hash or dashboard
    const initialPage = window.location.hash.substring(1) || 'dashboard';
    setActivePage(initialPage);
}

// ✅ Make functions available globally
window.controlRelay = controlRelay;
window.controlAllRelays = controlAllRelays;
window.controlGroup = controlGroup;
window.controlRange = controlRange;
window.applyPreset = applyPreset;
window.requestStatus = requestStatus;
window.restoreStates = restoreStates;
window.reconnectMQTT = reconnectMQTT;
window.showToast = showToast;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.saveSchedule = saveSchedule;
window.toggleSchedule = toggleSchedule;
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;
window.saveCurrentPreset = saveCurrentPreset;
