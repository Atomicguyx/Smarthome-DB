// ✅ ULTRA-STABLE MQTT CONFIGURATION FOR ANDROID
const MQTT_CONFIG = {
    server: 'wss://0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud:8884/mqtt',
    username: 'SMARTHOMEDB',
    password: 'Aa1234567@',
    topics: {
        control: 'smarthome/control',
        status: 'smarthome/status'
    },
    clientId: 'atomic-android-' + Date.now() + '-' + Math.random().toString(16).slice(2, 10)
};

// ✅ RELAY DEFINITIONS
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

// ✅ GLOBAL VARIABLES
let mqttClient = null;
let startTime = Date.now();
let messageCount = 0;
let elements = {};

// ✅ ANDROID-SPECIFIC CONNECTION MANAGER
const ConnectionManager = {
    isConnected: false,
    isConnecting: false,
    lastConnectAttempt: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 2000,
    pingInterval: null,
    offlineMode: false,
    
    // Connection state flags
    connectionState: 'disconnected', // 'disconnected', 'connecting', 'connected', 'reconnecting'
    
    // Connection stats
    stats: {
        totalConnections: 0,
        successfulConnections: 0,
        failedConnections: 0,
        lastConnectionTime: 0,
        totalUptime: 0
    },
    
    // Initialize connection manager
    init() {
        console.log('🔧 Connection Manager initialized');
        this.setupNetworkListeners();
        this.loadConnectionStats();
    },
    
    // Setup network event listeners
    setupNetworkListeners() {
        // Online/Offline detection
        window.addEventListener('online', () => {
            console.log('📱 Device is back online');
            this.offlineMode = false;
            showToast('Back online', 'success');
            
            // Try to reconnect if we were connected before
            if (!this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    console.log('🔄 Attempting reconnect after coming online...');
                    this.connect();
                }, 3000);
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('📱 Device is offline');
            this.offlineMode = true;
            showToast('You are offline', 'warning');
            this.updateConnectionStatus('Offline', 'disconnected');
            
            // Stop trying to reconnect
            this.stopReconnect();
        });
        
        // Page visibility API for Android Chrome
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 App went to background');
                // Reduce ping frequency when in background
                this.adjustBackgroundMode(true);
            } else {
                console.log('📱 App came to foreground');
                // Restore normal ping frequency
                this.adjustBackgroundMode(false);
                
                // Check connection status
                if (!this.isConnected && !this.offlineMode) {
                    setTimeout(() => this.connect(), 1000);
                }
            }
        });
    },
    
    // Load connection statistics from localStorage
    loadConnectionStats() {
        const savedStats = localStorage.getItem('mqttConnectionStats');
        if (savedStats) {
            this.stats = JSON.parse(savedStats);
        }
    },
    
    // Save connection statistics
    saveConnectionStats() {
        localStorage.setItem('mqttConnectionStats', JSON.stringify(this.stats));
    },
    
    // Main connect function
    async connect() {
        if (this.isConnecting || this.offlineMode) {
            console.log('⚠️ Already connecting or offline, skipping...');
            return;
        }
        
        const now = Date.now();
        const timeSinceLastAttempt = now - this.lastConnectAttempt;
        
        // Prevent too frequent connection attempts
        if (timeSinceLastAttempt < 2000) {
            console.log('⏳ Waiting before next connection attempt...');
            return;
        }
        
        this.isConnecting = true;
        this.lastConnectAttempt = now;
        this.reconnectAttempts++;
        this.stats.totalConnections++;
        
        console.log(`🔗 Connection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        // Update UI
        this.updateConnectionStatus('Connecting...', 'connecting');
        
        // Clean up existing connection
        if (mqttClient) {
            try {
                mqttClient.end(true);
                mqttClient = null;
            } catch (e) {
                console.warn('Error cleaning up old connection:', e);
            }
        }
        
        // Connection options optimized for Android
        const options = {
            username: MQTT_CONFIG.username,
            password: MQTT_CONFIG.password,
            clientId: MQTT_CONFIG.clientId,
            clean: true,
            reconnectPeriod: 0, // We handle reconnection manually
            connectTimeout: 8000, // Shorter timeout for mobile
            keepalive: 25, // Keepalive for mobile networks
            protocolVersion: 4,
            resubscribe: false,
            queueQoSZero: false,
            rejectUnauthorized: false
        };
        
        try {
            console.log('🌐 Creating WebSocket connection...');
            
            // Special handling for Android WebSocket
            mqttClient = mqtt.connect(MQTT_CONFIG.server, options);
            
            // Setup event handlers
            this.setupEventHandlers();
            
        } catch (error) {
            console.error('❌ Connection setup failed:', error);
            this.handleConnectionError('Connection setup failed: ' + error.message);
            this.isConnecting = false;
        }
    },
    
    // Setup MQTT event handlers
    setupEventHandlers() {
        if (!mqttClient) return;
        
        mqttClient.on('connect', () => {
            console.log('✅ MQTT Connected successfully');
            this.handleConnectSuccess();
        });
        
        mqttClient.on('message', (topic, message) => {
            const messageStr = message.toString();
            console.log(`📨 [MQTT IN] ${topic}: ${messageStr}`);
            messageCount++;
            updateMessageCount();
            logMessage(`📨 [${topic}]: ${messageStr}`);
            
            if (topic === MQTT_CONFIG.topics.status) {
                handleMQTTMessage(topic, messageStr);
            }
        });
        
        mqttClient.on('error', (error) => {
            console.error('❌ MQTT Error:', error);
            this.handleConnectionError('MQTT Error: ' + error.message);
        });
        
        mqttClient.on('close', () => {
            console.log('🔌 MQTT Connection closed');
            this.handleConnectionClose();
        });
        
        mqttClient.on('offline', () => {
            console.log('📴 MQTT Offline');
            this.updateConnectionStatus('Offline', 'disconnected');
        });
    },
    
    // Handle successful connection
    handleConnectSuccess() {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionState = 'connected';
        
        this.stats.successfulConnections++;
        this.stats.lastConnectionTime = Date.now();
        this.saveConnectionStats();
        
        // Update UI
        this.updateConnectionStatus('Connected', 'connected');
        showToast('✅ Connected to HiveMQ Cloud', 'success');
        logMessage('✅ Connected to HiveMQ Cloud');
        
        // Subscribe to topics with retry logic
        this.subscribeWithRetry();
        
        // Start keep-alive ping
        this.startKeepAlive();
        
        // Request initial status with delay
        setTimeout(() => {
            if (this.isConnected) {
                console.log('📊 Requesting initial status...');
                requestStatus();
            }
        }, 1500);
    },
    
    // Subscribe with retry for Android
    subscribeWithRetry() {
        if (!mqttClient || !mqttClient.connected) return;
        
        const maxRetries = 3;
        let retries = 0;
        
        const attemptSubscribe = () => {
            mqttClient.subscribe(MQTT_CONFIG.topics.status, { qos: 1 }, (err) => {
                if (err) {
                    console.error(`❌ Subscription failed (attempt ${retries + 1}/${maxRetries}):`, err);
                    retries++;
                    
                    if (retries < maxRetries) {
                        setTimeout(attemptSubscribe, 1000 * retries);
                    } else {
                        console.error('❌ Max subscription retries reached');
                        logMessage(`❌ Failed to subscribe after ${maxRetries} attempts`);
                    }
                } else {
                    console.log(`📡 Subscribed to: ${MQTT_CONFIG.topics.status}`);
                    logMessage(`📡 Subscribed to: ${MQTT_CONFIG.topics.status}`);
                }
            });
        };
        
        attemptSubscribe();
    },
    
    // Handle connection error
    handleConnectionError(errorMessage) {
        this.isConnected = false;
        this.isConnecting = false;
        this.stats.failedConnections++;
        this.saveConnectionStats();
        
        console.error('🔴 Connection error:', errorMessage);
        this.updateConnectionStatus('Connection Error', 'disconnected');
        showToast('Connection error: ' + errorMessage, 'error');
        logMessage(`❌ ${errorMessage}`);
        
        // Schedule reconnection if not offline
        if (!this.offlineMode && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    },
    
    // Handle connection close
    handleConnectionClose() {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        
        this.stopKeepAlive();
        this.updateConnectionStatus('Disconnected', 'disconnected');
        logMessage('🔌 Disconnected from MQTT');
        
        // Schedule reconnection if not offline
        if (!this.offlineMode && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    },
    
    // Schedule reconnection with exponential backoff
    scheduleReconnect() {
        if (this.isConnecting || this.offlineMode) return;
        
        const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
        
        console.log(`⏳ Scheduling reconnect in ${delay}ms...`);
        this.updateConnectionStatus(`Reconnecting in ${Math.round(delay/1000)}s...`, 'connecting');
        
        setTimeout(() => {
            if (!this.isConnected && !this.offlineMode) {
                console.log('🔄 Attempting reconnect...');
                this.connect();
            }
        }, delay);
    },
    
    // Stop all reconnection attempts
    stopReconnect() {
        this.reconnectAttempts = this.maxReconnectAttempts;
        console.log('🛑 Stopping reconnection attempts');
    },
    
    // Start keep-alive ping
    startKeepAlive() {
        this.stopKeepAlive();
        
        this.pingInterval = setInterval(() => {
            if (mqttClient && mqttClient.connected) {
                // Send a simple ping to keep connection alive
                try {
                    // Use a low-QoS publish as keep-alive
                    mqttClient.publish('$SYS/keepalive', Date.now().toString(), { qos: 0, retain: false }, (err) => {
                        if (err) {
                            console.warn('Keep-alive ping failed:', err);
                            // If keep-alive fails, the connection might be dead
                            if (this.isConnected) {
                                this.handleConnectionClose();
                            }
                        }
                    });
                } catch (e) {
                    console.warn('Keep-alive error:', e);
                }
            }
        }, 20000); // Every 20 seconds
    },
    
    // Stop keep-alive ping
    stopKeepAlive() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    },
    
    // Adjust for background/foreground mode
    adjustBackgroundMode(isBackground) {
        if (isBackground) {
            // Reduce ping frequency in background
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = setInterval(() => {
                    if (mqttClient && mqttClient.connected) {
                        mqttClient.publish('$SYS/keepalive', 'bg', { qos: 0 });
                    }
                }, 60000); // Every minute in background
            }
        } else {
            // Restore normal ping frequency
            this.startKeepAlive();
        }
    },
    
    // Update connection status in UI
    updateConnectionStatus(text, status) {
        if (elements.statusText && elements.connectionDetails) {
            elements.statusText.textContent = text;
            elements.connectionDetails.textContent = text;
            
            // Update status dot
            if (elements.statusDot) {
                elements.statusDot.className = 'status-dot';
                if (status === 'connected') {
                    elements.statusDot.classList.add('connected');
                } else if (status === 'connecting') {
                    elements.statusDot.classList.add('connecting');
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
    },
    
    // Disconnect manually
    disconnect() {
        console.log('🔌 Manual disconnect requested');
        this.stopReconnect();
        this.stopKeepAlive();
        
        if (mqttClient) {
            try {
                mqttClient.end();
                mqttClient = null;
            } catch (e) {
                console.warn('Error during disconnect:', e);
            }
        }
        
        this.isConnected = false;
        this.isConnecting = false;
        this.updateConnectionStatus('Disconnected', 'disconnected');
        showToast('Disconnected', 'info');
    },
    
    // Force reconnect
    forceReconnect() {
        console.log('🔄 Force reconnecting...');
        this.reconnectAttempts = 0;
        this.disconnect();
        
        setTimeout(() => {
            this.connect();
        }, 1000);
    }
};

// ✅ PUBLISH MESSAGE WITH CONNECTION CHECK
function publishMessage(topic, message) {
    if (!mqttClient || !mqttClient.connected) {
        console.warn('⚠️ Cannot publish: MQTT not connected');
        showToast('Not connected to MQTT', 'warning');
        ConnectionManager.updateConnectionStatus('Disconnected', 'disconnected');
        
        // Try to reconnect
        if (!ConnectionManager.offlineMode && !ConnectionManager.isConnecting) {
            ConnectionManager.connect();
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
                if (error.message.includes('not connected') || error.code === 'ECONNREFUSED') {
                    ConnectionManager.handleConnectionClose();
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

// ✅ MESSAGE HANDLER
function handleMQTTMessage(topic, message) {
    if (topic === MQTT_CONFIG.topics.status) {
        console.log(`🔄 Processing status message: "${message}"`);
        
        // Full status update (comma-separated)
        if (message.includes(',') && !message.includes('R') && !message.includes('ALL') && !message.includes('GROUP')) {
            console.log("📊 Processing full status update");
            const updates = message.split(',');
            updates.forEach(update => {
                const [id, state] = update.split(':');
                const relayId = parseInt(id.trim());
                const relayState = state === '1';
                
                if (relayId >= 1 && relayId <= 16) {
                    updateRelayUI(relayId, relayState);
                }
            });
            updateStats();
        }
        // Single relay update
        else if (message.includes(':') && !message.includes(',')) {
            console.log("🔧 Processing single relay update");
            
            let relayId, relayState;
            
            if (message.startsWith('R')) {
                relayId = parseInt(message.substring(1, message.indexOf(':')));
                relayState = message.endsWith(':1');
            } else {
                relayId = parseInt(message.split(':')[0]);
                relayState = message.endsWith(':1');
            }
            
            if (relayId >= 1 && relayId <= 16) {
                updateRelayUI(relayId, relayState);
                updateStats();
            }
        }
        // All relays update
        else if (message.startsWith('ALL:')) {
            console.log("🌈 Processing all relays update");
            const state = message.endsWith(':1');
            RELAYS.forEach(relay => {
                updateRelayUI(relay.id, state);
            });
            updateStats();
        }
    }
}

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
    updateStats();
    loadSavedPresets();
    
    // Initialize connection manager
    ConnectionManager.init();
    
    logMessage('🚀 Dashboard initialized');
    console.log("✅ Dashboard initialized successfully");
}

// ✅ CREATE RELAY CARDS
function createRelayCards() {
    if (!elements.relaysGrid) return;
    
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
        elements.relaysGrid.appendChild(relayCard);
    });
}

// ✅ CONTROL FUNCTIONS
function controlRelay(id, state) {
    const command = `R${id}:${state ? '1' : '0'}`;
    console.log(`🔌 Sending: "${command}"`);
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
    
    relay.state = state;
    
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
    
    updateStats();
    logMessage(`Relay ${id}: ${state ? 'ON' : 'OFF'}`);
}

function updateStats() {
    if (!elements.statOn || !elements.statOff || !elements.statTotal || !elements.deviceStats) return;
    
    const onCount = RELAYS.filter(r => r.state).length;
    const offCount = RELAYS.length - onCount;
    
    elements.statOn.textContent = `${onCount} ON`;
    elements.statOff.textContent = `${offCount} OFF`;
    elements.statTotal.textContent = `${RELAYS.length} Total`;
    elements.deviceStats.textContent = `${RELAYS.length} Relays • ${onCount} ON`;
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

// ✅ EVENT LISTENERS
function setupEventListeners() {
    // Quick Actions
    document.getElementById('btnAllOn')?.addEventListener('click', () => controlAllRelays(true));
    document.getElementById('btnAllOff')?.addEventListener('click', () => controlAllRelays(false));
    document.getElementById('btnRefresh')?.addEventListener('click', requestStatus);
    
    // Modal buttons
    document.getElementById('modalReconnect')?.addEventListener('click', () => ConnectionManager.forceReconnect());
    document.getElementById('modalDisconnect')?.addEventListener('click', () => ConnectionManager.disconnect());
    document.getElementById('modalAllOn')?.addEventListener('click', () => controlAllRelays(true));
    document.getElementById('modalAllOff')?.addEventListener('click', () => controlAllRelays(false));
    document.getElementById('modalRefresh')?.addEventListener('click', requestStatus);
    
    // Clear log
    document.getElementById('btnClearLog')?.addEventListener('click', () => {
        if (elements.activityLog) {
            elements.activityLog.innerHTML = '';
            logMessage('📋 Log cleared');
        }
    });
    
    console.log("✅ Event listeners setup complete");
}

// ✅ START APPLICATION
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Starting Atomic Smart DB...");
    
    // Initialize dashboard
    initializeDashboard();
    
    // Setup event listeners
    setTimeout(setupEventListeners, 500);
    
    // Update time display
    function updateTime() {
        const timeDisplay = document.getElementById('timeDisplay');
        if (timeDisplay) {
            const now = new Date();
            timeDisplay.textContent = now.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }
    
    setInterval(updateTime, 1000);
    updateTime();
    
    // Update uptime
    setInterval(updateUptime, 1000);
    
    // Start MQTT connection after a short delay
    setTimeout(() => {
        console.log('⏳ Starting MQTT connection...');
        ConnectionManager.connect();
    }, 2000);
});

// ✅ GLOBAL FUNCTIONS
window.controlRelay = controlRelay;
window.controlAllRelays = controlAllRelays;
window.requestStatus = requestStatus;
window.reconnectMQTT = () => ConnectionManager.forceReconnect();
window.showToast = showToast;
