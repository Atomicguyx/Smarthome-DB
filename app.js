// ✅ MQTT Configuration (Enhanced for mobile)
const MQTT_CONFIG = {
    server: 'wss://0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud:8884/mqtt',
    username: 'SMARTHOMEDB',
    password: 'Aa1234567@',
    topics: {
        control: 'smarthome/control',
        status: 'smarthome/status'
    },
    clientId: 'smart-home-dashboard-' + Math.random().toString(16).slice(2, 8) + '-' + Date.now(),
    keepalive: 30,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clean: true,
    protocolVersion: 4, // MQTT v3.1.1
    resubscribe: true,
    queueQoSZero: false
};

// ✅ Relay Definitions (16 relays matching your ESP32)
const RELAYS = [
    { id: 1, name: "Bedroom 1 AC", icon: "fa-snowflake", state: false },
    { id: 2, name: "Bedroom 2 AC", icon: "fa-snowflake", state: false },
    { id: 3, name: "Bedroom 3 AC", icon: "fa-snowflake", state: false },
    { id: 4, name: "Bedroom 4 AC", icon: "fa-snowflake", state: false },
    { id: 5, name: "Bedroom 1 Socket", icon: "fa-plug", state: false },
    { id: 6, name: "Bedroom 2 Socket", icon: "fa-plug", state: false },
    { id: 7, name: "Living Room Light", icon: "fa-lightbulb", state: false },
    { id: 8, name: "Kitchen Socket", icon: "fa-plug", state: false },
    { id: 9, name: "Water Heater", icon: "fa-fire", state: false },
    { id: 10, name: "Freezer", icon: "fa-snowflake", state: false },
    { id: 11, name: "Generator", icon: "fa-bolt", state: false },
    { id: 12, name: "Security Light", icon: "fa-shield-alt", state: false },
    { id: 13, name: "Water Pump", icon: "fa-tint", state: false },
    { id: 14, name: "Inverter", icon: "fa-bolt", state: false },
    { id: 15, name: "Solar Input", icon: "fa-sun", state: false },
    { id: 16, name: "Main Supply", icon: "fa-bolt", state: false }
];

// ✅ PRESET MODES CONFIGURATION
const PRESET_MODES = {
    'home': {
        name: 'Home Mode',
        description: 'Lights & Essentials for comfortable living',
        icon: 'fa-home',
        relays: {
            7: true,   // Living Room Light ON
            8: true,   // Kitchen Socket ON
            13: true,  // Water Pump ON
            16: true,  // Main Supply ON
            1: false, 2: false, 3: false, 4: false,
            5: false, 6: false, 9: false, 10: false,
            11: false, 12: false, 14: false, 15: false
        }
    },
    
    'away': {
        name: 'Away Mode',
        description: 'Security lighting while away',
        icon: 'fa-car',
        relays: {
            12: true,   // Security Light ON
            15: true,   // Solar Input ON
            1: false, 2: false, 3: false, 4: false,
            5: false, 6: false, 7: false, 8: false,
            9: false, 10: false, 11: false, 13: false,
            14: false, 16: false
        }
    },
    
    'night': {
        name: 'Night Mode',
        description: 'Only bedrooms for sleeping',
        icon: 'fa-moon',
        relays: {
            1: true,    // Bedroom 1 AC ON
            2: true,    // Bedroom 2 AC ON
            3: true,    // Bedroom 3 AC ON
            4: true,    // Bedroom 4 AC ON
            5: true,    // Bedroom 1 Socket ON
            6: true,    // Bedroom 2 Socket ON
            12: true,   // Security Light ON
            7: false, 8: false, 9: false, 10: false,
            11: false, 13: false, 14: false, 15: false,
            16: false
        }
    },
    
    'energy': {
        name: 'Energy Save',
        description: 'Minimal power consumption',
        icon: 'fa-leaf',
        relays: {
            16: true,   // Main Supply ON
            13: true,   // Water Pump ON
            1: false, 2: false, 3: false, 4: false,
            5: false, 6: false, 7: false, 8: false,
            9: false, 10: false, 11: false, 12: false,
            14: false, 15: false
        }
    },
    
    'party': {
        name: 'Party Mode',
        description: 'All lights and entertainment',
        icon: 'fa-music',
        relays: {
            7: true,    // Living Room Light ON
            8: true,    // Kitchen Socket ON
            9: true,    // Water Heater ON
            10: true,   // Freezer ON
            13: true,   // Water Pump ON
            16: true,   // Main Supply ON
            1: false, 2: false, 3: false, 4: false,
            5: false, 6: false,
            11: false, 12: true, 14: false, 15: false
        }
    },
    
    'morning': {
        name: 'Morning Routine',
        description: 'Morning preparation',
        icon: 'fa-sun',
        relays: {
            9: true,    // Water Heater ON
            13: true,   // Water Pump ON
            8: true,    // Kitchen Socket ON
            16: true,   // Main Supply ON
            7: true,    // Living Room Light ON
            1: false, 2: false, 3: false, 4: false,
            5: false, 6: false, 10: false, 11: false,
            12: false, 14: false, 15: false
        }
    }
};

// ✅ Global Variables
let mqttClient = null;
let startTime = Date.now();
let messageCount = 0;
let elements = {};
let connectionState = {
    isConnected: false,
    connectionAttempts: 0,
    maxAttempts: 10,
    lastConnectTime: 0,
    reconnectDelay: 1000,
    pingInterval: null,
    autoReconnect: true,
    isReconnecting: false
};

// ✅ SCHEDULES SYSTEM
const SCHEDULES_STORAGE_KEY = 'smartHomeSchedules';
let schedules = [];
let scheduleInterval = null;

// ✅ INITIALIZE DASHBOARD
function initializeDashboard() {
    console.log("Initializing dashboard...");
    
    // Initialize elements
    elements = {
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        relaysGrid: document.getElementById('relaysGrid'),
        statOn: document.getElementById('statOn'),
        statOff: document.getElementById('statOff'),
        statTotal: document.getElementById('statTotal'),
        deviceStats: document.getElementById('deviceStats'),
        connectionDetails: document.getElementById('connectionDetails'),
        uptime: document.getElementById('uptime'),
        messageCount: document.getElementById('messageCount'),
        activityLog: document.getElementById('activityLog'),
        toast: document.getElementById('toast')
    };

    // Create relay cards
    createRelayCards();
    
    // Initialize stats with current relay states
    updateStats();
    
    // Load saved presets
    loadSavedPresets();
    
    // Setup preset buttons if on controls page
    if (document.querySelector('.presets-grid')) {
        setupPresetButtons();
        updatePresetsUI();
    }
    
    // Initialize connection controls
    setupConnectionControls();
    
    // Initialize analytics if on analytics page
    if (document.getElementById('analyticsPage').classList.contains('active')) {
        initializeAnalytics();
    }
    
    // Initialize settings if on settings page
    if (document.getElementById('settingsPage').classList.contains('active')) {
        initializeSettings();
    }
    
    logMessage('🚀 Dashboard initialized');
    console.log("✅ Dashboard initialized successfully");
    
    // Force initial stats display
    setTimeout(updateStats, 100);
}

// ✅ CREATE RELAY CARDS
function createRelayCards() {
    if (!elements.relaysGrid) {
        console.error("❌ relaysGrid element not found!");
        return;
    }
    
    console.log(`Creating ${RELAYS.length} relay cards...`);
    elements.relaysGrid.innerHTML = '';
    
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
                <button class="btn-relay on" onclick="window.controlRelay(${relay.id}, true)" ${relay.state ? 'disabled' : ''}>
                    <i class="fas fa-power-off"></i>
                    TURN ON
                </button>
                <button class="btn-relay off" onclick="window.controlRelay(${relay.id}, false)" ${!relay.state ? 'disabled' : ''}>
                    <i class="fas fa-power-off"></i>
                    TURN OFF
                </button>
            </div>
        `;
        elements.relaysGrid.appendChild(relayCard);
    });
    
    console.log("✅ Relay cards created successfully");
}

// ✅ UPDATE STATS FUNCTION
function updateStats() {
    if (!elements.statOn || !elements.statOff || !elements.statTotal || !elements.deviceStats) {
        console.warn("Stats elements not found yet, retrying...");
        return;
    }
    
    const onCount = RELAYS.filter(r => r.state).length;
    const offCount = RELAYS.length - onCount;
    
    console.log(`Updating stats: ${onCount} ON, ${offCount} OFF`);
    
    // Update Dashboard stats
    elements.statOn.textContent = `${onCount} ON`;
    elements.statOff.textContent = `${offCount} OFF`;
    elements.statTotal.textContent = `${RELAYS.length} Total`;
    
    // Update Device stats in sidebar
    elements.deviceStats.textContent = `${RELAYS.length} Relays • ${onCount} ON`;
    
    // Update Controls page stats if it exists
    const controlsStatOn = document.getElementById('controlsStatOn');
    const controlsStatOff = document.getElementById('controlsStatOff');
    
    if (controlsStatOn) {
        controlsStatOn.textContent = `${onCount} ON`;
        controlsStatOn.className = onCount === 0 ? 'stat-badge muted' : 
                                   onCount === RELAYS.length ? 'stat-badge success' : 
                                   'stat-badge warning';
    }
    if (controlsStatOff) {
        controlsStatOff.textContent = `${offCount} OFF`;
        controlsStatOff.className = offCount === 0 ? 'stat-badge muted' : 'stat-badge muted';
    }
    
    // Update stat badge colors
    updateStatBadges();
}

// ✅ UPDATE STAT BADGE COLORS
function updateStatBadges() {
    const onCount = RELAYS.filter(r => r.state).length;
    
    // Update stat badge colors
    if (elements.statOn) {
        if (onCount === 0) {
            elements.statOn.className = 'stat-badge muted';
        } else if (onCount === RELAYS.length) {
            elements.statOn.className = 'stat-badge success';
        } else {
            elements.statOn.className = 'stat-badge warning';
        }
    }
    
    if (elements.statOff) {
        if (onCount === RELAYS.length) {
            elements.statOff.className = 'stat-badge muted';
        } else {
            elements.statOff.className = 'stat-badge muted';
        }
    }
    
    if (elements.statTotal) {
        elements.statTotal.className = 'stat-badge primary';
    }
}

// ✅ CONTROL FUNCTIONS - KEEP AS IS (R1:1 format is correct!)
function controlRelay(id, state) {
    const command = `R${id}:${state ? '1' : '0'}`;
    console.log(`🔌 Sending to ESP32: "${command}"`);
    publishMessage(MQTT_CONFIG.topics.control, command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} ${getRelayName(id)}`, 'info');
}

function controlAllRelays(state) {
    const command = state ? 'ALL_ON' : 'ALL_OFF';
    publishMessage(MQTT_CONFIG.topics.control, command);
    showToast(`${state ? 'Turning ALL relays ON' : 'Turning ALL relays OFF'}`, 'info');
}

function controlRelayRange(start, end, state) {
    const command = `R${start}-${end}:${state ? '1' : '0'}`;
    publishMessage(MQTT_CONFIG.topics.control, command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} relays ${start}-${end}`, 'info');
}

function controlGroup(groupName, state) {
    const command = `GROUP_${groupName.toUpperCase()}:${state ? '1' : '0'}`;
    publishMessage(MQTT_CONFIG.topics.control, command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} ${groupName} group`, 'info');
}

function requestStatus() {
    publishMessage(MQTT_CONFIG.topics.control, 'STATUS');
    showToast('Requesting status update...', 'info');
}

// ✅ HELPER FUNCTIONS
function getRelayName(id) {
    const relay = RELAYS.find(r => r.id === id);
    return relay ? relay.name : `Relay ${id}`;
}

function updateRelayUI(id, state) {
    const relay = RELAYS.find(r => r.id === id);
    if (!relay) return;
    
    console.log(`Updating relay ${id} to ${state ? 'ON' : 'OFF'}`);
    relay.state = state;
    
    // Update card UI
    const card = document.getElementById(`relay-${id}`);
    if (card) {
        card.className = `relay-card ${state ? 'active' : ''}`;
        
        const led = card.querySelector('.status-led');
        const statusText = card.querySelector('.status-text');
        const btnOn = card.querySelector('.btn-relay.on');
        const btnOff = card.querySelector('.btn-relay.off');
        
        if (led) led.className = `status-led ${state ? 'on' : ''}`;
        if (statusText) statusText.textContent = state ? 'ON' : 'OFF';
        if (btnOn) {
            btnOn.disabled = state;
            btnOn.innerHTML = state ? 
                '<i class="fas fa-check"></i> ON' : 
                '<i class="fas fa-power-off"></i> TURN ON';
        }
        if (btnOff) {
            btnOff.disabled = !state;
            btnOff.innerHTML = !state ? 
                '<i class="fas fa-times"></i> OFF' : 
                '<i class="fas fa-power-off"></i> TURN OFF';
        }
    }
    
    // Update stats
    updateStats();
    
    // Log the change
    logMessage(`Relay ${id}: ${state ? 'ON' : 'OFF'}`);
}

// ✅ MQTT CONNECTION (Enhanced for mobile stability)
function connectMQTT() {
    if (connectionState.isReconnecting) {
        console.log('⚠️ Already reconnecting, skipping...');
        return;
    }
    
    if (connectionState.connectionAttempts >= connectionState.maxAttempts) {
        console.error('❌ Max connection attempts reached');
        showToast('Connection failed after multiple attempts', 'error');
        connectionState.autoReconnect = false;
        return;
    }
    
    updateConnectionStatus('Connecting...', 'connecting');
    connectionState.connectionAttempts++;
    connectionState.isReconnecting = true;
    
    console.log(`🔄 Connection attempt ${connectionState.connectionAttempts}/${connectionState.maxAttempts}`);
    
    // Clean up existing connection if any
    if (mqttClient) {
        try {
            mqttClient.end(true); // Force disconnect
            mqttClient = null;
        } catch (e) {
            console.warn('Error cleaning up old connection:', e);
        }
    }
    
    const options = {
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        clientId: MQTT_CONFIG.clientId,
        clean: MQTT_CONFIG.clean,
        reconnectPeriod: 0, // We'll handle reconnection manually
        connectTimeout: MQTT_CONFIG.connectTimeout,
        keepalive: MQTT_CONFIG.keepalive,
        protocolVersion: MQTT_CONFIG.protocolVersion,
        resubscribe: MQTT_CONFIG.resubscribe,
        queueQoSZero: MQTT_CONFIG.queueQoSZero,
        rejectUnauthorized: false // Allow self-signed certificates
    };
    
    try {
        console.log('🔗 Creating MQTT connection...');
        mqttClient = mqtt.connect(MQTT_CONFIG.server, options);
        
        setupMQTTEventHandlers();
        
    } catch (error) {
        console.error('❌ Connection setup error:', error);
        updateConnectionStatus('Connection failed', 'error');
        showToast(`Connection error: ${error.message}`, 'error');
        scheduleReconnect();
    }
}

// ✅ SETUP MQTT EVENT HANDLERS
function setupMQTTEventHandlers() {
    if (!mqttClient) return;
    
    // Connection successful
    mqttClient.on('connect', () => {
        console.log('✅ MQTT Connected successfully');
        connectionState.isConnected = true;
        connectionState.isReconnecting = false;
        connectionState.connectionAttempts = 0;
        connectionState.lastConnectTime = Date.now();
        
        updateConnectionStatus('Connected', 'connected');
        showToast('✅ Connected to HiveMQ Cloud', 'success');
        logMessage('✅ Connected to HiveMQ Cloud');
        
        // Subscribe to status topic
        mqttClient.subscribe(MQTT_CONFIG.topics.status, { qos: 1 }, (err) => {
            if (err) {
                console.error('❌ Subscription error:', err);
                logMessage(`❌ Failed to subscribe: ${err.message}`);
            } else {
                console.log(`📡 Subscribed to: ${MQTT_CONFIG.topics.status}`);
                logMessage(`📡 Subscribed to: ${MQTT_CONFIG.topics.status}`);
                
                // Wait a moment before requesting status
                setTimeout(() => {
                    console.log('📊 Requesting initial status...');
                    requestStatus();
                }, 1000);
            }
        });
        
        // Start ping interval to keep connection alive
        startPingInterval();
    });
    
    // Message received
    mqttClient.on('message', (topic, message) => {
        const messageStr = message.toString();
        console.log(`📨 [MQTT IN] ${topic}: ${messageStr}`);
        messageCount++;
        updateMessageCount();
        
        // Log the message
        logMessage(`📨 [${topic}]: ${messageStr}`);
        
        // Handle different topics
        if (topic === MQTT_CONFIG.topics.status) {
            handleMQTTMessage(topic, messageStr);
        } else {
            console.log(`📨 Received message on unknown topic: ${topic}`);
        }
    });
    
    // Error handling
    mqttClient.on('error', (error) => {
        console.error('❌ MQTT Error:', error);
        updateConnectionStatus('Error', 'error');
        showToast(`Connection error: ${error.message}`, 'error');
        logMessage(`❌ MQTT Error: ${error.message}`);
        
        if (!connectionState.isReconnecting) {
            scheduleReconnect();
        }
    });
    
    // Disconnected
    mqttClient.on('close', () => {
        console.log('🔌 MQTT Connection closed');
        connectionState.isConnected = false;
        updateConnectionStatus('Disconnected', 'error');
        logMessage('🔌 Disconnected from MQTT');
        
        stopPingInterval();
        
        if (connectionState.autoReconnect && !connectionState.isReconnecting) {
            scheduleReconnect();
        }
    });
    
    // Offline
    mqttClient.on('offline', () => {
        console.log('📴 MQTT Offline');
        connectionState.isConnected = false;
        updateConnectionStatus('Offline', 'error');
        logMessage('📴 MQTT Offline');
    });
    
    // Reconnect
    mqttClient.on('reconnect', () => {
        console.log('🔄 MQTT Reconnecting...');
        updateConnectionStatus('Reconnecting...', 'connecting');
        logMessage('🔄 Reconnecting to MQTT...');
    });
    
    // End (clean disconnect)
    mqttClient.on('end', () => {
        console.log('🏁 MQTT Connection ended');
        connectionState.isConnected = false;
        stopPingInterval();
    });
}

// ✅ SCHEDULE RECONNECT
function scheduleReconnect() {
    if (!connectionState.autoReconnect || connectionState.isReconnecting) {
        return;
    }
    
    connectionState.isReconnecting = true;
    
    // Exponential backoff
    const delay = Math.min(connectionState.reconnectDelay * Math.pow(1.5, connectionState.connectionAttempts - 1), 30000);
    
    console.log(`⏳ Scheduling reconnect in ${delay}ms...`);
    
    setTimeout(() => {
        console.log('🔄 Attempting reconnect...');
        connectionState.isReconnecting = false;
        connectMQTT();
    }, delay);
}

// ✅ PING INTERVAL FOR CONNECTION KEEP-ALIVE
function startPingInterval() {
    stopPingInterval(); // Clear any existing interval
    
    connectionState.pingInterval = setInterval(() => {
        if (mqttClient && mqttClient.connected) {
            // Send a ping/publish to keep connection alive
            try {
                mqttClient.publish('$SYS/ping', 'ping', { qos: 0, retain: false }, (err) => {
                    if (err) {
                        console.warn('Ping publish error:', err);
                    }
                });
            } catch (e) {
                console.warn('Ping error:', e);
            }
        }
    }, 15000); // Every 15 seconds
}

function stopPingInterval() {
    if (connectionState.pingInterval) {
        clearInterval(connectionState.pingInterval);
        connectionState.pingInterval = null;
    }
}

// ✅ IMPROVED PUBLISH FUNCTION
function publishMessage(topic, message) {
    if (!mqttClient || !mqttClient.connected) {
        console.warn('⚠️ Cannot publish: MQTT not connected');
        showToast('Not connected to MQTT', 'error');
        updateConnectionStatus('Disconnected', 'error');
        
        // Try to reconnect if autoReconnect is enabled
        if (connectionState.autoReconnect && !connectionState.isReconnecting) {
            console.log('Attempting to reconnect for publish...');
            connectMQTT();
        }
        
        return false;
    }
    
    console.log(`📤 [MQTT OUT] ${topic}: ${message}`);
    
    return new Promise((resolve, reject) => {
        mqttClient.publish(topic, message, { qos: 1, retain: false }, (error) => {
            if (error) {
                console.error('❌ MQTT Publish Error:', error);
                showToast(`Failed to send: ${error.message}`, 'error');
                reject(error);
                
                // Check if we need to reconnect
                if (error.code === 'ECONNREFUSED' || error.message.includes('not connected')) {
                    scheduleReconnect();
                }
            } else {
                console.log(`✅ MQTT Published: ${message}`);
                logMessage(`📤 [${topic}]: ${message}`);
                messageCount++;
                updateMessageCount();
                resolve(true);
            }
        });
    });
}

// ✅ MESSAGE HANDLER - FIXED! This is where the bug was
function handleMQTTMessage(topic, message) {
    messageCount++;
    updateMessageCount();
    
    logMessage(`📨 [${topic}]: ${message}`);
    
    if (topic === MQTT_CONFIG.topics.status) {
        console.log(`🔄 Processing status message: "${message}"`);
        
        // Check if this is a comma-separated list of all relays (from STATUS command)
        if (message.includes(',') && !message.includes('R') && !message.includes('ALL') && !message.includes('GROUP')) {
            // Format: "1:1,2:0,3:1,..." (from sendAllRelaysStatus() in ESP32)
            console.log("📊 Processing full status update");
            const updates = message.split(',');
            updates.forEach(update => {
                const [id, state] = update.split(':');
                const relayId = parseInt(id.trim());
                const relayState = state === '1';
                
                console.log(`  Relay ${relayId}: ${relayState ? 'ON' : 'OFF'}`);
                
                if (relayId >= 1 && relayId <= 16) {
                    updateRelayUI(relayId, relayState);
                } else {
                    console.warn(`  ⚠️ Invalid relay ID: ${relayId}`);
                }
            });
            updateStats();
        }
        // Single relay update: "R1:1" or "1:1" (ESP32 sends both formats)
        else if (message.includes(':') && !message.includes(',')) {
            console.log("🔧 Processing single relay update");
            
            // Extract relay number - handle both "R1:1" and "1:1" formats
            let relayId;
            let relayState;
            
            if (message.startsWith('R')) {
                // Format: "R1:1"
                relayId = parseInt(message.substring(1, message.indexOf(':')));
                relayState = message.endsWith(':1');
            } else {
                // Format: "1:1"
                relayId = parseInt(message.split(':')[0]);
                relayState = message.endsWith(':1');
            }
            
            console.log(`  Relay ${relayId}: ${relayState ? 'ON' : 'OFF'}`);
            
            if (relayId >= 1 && relayId <= 16) {
                updateRelayUI(relayId, relayState);
                updateStats();
            } else {
                console.warn(`  ⚠️ Invalid relay ID: ${relayId}`);
            }
        }
        // Range update: "R1-8:1"
        else if (message.startsWith('R') && message.includes('-')) {
            console.log("🎯 Processing range update");
            showToast(`Range updated: ${message}`, 'success');
        }
        // All relays: "ALL:1" or "ALL:0"
        else if (message.startsWith('ALL:')) {
            console.log("🌈 Processing all relays update");
            const state = message.endsWith(':1');
            RELAYS.forEach(relay => {
                updateRelayUI(relay.id, state);
            });
            updateStats();
        }
        // Group update: "GROUP_BEDROOMS:1"
        else if (message.startsWith('GROUP_')) {
            console.log("👥 Processing group update");
            showToast(`Group updated: ${message}`, 'success');
        }
        // Unknown format
        else {
            console.warn(`⚠️ Unhandled message format: "${message}"`);
        }
    }
}

// ✅ CONNECTION CONTROLS
function setupConnectionControls() {
    // Update connection attempts display
    const connectionAttemptsElement = document.getElementById('connectionAttempts');
    if (connectionAttemptsElement) {
        setInterval(() => {
            connectionAttemptsElement.textContent = connectionState.connectionAttempts;
        }, 1000);
    }
    
    // Update network quality display
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            const networkQualityElement = document.getElementById('networkQuality');
            const qualityLevelElement = document.getElementById('qualityLevel');
            
            function updateNetworkQuality() {
                let quality = 100;
                let text = 'Network: Excellent';
                
                if (connection.effectiveType === 'slow-2g') {
                    quality = 20;
                    text = 'Network: Slow 2G';
                } else if (connection.effectiveType === '2g') {
                    quality = 40;
                    text = 'Network: 2G';
                } else if (connection.effectiveType === '3g') {
                    quality = 60;
                    text = 'Network: 3G';
                } else if (connection.effectiveType === '4g') {
                    quality = 80;
                    text = 'Network: 4G';
                }
                
                if (connection.rtt > 300) {
                    quality -= 20;
                    text += ' (High Latency)';
                }
                
                if (networkQualityElement) {
                    networkQualityElement.textContent = text;
                }
                
                if (qualityLevelElement) {
                    qualityLevelElement.style.width = `${quality}%`;
                    qualityLevelElement.style.backgroundColor = quality > 70 ? 'hsl(var(--success))' : 
                                                               quality > 40 ? 'hsl(var(--warning))' : 
                                                               'hsl(var(--destructive))';
                }
            }
            
            connection.addEventListener('change', updateNetworkQuality);
            updateNetworkQuality();
        }
    }
}

// ✅ UPDATE CONNECTION STATUS
function updateConnectionStatus(text, status) {
    if (!elements.statusText || !elements.connectionDetails) return;
    
    elements.statusText.textContent = text;
    elements.connectionDetails.textContent = text;
    
    if (elements.statusDot) {
        elements.statusDot.className = 'status-dot';
        if (status === 'connected') {
            elements.statusDot.classList.add('connected');
        } else if (status === 'connecting') {
            elements.statusDot.classList.add('connecting');
        } else if (status === 'error') {
            elements.statusDot.classList.add('error');
        } else {
            elements.statusDot.classList.add('disconnected');
        }
    }
    
    // Update modal status
    const modalStatus = document.getElementById('modalMqttStatus');
    if (modalStatus) {
        modalStatus.textContent = text;
        modalStatus.className = `status-badge ${status}`;
    }
}

// ✅ ANALYTICS FUNCTIONS
function initializeAnalytics() {
    console.log("Initializing analytics...");
    
    // Update system uptime
    updateSystemUptime();
    
    // Initialize charts
    initializeCharts();
    
    // Load usage history
    loadUsageHistory();
    
    // Start analytics updates
    setInterval(updateAnalytics, 5000);
}

function updateSystemUptime() {
    const systemUptime = document.getElementById('systemUptime');
    if (!systemUptime) return;
    
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    systemUptime.textContent = 
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${seconds.toString().padStart(2, '0')}`;
}

function initializeCharts() {
    // Create power consumption chart
    createPowerChart();
    
    // Create usage history chart
    createUsageChart();
}

function createPowerChart() {
    const chartPlaceholder = document.querySelector('.chart-placeholder');
    if (!chartPlaceholder) return;
    
    // Clear existing bars
    chartPlaceholder.innerHTML = '';
    
    // Generate random data for demo (replace with real data)
    const hours = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'];
    const consumption = [2.1, 3.2, 4.5, 3.8, 5.2, 3.5, 1.8];
    
    // Find max for scaling
    const maxConsumption = Math.max(...consumption);
    
    hours.forEach((hour, index) => {
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';
        barContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        `;
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        const height = (consumption[index] / maxConsumption) * 100;
        bar.style.cssText = `
            height: ${height}%;
            width: 30px;
            background: linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.7));
            border-radius: 4px 4px 0 0;
            transition: height 0.5s ease;
        `;
        
        const label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = hour;
        label.style.cssText = `
            font-size: 12px;
            color: hsl(var(--muted-foreground));
            margin-top: 5px;
        `;
        
        const value = document.createElement('div');
        value.className = 'chart-value';
        value.textContent = `${consumption[index]}kWh`;
        value.style.cssText = `
            font-size: 10px;
            color: hsl(var(--primary));
            font-weight: 600;
        `;
        
        barContainer.appendChild(bar);
        barContainer.appendChild(label);
        barContainer.appendChild(value);
        chartPlaceholder.appendChild(barContainer);
    });
}

function createUsageChart() {
    // This would be replaced with a real chart library
    console.log("Usage chart initialized");
}

function loadUsageHistory() {
    const usageHistory = document.getElementById('usageHistory');
    if (!usageHistory) return;
    
    // Load from localStorage or use demo data
    const savedHistory = localStorage.getItem('usageHistory');
    if (savedHistory) {
        usageHistory.innerHTML = savedHistory;
    } else {
        // Demo data
        const now = new Date();
        const demoHistory = [
            { time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), action: 'All relays OFF', type: 'off' },
            { time: new Date(now - 900000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), action: 'Bedrooms group ON', type: 'on' },
            { time: new Date(now - 2700000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), action: 'Relay 1-8 ON', type: 'on' },
            { time: new Date(now - 5400000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), action: 'Morning Routine preset', type: 'preset' },
            { time: new Date(now - 7200000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), action: 'Security Light ON', type: 'on' }
        ];
        
        usageHistory.innerHTML = '';
        demoHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span class="time">${item.time}</span>
                <span class="action ${item.type}">${item.action}</span>
            `;
            usageHistory.appendChild(historyItem);
        });
        
        // Save to localStorage
        localStorage.setItem('usageHistory', usageHistory.innerHTML);
    }
}

function updateAnalytics() {
    // Update power consumption stats
    updatePowerStats();
    
    // Update system status
    updateSystemStatus();
}

function updatePowerStats() {
    // Simulate power consumption updates
    const todayStat = document.getElementById('todayPower');
    const monthStat = document.getElementById('monthPower');
    
    if (todayStat && monthStat) {
        // Randomize a bit for demo
        const today = 2.4 + (Math.random() * 0.5 - 0.25);
        const month = 45.6 + (Math.random() * 2 - 1);
        
        todayStat.textContent = `${today.toFixed(1)} kWh`;
        monthStat.textContent = `${month.toFixed(1)} kWh`;
    }
}

function updateSystemStatus() {
    // Update WiFi signal strength
    const signalStrength = ['Poor', 'Fair', 'Good', 'Excellent'];
    const randomSignal = signalStrength[Math.floor(Math.random() * signalStrength.length)];
    
    const signalElement = document.getElementById('wifiSignal');
    if (signalElement) {
        signalElement.textContent = randomSignal;
        signalElement.className = `value status-${randomSignal.toLowerCase()}`;
    }
    
    // Update memory usage
    const memoryUsage = 30 + Math.floor(Math.random() * 30);
    const memoryElement = document.getElementById('memoryUsage');
    if (memoryElement) {
        memoryElement.textContent = `${memoryUsage}%`;
    }
    
    // Update MQTT connection status
    const mqttStatus = document.getElementById('analyticsMqttStatus');
    if (mqttStatus) {
        mqttStatus.textContent = connectionState.isConnected ? 'Connected' : 'Disconnected';
        mqttStatus.className = connectionState.isConnected ? 'value status-good' : 'value status-poor';
    }
}

// ✅ SETTINGS FUNCTIONS
function initializeSettings() {
    console.log("Initializing settings...");
    
    // Load saved settings
    loadAllSettings();
    
    // Setup settings event listeners
    setupSettingsListeners();
    
    // Initialize theme
    initializeTheme();
}

function loadAllSettings() {
    // MQTT Settings
    const savedServer = localStorage.getItem('mqttServer');
    const savedUser = localStorage.getItem('mqttUsername');
    const savedPass = localStorage.getItem('mqttPassword');
    const savedClientId = localStorage.getItem('mqttClientId');
    
    if (savedServer) document.getElementById('mqttServer').value = savedServer;
    if (savedUser) document.getElementById('mqttUsername').value = savedUser;
    if (savedPass) document.getElementById('mqttPassword').value = savedPass;
    if (savedClientId) document.getElementById('mqttClientId').value = savedClientId;
    
    // Appearance Settings
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedAnimations = localStorage.getItem('animationsEnabled') !== 'false';
    const savedNotifications = localStorage.getItem('notificationsEnabled') !== 'false';
    
    document.getElementById('themeSelect').value = savedTheme;
    document.getElementById('animationToggle').checked = savedAnimations;
    document.getElementById('notificationsToggle').checked = savedNotifications;
    
    // Security Settings
    const savedTimeout = localStorage.getItem('sessionTimeout') || '30';
    const savedAuth = localStorage.getItem('requireAuth') !== 'false';
    
    document.getElementById('sessionTimeout').value = savedTimeout;
    document.getElementById('requireAuth').checked = savedAuth;
    
    // Data Management
    const savedRetention = localStorage.getItem('logRetention') || '30';
    document.getElementById('logRetention').value = savedRetention;
}

function setupSettingsListeners() {
    // MQTT Settings
    document.getElementById('btnSaveMQTT').addEventListener('click', saveMqttSettings);
    
    // Appearance Settings
    document.getElementById('btnSaveAppearance').addEventListener('click', saveAppearanceSettings);
    document.getElementById('themeSelect').addEventListener('change', applyTheme);
    
    // Security Settings
    document.getElementById('btnSaveSecurity').addEventListener('click', saveSecuritySettings);
    
    // Data Management
    document.getElementById('btnClearData').addEventListener('click', clearAllData);
    document.getElementById('btnExportData').addEventListener('click', exportConfiguration);
    document.getElementById('btnImportData').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
}

function saveMqttSettings() {
    const server = document.getElementById('mqttServer').value;
    const username = document.getElementById('mqttUsername').value;
    const password = document.getElementById('mqttPassword').value;
    const clientId = document.getElementById('mqttClientId').value;
    
    // Basic validation
    if (!server || !username || !password) {
        showToast('Please fill in all MQTT settings', 'error');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('mqttServer', server);
    localStorage.setItem('mqttUsername', username);
    localStorage.setItem('mqttPassword', password);
    localStorage.setItem('mqttClientId', clientId);
    
    // Update MQTT config
    MQTT_CONFIG.server = server;
    MQTT_CONFIG.username = username;
    MQTT_CONFIG.password = password;
    MQTT_CONFIG.clientId = clientId;
    
    showToast('MQTT settings saved. Reconnect to apply.', 'success');
    
    // Reconnect MQTT
    if (mqttClient) {
        mqttClient.end();
        setTimeout(connectMQTT, 1000);
    }
}

function saveAppearanceSettings() {
    const theme = document.getElementById('themeSelect').value;
    const animations = document.getElementById('animationToggle').checked;
    const notifications = document.getElementById('notificationsToggle').checked;
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('animationsEnabled', animations);
    localStorage.setItem('notificationsEnabled', notifications);
    
    // Apply theme immediately
    applyTheme(theme);
    
    // Toggle animations
    document.documentElement.style.setProperty('--animate', animations ? 'all 0.3s ease' : 'none');
    
    showToast('Appearance settings saved', 'success');
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    document.getElementById('themeSelect').value = savedTheme;
}

function applyTheme(theme = null) {
    if (!theme) {
        theme = document.getElementById('themeSelect').value;
    }
    
    const htmlElement = document.documentElement;
    
    if (theme === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }
    
    // Remove all theme classes
    htmlElement.classList.remove('dark', 'light');
    
    // Add selected theme class
    htmlElement.classList.add(theme);
    
    // Update theme color meta tag
    const themeColor = theme === 'dark' ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
    
    // Save preference
    localStorage.setItem('theme', document.getElementById('themeSelect').value);
}

function saveSecuritySettings() {
    const timeout = document.getElementById('sessionTimeout').value;
    const requireAuth = document.getElementById('requireAuth').checked;
    
    // Validation
    if (timeout < 5 || timeout > 240) {
        showToast('Session timeout must be between 5 and 240 minutes', 'error');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('sessionTimeout', timeout);
    localStorage.setItem('requireAuth', requireAuth);
    
    showToast('Security settings saved', 'success');
}

function clearAllData() {
    if (!confirm('⚠️ Are you sure you want to clear all data? This action cannot be undone!')) {
        return;
    }
    
    // Clear all localStorage except essential PWA data
    const itemsToKeep = ['customPresets', 'smartHomeSchedules', 'mqttServer', 'mqttUsername', 'mqttPassword', 'theme'];
    
    Object.keys(localStorage).forEach(key => {
        if (!itemsToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
    
    // Reset to default values
    loadAllSettings();
    
    // Clear activity log
    if (elements.activityLog) {
        elements.activityLog.innerHTML = '';
    }
    
    // Reset relays
    RELAYS.forEach(relay => {
        relay.state = false;
        updateRelayUI(relay.id, false);
    });
    
    showToast('All data cleared successfully', 'success');
    logMessage('📋 All user data cleared');
}

function exportConfiguration() {
    const config = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        mqtt: {
            server: document.getElementById('mqttServer').value,
            username: document.getElementById('mqttUsername').value
            // Note: Not exporting password for security
        },
        appearance: {
            theme: document.getElementById('themeSelect').value,
            animations: document.getElementById('animationToggle').checked,
            notifications: document.getElementById('notificationsToggle').checked
        },
        security: {
            sessionTimeout: document.getElementById('sessionTimeout').value,
            requireAuth: document.getElementById('requireAuth').checked
        },
        data: {
            logRetention: document.getElementById('logRetention').value
        },
        presets: localStorage.getItem('customPresets'),
        schedules: localStorage.getItem('smartHomeSchedules')
    };
    
    const configStr = JSON.stringify(config, null, 2);
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `atomic-db-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Configuration exported successfully', 'success');
}

function importConfiguration(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            
            if (!confirm(`Import configuration from ${config.exportDate}?`)) {
                return;
            }
            
            // Import settings
            if (config.mqtt) {
                document.getElementById('mqttServer').value = config.mqtt.server || '';
                document.getElementById('mqttUsername').value = config.mqtt.username || '';
            }
            
            if (config.appearance) {
                document.getElementById('themeSelect').value = config.appearance.theme || 'dark';
                document.getElementById('animationToggle').checked = config.appearance.animations !== false;
                document.getElementById('notificationsToggle').checked = config.appearance.notifications !== false;
                applyTheme(config.appearance.theme);
            }
            
            if (config.security) {
                document.getElementById('sessionTimeout').value = config.security.sessionTimeout || '30';
                document.getElementById('requireAuth').checked = config.security.requireAuth !== false;
            }
            
            if (config.data) {
                document.getElementById('logRetention').value = config.data.logRetention || '30';
            }
            
            // Import presets and schedules
            if (config.presets) {
                localStorage.setItem('customPresets', config.presets);
            }
            
            if (config.schedules) {
                localStorage.setItem('smartHomeSchedules', config.schedules);
                schedules = JSON.parse(config.schedules);
                renderSchedules();
            }
            
            // Save all settings
            saveMqttSettings();
            saveAppearanceSettings();
            saveSecuritySettings();
            
            showToast('Configuration imported successfully', 'success');
            
        } catch (error) {
            showToast('Error importing configuration: Invalid file format', 'error');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
}

// ✅ UI UPDATE FUNCTIONS
function updateMessageCount() {
    if (elements.messageCount) {
        elements.messageCount.textContent = messageCount;
    }
}

function updateUptime() {
    if (!elements.uptime) return;
    
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    elements.uptime.textContent = 
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${seconds.toString().padStart(2, '0')}`;
}

function logMessage(message) {
    if (!elements.activityLog) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `<span class="log-time">[${timestamp}]</span>
                        <span class="log-message">${message}</span>`;
    
    elements.activityLog.appendChild(logItem);
    elements.activityLog.scrollTop = elements.activityLog.scrollHeight;
}

function showToast(message, type = 'info') {
    if (!elements.toast) return;
    
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// ✅ PRESET FUNCTIONS
function applyPreset(presetId) {
    const preset = PRESET_MODES[presetId];
    if (!preset) {
        showToast('Preset not found', 'error');
        return;
    }
    
    showToast(`Applying ${preset.name}...`, 'info');
    logMessage(`⚡ Applying preset: ${preset.name}`);
    
    let commands = [];
    for (const [relayId, state] of Object.entries(preset.relays)) {
        commands.push(`R${relayId}:${state ? '1' : '0'}`);
    }
    
    sendPresetCommands(commands, 0);
    localStorage.setItem('lastPreset', presetId);
}

function sendPresetCommands(commands, index) {
    if (index >= commands.length) {
        showToast('Preset applied successfully!', 'success');
        logMessage('✅ Preset applied');
        return;
    }
    
    publishMessage(MQTT_CONFIG.topics.control, commands[index]);
    
    setTimeout(() => {
        sendPresetCommands(commands, index + 1);
    }, 100);
}

function createCustomPreset(name, relayStates) {
    const presetId = 'custom_' + name.toLowerCase().replace(/\s+/g, '_');
    
    PRESET_MODES[presetId] = {
        name: name,
        description: 'Custom preset',
        icon: 'fa-star',
        relays: relayStates
    };
    
    localStorage.setItem('customPresets', JSON.stringify(PRESET_MODES));
    showToast(`Custom preset "${name}" created!`, 'success');
    return presetId;
}

function saveCurrentAsPreset(presetName) {
    const relayStates = {};
    RELAYS.forEach(relay => {
        relayStates[relay.id] = relay.state;
    });
    
    createCustomPreset(presetName, relayStates);
}

function loadSavedPresets() {
    const saved = localStorage.getItem('customPresets');
    if (saved) {
        const customPresets = JSON.parse(saved);
        Object.assign(PRESET_MODES, customPresets);
    }
}

function setupPresetButtons() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const presetId = this.getAttribute('data-preset');
            applyPreset(presetId);
            
            this.classList.add('active');
            setTimeout(() => {
                this.classList.remove('active');
            }, 1000);
        });
    });
    
    const btnCreatePreset = document.getElementById('btnCreatePreset');
    if (btnCreatePreset) {
        btnCreatePreset.addEventListener('click', function() {
            const presetName = prompt('Enter preset name:');
            if (presetName) {
                saveCurrentAsPreset(presetName);
                updatePresetsUI();
            }
        });
    }
}

function updatePresetsUI() {
    const presetsContainer = document.querySelector('.presets-grid');
    if (!presetsContainer) return;
    
    presetsContainer.innerHTML = '';
    
    Object.entries(PRESET_MODES).forEach(([id, preset]) => {
        const presetBtn = document.createElement('button');
        presetBtn.className = `preset-btn ${id.startsWith('custom_') ? 'custom' : ''}`;
        presetBtn.setAttribute('data-preset', id);
        presetBtn.innerHTML = `
            <i class="fas ${preset.icon}"></i>
            <span>${preset.name}</span>
            <small>${preset.description}</small>
            ${id.startsWith('custom_') ? `
            <div class="preset-actions">
                <button class="btn-icon-small" onclick="deletePreset('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>` : ''}
        `;
        presetsContainer.appendChild(presetBtn);
    });
    
    setupPresetButtons();
}

function deletePreset(presetId) {
    if (confirm(`Delete preset "${PRESET_MODES[presetId]?.name}"?`)) {
        delete PRESET_MODES[presetId];
        localStorage.setItem('customPresets', JSON.stringify(PRESET_MODES));
        updatePresetsUI();
        showToast('Preset deleted', 'success');
    }
}

// ✅ SCHEDULE SYSTEM FUNCTIONS
function loadSchedules() {
    const saved = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (saved) {
        schedules = JSON.parse(saved);
        console.log(`Loaded ${schedules.length} schedules`);
    } else {
        // Default schedules
        schedules = [
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
            },
            {
                id: '3',
                name: 'Away Mode (Weekdays)',
                time: '08:30',
                preset: 'away',
                days: ['mon', 'tue', 'wed', 'thu', 'fri'],
                enabled: true,
                lastTriggered: null
            }
        ];
        saveSchedules();
    }
}

function saveSchedules() {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
}

function renderSchedules() {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;
    
    scheduleList.innerHTML = '';
    
    if (schedules.length === 0) {
        scheduleList.innerHTML = `
            <div class="no-schedules glass">
                <i class="fas fa-clock fa-2x"></i>
                <p>No schedules yet. Add your first schedule!</p>
            </div>
        `;
        return;
    }
    
    schedules.forEach(schedule => {
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
        
        scheduleList.appendChild(scheduleItem);
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
        const schedule = schedules.find(s => s.id === scheduleId);
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
        const scheduleIndex = schedules.findIndex(s => s.id === editingId);
        if (scheduleIndex !== -1) {
            schedules[scheduleIndex] = {
                ...schedules[scheduleIndex],
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
        
        schedules.push(newSchedule);
        showToast('Schedule created successfully', 'success');
    }
    
    saveSchedules();
    renderSchedules();
    closeScheduleModal();
}

function toggleSchedule(scheduleId) {
    const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex !== -1) {
        schedules[scheduleIndex].enabled = !schedules[scheduleIndex].enabled;
        saveSchedules();
        renderSchedules();
        showToast(`Schedule ${schedules[scheduleIndex].enabled ? 'enabled' : 'disabled'}`, 'success');
    }
}

function editSchedule(scheduleId) {
    openScheduleModal(scheduleId);
}

function deleteSchedule(scheduleId) {
    if (confirm('Are you sure you want to delete this schedule?')) {
        schedules = schedules.filter(s => s.id !== scheduleId);
        saveSchedules();
        renderSchedules();
        showToast('Schedule deleted', 'success');
    }
}

function checkSchedules() {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:mm
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().substring(0, 3);
    
    console.log(`⏰ Checking schedules at ${currentTime} on ${currentDay}`);
    
    let triggeredCount = 0;
    
    schedules.forEach(schedule => {
        if (!schedule.enabled) {
            console.log(`  ⏭️ ${schedule.name}: Disabled`);
            return;
        }
        
        if (!schedule.days.includes(currentDay)) {
            console.log(`  ⏭️ ${schedule.name}: Not scheduled for ${currentDay}`);
            return;
        }
        
        if (schedule.time !== currentTime) {
            console.log(`  ⏭️ ${schedule.name}: Time mismatch (${schedule.time} != ${currentTime})`);
            return;
        }
        
        // Check if already triggered at this time today
        const today = now.toDateString();
        if (schedule.lastTriggered === today) {
            console.log(`  ⏭️ ${schedule.name}: Already triggered today`);
            return;
        }
        
        // Trigger the schedule
        console.log(`  ✅ ${schedule.name}: TRIGGERING!`);
        triggerSchedule(schedule);
        triggeredCount++;
    });
    
    if (triggeredCount > 0) {
        console.log(`⏰ Triggered ${triggeredCount} schedule(s)`);
    }
}

function triggerSchedule(schedule) {
    console.log(`⏰ Triggering schedule: ${schedule.name} at ${schedule.time}`);
    
    // Get the preset configuration
    const preset = PRESET_MODES[schedule.preset];
    if (!preset) {
        showToast(`❌ Preset "${schedule.preset}" not found`, 'error');
        return;
    }
    
    // Send MQTT commands for each relay in the preset
    const commands = [];
    for (const [relayId, state] of Object.entries(preset.relays)) {
        commands.push(`R${relayId}:${state ? '1' : '0'}`);
    }
    
    // Send commands with delay
    sendScheduleCommands(commands, 0, schedule);
}

function sendScheduleCommands(commands, index, schedule) {
    if (index >= commands.length) {
        // Update last triggered
        schedule.lastTriggered = new Date().toDateString();
        saveSchedules();
        
        // Show success notification
        const presetName = PRESET_MODES[schedule.preset]?.name || schedule.preset;
        showToast(`⏰ Schedule: ${presetName} activated`, 'success');
        logMessage(`⏰ Schedule triggered: ${schedule.name} → ${presetName}`);
        return;
    }
    
    // Send the MQTT command
    publishMessage(MQTT_CONFIG.topics.control, commands[index]);
    
    // Send next command after delay
    setTimeout(() => {
        sendScheduleCommands(commands, index + 1, schedule);
    }, 300); // 300ms delay between commands
}

function startScheduleChecker() {
    // Clear existing interval
    if (scheduleInterval) {
        clearInterval(scheduleInterval);
    }
    
    // Check schedules every minute
    scheduleInterval = setInterval(checkSchedules, 10000);
    
    // Also check immediately on load
    setTimeout(checkSchedules, 1000);
    
    console.log('✅ Schedule checker started');
}

function initializeSchedules() {
    loadSchedules();
    renderSchedules();
    startScheduleChecker();
}

// ✅ SETUP EVENT LISTENERS
function setupEventListeners() {
    // Quick Actions
    const btnAllOn = document.getElementById('btnAllOn');
    const btnAllOff = document.getElementById('btnAllOff');
    const btnRefresh = document.getElementById('btnRefresh');
    
    if (btnAllOn) btnAllOn.addEventListener('click', () => controlAllRelays(true));
    if (btnAllOff) btnAllOff.addEventListener('click', () => controlAllRelays(false));
    if (btnRefresh) btnRefresh.addEventListener('click', requestStatus);
    
    // Groups
    const btnGroupBedrooms = document.getElementById('btnGroupBedrooms');
    const btnGroupEssentials = document.getElementById('btnGroupEssentials');
    
    if (btnGroupBedrooms) btnGroupBedrooms.addEventListener('click', () => controlGroup('BEDROOMS', true));
    if (btnGroupEssentials) btnGroupEssentials.addEventListener('click', () => controlGroup('ESSENTIALS', true));
    
    // Ranges
    const btnRange1_8 = document.getElementById('btnRange1_8');
    const btnRange9_16 = document.getElementById('btnRange9_16');
    
    if (btnRange1_8) btnRange1_8.addEventListener('click', () => controlRelayRange(1, 8, true));
    if (btnRange9_16) btnRange9_16.addEventListener('click', () => controlRelayRange(9, 16, true));
    
    // Clear Log
    const btnClearLog = document.getElementById('btnClearLog');
    if (btnClearLog) {
        btnClearLog.addEventListener('click', () => {
            if (elements.activityLog) {
                elements.activityLog.innerHTML = '';
                logMessage('📋 Log cleared');
            }
        });
    }
    
    // Manual Connection Controls in Modal
    const modalReconnect = document.getElementById('modalReconnect');
    const modalDisconnect = document.getElementById('modalDisconnect');
    
    if (modalReconnect) {
        modalReconnect.addEventListener('click', function() {
            console.log('🔄 Manual reconnect requested from modal');
            connectionState.connectionAttempts = 0;
            connectionState.autoReconnect = true;
            
            if (mqttClient) {
                mqttClient.end(true);
            }
            
            setTimeout(() => {
                connectMQTT();
                showToast('Reconnecting...', 'info');
            }, 500);
        });
    }
    
    if (modalDisconnect) {
        modalDisconnect.addEventListener('click', function() {
            console.log('🔌 Manual disconnect requested');
            connectionState.autoReconnect = false;
            
            if (mqttClient && mqttClient.connected) {
                mqttClient.end();
                showToast('Disconnected', 'info');
            }
        });
    }
    
    console.log("✅ Event listeners setup complete");
}

// ✅ RESPONSIVE FUNCTIONS
function setupResponsiveBehavior() {
    // Mobile menu toggle
    const menuToggle = document.createElement('button');
    menuToggle.id = 'menuToggle';
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.appendChild(menuToggle);
    
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    // Adjust grid columns based on screen size
    function adjustGridColumns() {
        const relaysGrid = document.getElementById('relaysGrid');
        const advancedGrid = document.getElementById('advancedControlsGrid');
        const presetsGrid = document.querySelector('.presets-grid');
        
        if (!relaysGrid || !advancedGrid || !presetsGrid) return;
        
        const width = window.innerWidth;
        
        if (width <= 480) {
            relaysGrid.style.gridTemplateColumns = '1fr';
            if (advancedGrid) advancedGrid.style.gridTemplateColumns = '1fr';
            presetsGrid.style.gridTemplateColumns = '1fr';
        } else if (width <= 767) {
            relaysGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            if (advancedGrid) advancedGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            presetsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else if (width <= 1024) {
            relaysGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            if (advancedGrid) advancedGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
            presetsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        } else {
            relaysGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
            if (advancedGrid) advancedGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
            presetsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
        }
    }
    
    // Initial adjustment
    adjustGridColumns();
    
    // Adjust on resize
    window.addEventListener('resize', adjustGridColumns);
    
    // Touch gestures for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0 && window.innerWidth <= 1024) {
                // Swipe right - open sidebar
                sidebar.classList.add('active');
            } else if (swipeDistance < 0 && window.innerWidth <= 1024) {
                // Swipe left - close sidebar
                sidebar.classList.remove('active');
            }
        }
    }
    
    // Optimize for mobile performance
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            if (connection.saveData || connection.effectiveType.includes('2g')) {
                // Data saver mode or slow connection
                console.log('Slow connection detected, optimizing for mobile...');
                // Disable heavy animations
                document.documentElement.style.setProperty('--glow-primary', 'none');
                document.documentElement.style.setProperty('--glow-success', 'none');
                document.documentElement.style.setProperty('--glow-warning', 'none');
            }
        }
    }
}

// ✅ NETWORK STATE DETECTION
function setupNetworkDetection() {
    // Online/Offline detection
    window.addEventListener('online', () => {
        console.log('🌐 Device is back online');
        showToast('Back online', 'success');
        
        // Try to reconnect if we're disconnected
        if (!connectionState.isConnected && connectionState.autoReconnect) {
            setTimeout(() => {
                console.log('🔄 Attempting reconnect after coming online...');
                connectMQTT();
            }, 2000);
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('🌐 Device is offline');
        showToast('You are offline', 'error');
        updateConnectionStatus('Offline', 'error');
        
        // Stop trying to reconnect while offline
        connectionState.autoReconnect = false;
    });
    
    // Check network quality
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            connection.addEventListener('change', () => {
                console.log('📶 Network connection changed:', {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                });
                
                // Adjust MQTT settings based on network
                adjustMQTTForNetwork(connection);
            });
            
            // Initial adjustment
            adjustMQTTForNetwork(connection);
        }
    }
}

// ✅ ADJUST MQTT FOR NETWORK CONDITIONS
function adjustMQTTForNetwork(connection) {
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        console.log('📶 Slow network detected, adjusting MQTT settings');
        
        // Reduce keepalive and increase timeout for slow networks
        MQTT_CONFIG.keepalive = 60;
        MQTT_CONFIG.connectTimeout = 15000;
        
        // Reduce ping frequency
        if (connectionState.pingInterval) {
            clearInterval(connectionState.pingInterval);
            connectionState.pingInterval = setInterval(() => {
                if (mqttClient && mqttClient.connected) {
                    mqttClient.publish('$SYS/ping', 'ping', { qos: 0 });
                }
            }, 30000); // Every 30 seconds on slow networks
        }
        
    } else if (connection.effectiveType === '4g' || connection.saveData) {
        console.log('📶 Good network with possible data saving');
        
        // Normal settings but with data saving awareness
        MQTT_CONFIG.keepalive = 30;
        MQTT_CONFIG.connectTimeout = 10000;
    }
}

// ✅ START EVERYTHING
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, starting dashboard...");
    
    // Setup network detection first
    setupNetworkDetection();
    
    // Setup responsive behavior
    setupResponsiveBehavior();
    
    // Initialize dashboard
    initializeDashboard();
    
    // Initialize schedules
    setTimeout(initializeSchedules, 500);
    
    // Setup event listeners
    setTimeout(setupEventListeners, 1000);
    
    // Connect to MQTT with a delay
    setTimeout(() => {
        console.log('⏳ Initializing MQTT connection...');
        connectMQTT();
    }, 1500);
    
    // Update uptime every second
    setInterval(updateUptime, 1000);
    
    // Keep connection alive
    setInterval(() => {
        if (connectionState.isConnected && mqttClient) {
            mqttClient.publish('$SYS/keepalive', 'ping', { qos: 0 });
        }
    }, 30000);
    
    // Check for analytics/settings page on load
    const hash = window.location.hash.substring(1) || 'dashboard';
    if (hash === 'analytics') {
        setTimeout(initializeAnalytics, 500);
    } else if (hash === 'settings') {
        setTimeout(initializeSettings, 500);
    }
});

// ✅ MAKE FUNCTIONS GLOBALLY AVAILABLE
window.controlRelay = controlRelay;
window.controlAllRelays = controlAllRelays;
window.controlRelayRange = controlRelayRange;
window.controlGroup = controlGroup;
window.requestStatus = requestStatus;
window.reconnectMQTT = () => {
    console.log('🔄 Manual reconnect requested');
    connectionState.connectionAttempts = 0;
    connectionState.autoReconnect = true;
    
    if (mqttClient) {
        mqttClient.end(true);
    }
    
    setTimeout(connectMQTT, 500);
};
window.showToast = showToast;
window.publishMessage = publishMessage;
window.applyPreset = applyPreset;
window.deletePreset = deletePreset;
window.initializeDashboard = initializeDashboard;
window.applyTheme = applyTheme;
window.importConfiguration = importConfiguration;

// ✅ SCHEDULE FUNCTIONS
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.saveSchedule = saveSchedule;
window.toggleSchedule = toggleSchedule;
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;

