// MQTT Configuration
const MQTT_CONFIG = {
    server: 'wss://0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud:8884/mqtt',
    username: 'SMARTHOMEDB',
    password: 'Aa1234567@',
    topics: {
        control: 'smarthome/control',
        status: 'smarthome/status'
    },
    clientId: 'smart-home-dashboard-' + Math.random().toString(16).slice(2, 8)
};

// Relay Definitions (16 relays matching your ESP32)
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

// Global Variables
let mqttClient = null;
let startTime = Date.now();
let messageCount = 0;
let isConnected = false;

// DOM Elements
let elements = {};

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
    
    logMessage('🚀 Dashboard initialized');
    console.log("✅ Dashboard initialized successfully");
    
    // Force initial stats display
    setTimeout(updateStats, 100);
}
// Add this to your existing navigation script

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.querySelector('.sidebar');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
            this.innerHTML = sidebar.classList.contains('mobile-open') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        }
    });
}

// Close mobile menu when clicking a nav item
navItems.forEach(item => {
    item.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
            mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !mobileMenuToggle.contains(e.target) &&
        sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
});
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

// ✅ PUBLISH MESSAGE
function publishMessage(topic, message) {
    if (mqttClient && mqttClient.connected) {
        console.log(`📤 [MQTT OUT] ${topic}: ${message}`);
        mqttClient.publish(topic, message, { qos: 1 }, (error) => {
            if (error) {
                console.error('❌ MQTT Publish Error:', error);
                showToast(`Failed to send: ${error.message}`, 'error');
            } else {
                console.log(`✅ MQTT Published: ${message}`);
                logMessage(`📤 [${topic}]: ${message}`);
                messageCount++;
                updateMessageCount();
            }
        });
    } else {
        console.warn('⚠️ Cannot publish: MQTT not connected');
        showToast('Not connected to MQTT', 'error');
        updateConnectionStatus('Disconnected', 'error');
        
        setTimeout(() => {
            if (mqttClient && !mqttClient.connected) {
                mqttClient.reconnect();
            }
        }, 1000);
    }
}

// ✅ MQTT CONNECTION
function connectMQTT() {
    updateConnectionStatus('Connecting...', 'connecting');
    
    const options = {
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        clientId: MQTT_CONFIG.clientId,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        keepalive: 60
    };
    
    try {
        mqttClient = mqtt.connect(MQTT_CONFIG.server, options);
        
        mqttClient.on('connect', () => {
            isConnected = true;
            updateConnectionStatus('Connected', 'connected');
            showToast('✅ Connected to HiveMQ Cloud', 'success');
            logMessage('✅ Connected to HiveMQ Cloud');
            
            mqttClient.subscribe(MQTT_CONFIG.topics.status, { qos: 1 }, (err) => {
                if (!err) {
                    logMessage(`📡 Subscribed to: ${MQTT_CONFIG.topics.status}`);
                    setTimeout(requestStatus, 1000);
                }
            });
        });
        
        mqttClient.on('message', (topic, message) => {
            console.log(`📨 [MQTT IN] ${topic}: ${message.toString()}`);
            handleMQTTMessage(topic, message.toString());
        });
        
        mqttClient.on('error', (error) => {
            console.error('❌ MQTT Error:', error);
            updateConnectionStatus('Error', 'error');
            showToast(`Connection error: ${error.message}`, 'error');
            logMessage(`❌ MQTT Error: ${error.message}`);
        });
        
        mqttClient.on('reconnect', () => {
            updateConnectionStatus('Reconnecting...', 'connecting');
            logMessage('🔄 Reconnecting to MQTT...');
        });
        
        mqttClient.on('close', () => {
            isConnected = false;
            updateConnectionStatus('Disconnected', 'error');
            logMessage('⚠️ Disconnected from MQTT');
        });
        
        mqttClient.on('offline', () => {
            isConnected = false;
            updateConnectionStatus('Offline', 'error');
            logMessage('📴 MQTT Offline');
        });
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        updateConnectionStatus('Failed', 'error');
        showToast(`Connection failed: ${error.message}`, 'error');
        logMessage(`❌ Connection error: ${error.message}`);
    }
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

// ✅ UI UPDATE FUNCTIONS
function updateConnectionStatus(text, status) {
    if (!elements.statusText || !elements.connectionDetails) return;
    
    elements.statusText.textContent = text;
    elements.connectionDetails.textContent = text;
    
    if (elements.statusDot) {
        elements.statusDot.className = 'status-dot';
        if (status === 'connected') {
            elements.statusDot.classList.add('connected');
        }
    }
}

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
    
    console.log("✅ Event listeners setup complete");
}

// ✅ SCHEDULE SYSTEM
const SCHEDULES_STORAGE_KEY = 'smartHomeSchedules';
let schedules = [];
let scheduleInterval = null;

// ✅ INITIALIZE SCHEDULES
function initializeSchedules() {
    loadSchedules();
    renderSchedules();
    startScheduleChecker();
}

// ✅ LOAD SCHEDULES FROM LOCALSTORAGE
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

// ✅ SAVE SCHEDULES
function saveSchedules() {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
}

// ✅ RENDER SCHEDULES
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

// ✅ OPEN SCHEDULE MODAL
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

// ✅ CLOSE SCHEDULE MODAL
function closeScheduleModal() {
    document.getElementById('scheduleModal').style.display = 'none';
}

// ✅ SAVE SCHEDULE
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

// ✅ TOGGLE SCHEDULE
function toggleSchedule(scheduleId) {
    const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
    if (scheduleIndex !== -1) {
        schedules[scheduleIndex].enabled = !schedules[scheduleIndex].enabled;
        saveSchedules();
        renderSchedules();
        showToast(`Schedule ${schedules[scheduleIndex].enabled ? 'enabled' : 'disabled'}`, 'success');
    }
}

// ✅ EDIT SCHEDULE
function editSchedule(scheduleId) {
    openScheduleModal(scheduleId);
}

// ✅ DELETE SCHEDULE
function deleteSchedule(scheduleId) {
    if (confirm('Are you sure you want to delete this schedule?')) {
        schedules = schedules.filter(s => s.id !== scheduleId);
        saveSchedules();
        renderSchedules();
        showToast('Schedule deleted', 'success');
    }
}

// ✅ CHECK SCHEDULES (Enhanced with better logging)
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

// ✅ TRIGGER SCHEDULE
// ✅ TRIGGER SCHEDULE (FIXED - Now sends MQTT commands)
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

// ✅ SEND SCHEDULE COMMANDS WITH DELAY
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

// ✅ START SCHEDULE CHECKER
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

// ✅ FORMAT TIME
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
}

// ✅ DAY NAMES
const DAY_NAMES = {
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday',
    'sun': 'Sunday'
};

// ✅ START EVERYTHING
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, starting dashboard...");
    
    // Initialize dashboard
    initializeDashboard();
    
    // Initialize schedules
    setTimeout(initializeSchedules, 500);
    
    // Connect to MQTT
    setTimeout(connectMQTT, 500);
    
    // Setup event listeners
    setTimeout(setupEventListeners, 1000);
    
    // Update uptime every second
    setInterval(updateUptime, 1000);
    
    // Keep connection alive
    setInterval(() => {
        if (isConnected && mqttClient) {
            mqttClient.publish('$SYS/keepalive', 'ping', { qos: 0 });
        }
    }, 30000);
});

// ✅ MAKE FUNCTIONS GLOBALLY AVAILABLE
window.controlRelay = controlRelay;
window.controlAllRelays = controlAllRelays;
window.controlRelayRange = controlRelayRange;
window.controlGroup = controlGroup;
window.requestStatus = requestStatus;
window.reconnectMQTT = () => {
    if (mqttClient) {
        mqttClient.reconnect();
    }
};
window.showToast = showToast;
window.publishMessage = publishMessage;
window.applyPreset = applyPreset;
window.deletePreset = deletePreset;
window.initializeDashboard = initializeDashboard;

// ✅ SCHEDULE FUNCTIONS
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.saveSchedule = saveSchedule;
window.toggleSchedule = toggleSchedule;
window.editSchedule = editSchedule;

window.deleteSchedule = deleteSchedule;
