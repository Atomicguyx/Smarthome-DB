/*************************************************
 * Atomic Smart DB - 16 Channel Relay Controller
 * ESP32 + HiveMQ Cloud Integration
 * WITH EEPROM STATE RESTORE
 *************************************************/

// ====== MQTT CONFIGURATION ======
const HIVEMQ_HOST = "0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud";
const HIVEMQ_PORT = 8884; // WebSocket Secure
const HIVEMQ_USERNAME = "SMARTHOMEDB";
const HIVEMQ_PASSWORD = "Aa1234567@";

// Base topic namespace
const BASE_TOPIC = "atomic";

// ====== APPLICATION STATE ======
let client = null;
let deviceId = "DB001"; // Default device ID
let relayStates = Array(16).fill(false); // Track all 16 relay states
let messageCount = 0;
let connectionStartTime = null;
let isConnected = false;

// ====== PRESETS CONFIGURATION ======
const PRESETS = {
    'home': {
        name: 'Home Mode',
        icon: 'fas fa-home',
        description: 'All essential relays ON',
        relays: [1, 2, 3, 4, 5, 6, 7, 8] // Relays 1-8 ON
    },
    'away': {
        name: 'Away Mode',
        icon: 'fas fa-car',
        description: 'Security mode - minimal power',
        relays: [1, 2] // Only security relays
    },
    'night': {
        name: 'Night Mode',
        icon: 'fas fa-moon',
        description: 'Night lighting only',
        relays: [9, 10, 11, 12] // Relays 9-12 ON
    },
    'energy': {
        name: 'Energy Save',
        icon: 'fas fa-leaf',
        description: 'Power saving mode',
        relays: [1, 3, 5, 7] // Every other relay
    },
    'party': {
        name: 'Party Mode',
        icon: 'fas fa-glass-cheers',
        description: 'All relays ON',
        relays: Array.from({length: 16}, (_, i) => i + 1) // All 16 relays
    },
    'morning': {
        name: 'Morning Routine',
        icon: 'fas fa-sun',
        description: 'Morning automation',
        relays: [1, 4, 7, 10, 13] // Specific pattern
    }
};

// ====== UI HELPER FUNCTIONS ======
function logActivity(message, type = 'info') {
    const logContainer = document.getElementById('activityLog');
    const time = new Date().toLocaleTimeString();
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    let icon = 'ℹ️';
    let color = 'var(--primary)';
    
    switch(type) {
        case 'success': icon = '✅'; color = 'var(--success)'; break;
        case 'error': icon = '❌'; color = 'var(--destructive)'; break;
        case 'warning': icon = '⚠️'; color = 'var(--warning)'; break;
        case 'command': icon = '📤'; color = 'var(--primary)'; break;
        case 'response': icon = '📥'; color = 'var(--success)'; break;
    }
    
    logItem.innerHTML = `
        <span class="log-time" style="color: var(--muted-foreground)">${time}</span>
        <span class="log-message" style="color: ${color}">
            ${icon} ${message}
        </span>
    `;
    
    logContainer.prepend(logItem);
    
    // Keep log manageable
    const items = logContainer.querySelectorAll('.log-item');
    if (items.length > 50) {
        items[items.length - 1].remove();
    }
    
    // Scroll to top
    logContainer.scrollTop = 0;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function updateStatusUI() {
    const connected = client && client.connected;
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const modalMqttStatus = document.getElementById('modalMqttStatus');
    
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected';
        if (modalMqttStatus) modalMqttStatus.textContent = 'Connected';
        
        // Update connection details
        const details = document.getElementById('connectionDetails');
        if (details) details.textContent = `Connected to ${deviceId}`;
    } else {
        statusDot.className = 'status-dot';
        statusText.textContent = 'Disconnected';
        if (modalMqttStatus) modalMqttStatus.textContent = 'Disconnected';
    }
}

function updateStats() {
    const onCount = relayStates.filter(state => state).length;
    const offCount = 16 - onCount;
    
    // Update dashboard stats
    document.getElementById('statOn').textContent = `${onCount} ON`;
    document.getElementById('statOff').textContent = `${offCount} OFF`;
    document.getElementById('deviceStats').textContent = `16 Relays • ${onCount} ON`;
    document.getElementById('controlsStatOn').textContent = `${onCount} ON`;
    document.getElementById('controlsStatOff').textContent = `${offCount} OFF`;
    
    // Update uptime
    if (connectionStartTime) {
        const uptime = Math.floor((Date.now() - connectionStartTime) / 1000);
        const hours = Math.floor(uptime / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0');
        const seconds = (uptime % 60).toString().padStart(2, '0');
        document.getElementById('uptime').textContent = `${hours}:${minutes}:${seconds}`;
        document.getElementById('systemUptime').textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    // Update message count
    document.getElementById('messageCount').textContent = messageCount;
}

function updateRelayUI(relayNumber, state) {
    // Update relay card
    const card = document.getElementById(`relayCard${relayNumber}`);
    if (card) {
        if (state) {
            card.classList.add('relay-on');
            card.classList.remove('relay-off');
            card.querySelector('.status-led').classList.add('on');
            card.querySelector('.status-text').textContent = 'ON';
        } else {
            card.classList.add('relay-off');
            card.classList.remove('relay-on');
            card.querySelector('.status-led').classList.remove('on');
            card.querySelector('.status-text').textContent = 'OFF';
        }
    }
    
    // Update advanced controls
    const advancedCard = document.getElementById(`advancedRelay${relayNumber}`);
    if (advancedCard) {
        const onBtn = advancedCard.querySelector('.btn-toggle.on');
        const offBtn = advancedCard.querySelector('.btn-toggle.off');
        if (onBtn && offBtn) {
            if (state) {
                onBtn.classList.add('active');
                offBtn.classList.remove('active');
            } else {
                offBtn.classList.add('active');
                onBtn.classList.remove('active');
            }
        }
    }
}

// ====== RELAY CONTROL FUNCTIONS ======
function toggleRelay(relayNumber, state) {
    if (!client || !client.connected) {
        showToast('MQTT not connected', 'error');
        return;
    }

    if (relayNumber < 1 || relayNumber > 16) {
        showToast('Invalid relay number (1-16 only)', 'error');
        return;
    }

    const payload = JSON.stringify({
        relay: relayNumber,
        state: state ? "ON" : "OFF"
    });

    const topic = `${BASE_TOPIC}/${deviceId}/relay/${relayNumber}/set`;
    client.publish(topic, payload, { qos: 1 });

    // Update UI optimistically
    relayStates[relayNumber - 1] = state;
    updateRelayUI(relayNumber, state);
    updateStats();
    
    logActivity(`Relay ${relayNumber}: ${state ? 'ON' : 'OFF'}`, 'command');
    messageCount++;
}

function controlMultipleRelays(relayNumbers, state) {
    if (!client || !client.connected) {
        showToast('MQTT not connected', 'error');
        return;
    }

    const payload = JSON.stringify({
        relays: relayNumbers,
        state: state ? "ON" : "OFF"
    });

    const topic = `${BASE_TOPIC}/${deviceId}/command`;
    client.publish(topic, payload, { qos: 1 });

    // Update UI optimistically
    relayNumbers.forEach(num => {
        if (num >= 1 && num <= 16) {
            relayStates[num - 1] = state;
            updateRelayUI(num, state);
        }
    });
    updateStats();
    
    logActivity(`Relays ${relayNumbers.join(',')}: ${state ? 'ON' : 'OFF'}`, 'command');
    messageCount++;
}

function controlAllRelays(state) {
    if (!client || !client.connected) {
        showToast('MQTT not connected', 'error');
        return;
    }

    const payload = JSON.stringify({
        all: true,
        state: state ? "ON" : "OFF"
    });

    const topic = `${BASE_TOPIC}/${deviceId}/command`;
    client.publish(topic, payload, { qos: 1 });

    // Update all UI states
    for (let i = 1; i <= 16; i++) {
        relayStates[i - 1] = state;
        updateRelayUI(i, state);
    }
    updateStats();
    
    logActivity(`All relays: ${state ? 'ON' : 'OFF'}`, 'command');
    messageCount++;
}

function controlRelayRange(start, end, state) {
    if (!client || !client.connected) {
        showToast('MQTT not connected', 'error');
        return;
    }

    if (start < 1 || end > 16 || start > end) {
        showToast('Invalid range. Use 1-16 with start ≤ end', 'error');
        return;
    }

    const payload = JSON.stringify({
        start: start,
        end: end,
        state: state ? "ON" : "OFF"
    });

    const topic = `${BASE_TOPIC}/${deviceId}/command`;
    client.publish(topic, payload, { qos: 1 });

    // Update UI optimistically
    for (let i = start; i <= end; i++) {
        relayStates[i - 1] = state;
        updateRelayUI(i, state);
    }
    updateStats();
    
    logActivity(`Relays ${start}-${end}: ${state ? 'ON' : 'OFF'}`, 'command');
    messageCount++;
}

function restoreFromEEPROM() {
    if (!client || !client.connected) {
        showToast('MQTT not connected', 'error');
        return;
    }

    const payload = JSON.stringify({
        command: "restore"
    });

    const topic = `${BASE_TOPIC}/${deviceId}/command`;
    client.publish(topic, payload, { qos: 1 });

    logActivity('Restoring from EEPROM...', 'command');
    messageCount++;
}

function getStatus() {
    if (!client || !client.connected) {
        showToast('MQTT not connected', 'error');
        return;
    }

    const payload = JSON.stringify({
        command: "status"
    });

    const topic = `${BASE_TOPIC}/${deviceId}/command`;
    client.publish(topic, payload, { qos: 1 });

    logActivity('Requesting status update...', 'command');
    messageCount++;
}

function applyPreset(presetId) {
    const preset = PRESETS[presetId];
    if (!preset) return;
    
    // First turn all relays OFF
    controlAllRelays(false);
    
    // Then turn on the preset relays after a short delay
    setTimeout(() => {
        controlMultipleRelays(preset.relays, true);
        showToast(`${preset.name} activated`, 'success');
        logActivity(`Preset activated: ${preset.name}`, 'success');
    }, 500);
}

// ====== UI GENERATION FUNCTIONS ======
function createRelayCards() {
    const grid = document.getElementById('relaysGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 1; i <= 16; i++) {
        const state = relayStates[i - 1];
        const card = document.createElement('div');
        card.className = `relay-card ${state ? 'relay-on' : 'relay-off'}`;
        card.id = `relayCard${i}`;
        
        card.innerHTML = `
            <div class="relay-header">
                <div class="relay-name">
                    <div class="relay-number">${i}</div>
                    <div class="relay-title">
                        <i class="fas fa-plug"></i>
                        <span>Relay ${i}</span>
                    </div>
                </div>
                <div class="relay-status">
                    <div class="status-led ${state ? 'on' : ''}"></div>
                    <span class="status-text">${state ? 'ON' : 'OFF'}</span>
                </div>
            </div>
            <div class="relay-controls">
                <button class="btn-relay on" onclick="toggleRelay(${i}, true)">
                    <i class="fas fa-play"></i> ON
                </button>
                <button class="btn-relay off" onclick="toggleRelay(${i}, false)">
                    <i class="fas fa-stop"></i> OFF
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    }
}

function createAdvancedControls() {
    const grid = document.getElementById('advancedControlsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 1; i <= 16; i++) {
        const state = relayStates[i - 1];
        const card = document.createElement('div');
        card.className = 'advanced-relay-card';
        card.id = `advancedRelay${i}`;
        
        card.innerHTML = `
            <div class="advanced-relay-header">
                <div class="relay-id">${i}</div>
                <div class="relay-name">Relay ${i}</div>
            </div>
            <div class="advanced-controls">
                <button class="btn-toggle on ${state ? 'active' : ''}" onclick="toggleRelay(${i}, true)">
                    ON
                </button>
                <button class="btn-toggle off ${!state ? 'active' : ''}" onclick="toggleRelay(${i}, false)">
                    OFF
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    }
}

function createPresetButtons() {
    const grid = document.querySelector('.presets-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    Object.entries(PRESETS).forEach(([id, preset]) => {
        const button = document.createElement('button');
        button.className = 'preset-btn';
        button.innerHTML = `
            <i class="${preset.icon}"></i>
            <span>${preset.name}</span>
            <small>${preset.description}</small>
        `;
        button.onclick = () => applyPreset(id);
        
        grid.appendChild(button);
    });
}

// ====== MQTT FUNCTIONS ======
function connectMQTT() {
    if (client && client.connected) {
        showToast('Already connected', 'info');
        return;
    }

    const clientId = `pwa_${deviceId}_${Math.random().toString(16).substr(2, 8)}`;
    const url = `wss://${HIVEMQ_HOST}:${HIVEMQ_PORT}/mqtt`;

    const options = {
        clientId: clientId,
        username: HIVEMQ_USERNAME,
        password: HIVEMQ_PASSWORD,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 10_000,
        keepalive: 60
    };

    logActivity('Connecting to HiveMQ Cloud...', 'info');
    
    try {
        client = mqtt.connect(url, options);

        client.on('connect', () => {
            logActivity('✅ Connected to HiveMQ Cloud', 'success');
            connectionStartTime = Date.now();
            isConnected = true;
            updateStatusUI();
            
            // Subscribe to status topics
            const statusTopic = `${BASE_TOPIC}/${deviceId}/status/#`;
            client.subscribe(statusTopic, { qos: 1 }, (err) => {
                if (!err) {
                    logActivity(`📡 Subscribed to: ${statusTopic}`, 'success');
                }
            });
            
            // Subscribe to command responses
            const commandTopic = `${BASE_TOPIC}/${deviceId}/command`;
            client.subscribe(commandTopic, { qos: 1 }, (err) => {
                if (!err) {
                    logActivity(`📡 Subscribed to: ${commandTopic}`, 'success');
                }
            });
            
            // Request initial status
            setTimeout(() => getStatus(), 1000);
        });

        client.on('message', (topic, payload) => {
            messageCount++;
            const message = payload.toString();
            
            logActivity(`📥 ${topic}: ${message}`, 'response');
            
            // Parse status messages
            if (topic.includes('/status/relay')) {
                const relayNum = parseInt(topic.split('/relay')[1]);
                if (!isNaN(relayNum) && relayNum >= 1 && relayNum <= 16) {
                    const state = message === "ON";
                    relayStates[relayNum - 1] = state;
                    updateRelayUI(relayNum, state);
                    updateStats();
                }
            }
            
            // Handle JSON commands
            try {
                const data = JSON.parse(message);
                if (data.command === 'restore_complete') {
                    showToast('Relay states restored from EEPROM', 'success');
                }
            } catch (e) {
                // Not JSON, ignore
            }
        });

        client.on('error', (err) => {
            logActivity(`❌ MQTT Error: ${err.message}`, 'error');
            isConnected = false;
            updateStatusUI();
        });

        client.on('reconnect', () => {
            logActivity('🔄 Reconnecting...', 'warning');
            isConnected = false;
            updateStatusUI();
        });

        client.on('close', () => {
            logActivity('🔌 Connection closed', 'warning');
            isConnected = false;
            updateStatusUI();
        });

    } catch (error) {
        logActivity(`❌ Connection failed: ${error.message}`, 'error');
        showToast('Connection failed', 'error');
    }
}

function disconnectMQTT() {
    if (client) {
        client.end();
        client = null;
        isConnected = false;
        updateStatusUI();
        logActivity('Disconnected from MQTT', 'info');
    }
}

function reconnectMQTT() {
    disconnectMQTT();
    setTimeout(connectMQTT, 1000);
}

// ====== EVENT HANDLERS ======
function setupEventListeners() {
    // Quick action buttons
    document.getElementById('btnAllOn')?.addEventListener('click', () => controlAllRelays(true));
    document.getElementById('btnAllOff')?.addEventListener('click', () => controlAllRelays(false));
    document.getElementById('btnRefresh')?.addEventListener('click', getStatus);
    
    // Range control buttons
    document.getElementById('btnRange1_8')?.addEventListener('click', () => controlRelayRange(1, 8, true));
    document.getElementById('btnRange9_16')?.addEventListener('click', () => controlRelayRange(9, 16, true));
    
    // Group buttons
    document.getElementById('btnGroupBedrooms')?.addEventListener('click', () => 
        controlMultipleRelays([1, 2, 3, 4], true));
    document.getElementById('btnGroupEssentials')?.addEventListener('click', () => 
        controlMultipleRelays([1, 5, 9, 13], true));
    
    // Modal buttons
    document.getElementById('modalAllOn')?.addEventListener('click', () => controlAllRelays(true));
    document.getElementById('modalAllOff')?.addEventListener('click', () => controlAllRelays(false));
    document.getElementById('modalRefresh')?.addEventListener('click', getStatus);
    document.getElementById('btnReconnect')?.addEventListener('click', reconnectMQTT);
    
    // Clear log button
    document.getElementById('btnClearLog')?.addEventListener('click', () => {
        document.getElementById('activityLog').innerHTML = '';
        logActivity('Log cleared', 'info');
    });
    
    // Settings buttons
    document.getElementById('btnSaveMQTT')?.addEventListener('click', function() {
        const server = document.getElementById('mqttServer').value;
        const username = document.getElementById('mqttUsername').value;
        const password = document.getElementById('mqttPassword').value;
        
        localStorage.setItem('mqttServer', server);
        localStorage.setItem('mqttUsername', username);
        localStorage.setItem('mqttPassword', password);
        
        showToast('MQTT settings saved. Reconnect to apply.', 'success');
    });
    
    // EEPROM restore button
    const btnRestoreEEPROM = document.getElementById('btnRestoreEEPROM');
    if (btnRestoreEEPROM) {
        btnRestoreEEPROM.addEventListener('click', restoreFromEEPROM);
    }
    
    // Create one if it doesn't exist in HTML
    if (!btnRestoreEEPROM) {
        const restoreBtn = document.createElement('button');
        restoreBtn.id = 'btnRestoreEEPROM';
        restoreBtn.className = 'btn-primary';
        restoreBtn.innerHTML = '<i class="fas fa-history"></i> Restore EEPROM';
        restoreBtn.onclick = restoreFromEEPROM;
        
        const bulkControls = document.querySelector('.bulk-controls');
        if (bulkControls) {
            bulkControls.appendChild(restoreBtn);
        }
    }
}

// ====== SCHEDULE FUNCTIONS ======
function openScheduleModal() {
    document.getElementById('scheduleModal').style.display = 'flex';
}

function closeScheduleModal() {
    document.getElementById('scheduleModal').style.display = 'none';
}

function saveSchedule() {
    const name = document.getElementById('scheduleName').value;
    const time = document.getElementById('scheduleTime').value;
    const preset = document.getElementById('schedulePreset').value;
    const enabled = document.getElementById('scheduleEnabled').checked;
    
    // Create schedule item
    const scheduleList = document.getElementById('scheduleList');
    const scheduleItem = document.createElement('div');
    scheduleItem.className = 'schedule-item';
    
    scheduleItem.innerHTML = `
        <div class="schedule-info">
            <div class="schedule-time">
                <i class="fas fa-clock"></i>
                <span>${time}</span>
            </div>
            <div class="schedule-action">${name} (${PRESETS[preset].name})</div>
            <div class="schedule-status ${enabled ? 'enabled' : 'disabled'}">
                ${enabled ? 'Enabled' : 'Disabled'}
            </div>
        </div>
        <div class="schedule-actions">
            <button class="btn-toggle" onclick="toggleSchedule(this)">Toggle</button>
            <button class="btn-toggle destructive" onclick="deleteSchedule(this)">Delete</button>
        </div>
    `;
    
    scheduleList.appendChild(scheduleItem);
    closeScheduleModal();
    showToast('Schedule saved', 'success');
}

function toggleSchedule(button) {
    const scheduleItem = button.closest('.schedule-item');
    const statusBadge = scheduleItem.querySelector('.schedule-status');
    
    if (statusBadge.classList.contains('enabled')) {
        statusBadge.classList.remove('enabled');
        statusBadge.classList.add('disabled');
        statusBadge.textContent = 'Disabled';
    } else {
        statusBadge.classList.remove('disabled');
        statusBadge.classList.add('enabled');
        statusBadge.textContent = 'Enabled';
    }
}

function deleteSchedule(button) {
    if (confirm('Delete this schedule?')) {
        button.closest('.schedule-item').remove();
        showToast('Schedule deleted', 'info');
    }
}

// ====== INITIALIZATION ======
function initializeApp() {
    // Load saved settings
    const savedServer = localStorage.getItem('mqttServer');
    const savedUser = localStorage.getItem('mqttUsername');
    const savedPass = localStorage.getItem('mqttPassword');
    
    if (savedServer) document.getElementById('mqttServer').value = savedServer;
    if (savedUser) document.getElementById('mqttUsername').value = savedUser;
    if (savedPass) document.getElementById('mqttPassword').value = savedPass;
    
    // Create UI elements
    createRelayCards();
    createAdvancedControls();
    createPresetButtons();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start connection
    setTimeout(connectMQTT, 1000);
    
    // Start stats update loop
    setInterval(updateStats, 1000);
    
    logActivity('Application initialized', 'success');
}

// ====== EXPORT FUNCTIONS TO WINDOW ======
window.sendCommand = function(command, data) {
    switch(command) {
        case 'ALL_ON': controlAllRelays(true); break;
        case 'ALL_OFF': controlAllRelays(false); break;
        case 'STATUS': getStatus(); break;
        case 'RESTORE': restoreFromEEPROM(); break;
    }
};

window.toggleRelay = toggleRelay;
window.controlAllRelays = controlAllRelays;
window.controlRelayRange = controlRelayRange;
window.restoreFromEEPROM = restoreFromEEPROM;
window.getStatus = getStatus;
window.reconnectMQTT = reconnectMQTT;
window.applyPreset = applyPreset;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.saveSchedule = saveSchedule;
window.toggleSchedule = toggleSchedule;
window.deleteSchedule = deleteSchedule;

// ====== START APPLICATION ======
document.addEventListener('DOMContentLoaded', initializeApp);
