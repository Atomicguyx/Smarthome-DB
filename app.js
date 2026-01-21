// Configuration
const CONFIG = {
    server: 'wss://0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud:8884/mqtt',
    username: 'SMARTHOMEDB',
    password: 'Aa1234567@',
    topics: {
        control: 'smarthome/control',
        status: 'smarthome/status'
    }
};

// Relay Definitions
const RELAYS = [
    { id: 1, name: "Living Room", icon: "fa-couch", state: false },
    { id: 2, name: "Bedroom 1", icon: "fa-bed", state: false },
    { id: 3, name: "Bedroom 2", icon: "fa-bed", state: false },
    { id: 4, name: "Kitchen", icon: "fa-utensils", state: false },
    { id: 5, name: "Bathroom 1", icon: "fa-bath", state: false },
    { id: 6, name: "Bathroom 2", icon: "fa-bath", state: false },
    { id: 7, name: "Garage", icon: "fa-car", state: false },
    { id: 8, name: "Garden", icon: "fa-tree", state: false },
    { id: 9, name: "Porch Light", icon: "fa-lightbulb", state: false },
    { id: 10, name: "Fan 1", icon: "fa-fan", state: false },
    { id: 11, name: "Fan 2", icon: "fa-fan", state: false },
    { id: 12, name: "AC", icon: "fa-snowflake", state: false },
    { id: 13, name: "Heater", icon: "fa-fire", state: false },
    { id: 14, name: "Water Pump", icon: "fa-tint", state: false },
    { id: 15, name: "Gate", icon: "fa-door-closed", state: false },
    { id: 16, name: "Security", icon: "fa-shield-alt", state: false }
];

// Global Variables
let mqttClient = null;
let lastUpdateTime = null;

// DOM Elements
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    relaysGrid: document.getElementById('relaysGrid'),
    statOn: document.getElementById('statOn'),
    statOff: document.getElementById('statOff'),
    lastUpdate: document.getElementById('lastUpdate'),
    toast: document.getElementById('toast'),
    settingsModal: document.getElementById('settingsModal')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    connectMQTT();
    setupEventListeners();
    requestStatus();
});

// Initialize Dashboard
function initializeDashboard() {
    elements.relaysGrid.innerHTML = '';
    
    RELAYS.forEach(relay => {
        const relayCard = createRelayCard(relay);
        elements.relaysGrid.appendChild(relayCard);
    });
    
    updateStats();
}

// Create Relay Card HTML
function createRelayCard(relay) {
    const div = document.createElement('div');
    div.className = `relay-card ${relay.state ? 'active' : ''}`;
    div.id = `relay-${relay.id}`;
    div.innerHTML = `
        <div class="relay-header">
            <div class="relay-name">
                <div class="relay-number">${relay.id}</div>
                <div class="relay-title">
                    <i class="fas ${relay.icon}"></i>
                    ${relay.name}
                </div>
            </div>
            <div class="relay-status">
                <div class="led ${relay.state ? 'on' : ''}"></div>
                <span class="status-text">${relay.state ? 'ON' : 'OFF'}</span>
            </div>
        </div>
        <div class="relay-controls">
            <button class="btn-relay on" onclick="controlRelay(${relay.id}, true)">
                <i class="fas fa-power-off"></i>
                TURN ON
            </button>
            <button class="btn-relay off" onclick="controlRelay(${relay.id}, false)">
                <i class="fas fa-power-off"></i>
                TURN OFF
            </button>
        </div>
    `;
    return div;
}

// Update Statistics
function updateStats() {
    const onCount = RELAYS.filter(r => r.state).length;
    const offCount = RELAYS.length - onCount;
    
    elements.statOn.textContent = `${onCount} ON`;
    elements.statOff.textContent = `${offCount} OFF`;
}

// Control Relay
function controlRelay(id, state) {
    const command = `R${id}:${state ? '1' : '0'}`;
    publishMessage(CONFIG.topics.control, command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} ${getRelayName(id)}`);
}

// Control Multiple Relays
function controlRelays(start, end, state) {
    const command = `R${start}-${end}:${state ? '1' : '0'}`;
    publishMessage(CONFIG.topics.control, command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} Relays ${start}-${end}`);
}

// Control Group
function controlGroup(groupName, state) {
    const command = `GROUP_${groupName}:${state ? '1' : '0'}`;
    publishMessage(CONFIG.topics.control, command);
    showToast(`${state ? 'Turning ON' : 'Turning OFF'} ${groupName}`);
}

// Get Relay Name
function getRelayName(id) {
    const relay = RELAYS.find(r => r.id === id);
    return relay ? relay.name : `Relay ${id}`;
}

// MQTT Connection
function connectMQTT() {
    updateConnectionStatus('Connecting...', 'connecting');
    
    const options = {
        username: CONFIG.username,
        password: CONFIG.password,
        clientId: 'dashboard-' + Math.random().toString(16).slice(2),
        clean: true,
        reconnectPeriod: 3000
    };
    
    try {
        mqttClient = mqtt.connect(CONFIG.server, options);
        
        mqttClient.on('connect', () => {
            updateConnectionStatus('Connected', 'connected');
            showToast('Connected to HiveMQ');
            
            mqttClient.subscribe(CONFIG.topics.status, (err) => {
                if (!err) console.log('Subscribed to status');
            });
        });
        
        mqttClient.on('message', (topic, message) => {
            handleMessage(topic, message.toString());
        });
        
        mqttClient.on('error', (err) => {
            updateConnectionStatus('Error', 'error');
            showToast(`Error: ${err.message}`);
        });
        
    } catch (err) {
        updateConnectionStatus('Failed', 'error');
        showToast(`Connection failed: ${err.message}`);
    }
}

// Handle MQTT Messages
function handleMessage(topic, message) {
    lastUpdateTime = new Date();
    elements.lastUpdate.textContent = `Last: ${lastUpdateTime.toLocaleTimeString()}`;
    
    if (topic === CONFIG.topics.status) {
        // Single relay update: "1:1" or "1:0"
        if (message.includes(':')) {
            const [id, state] = message.split(':');
            const relayId = parseInt(id);
            const relayState = state === '1';
            
            if (relayId >= 1 && relayId <= 16) {
                updateRelayUI(relayId, relayState);
            }
        }
        // Multiple relays: "1:1,2:0,3:1,..."
        else if (message.includes(',')) {
            const updates = message.split(',');
            updates.forEach(update => {
                const [id, state] = update.split(':');
                const relayId = parseInt(id);
                const relayState = state === '1';
                
                if (relayId >= 1 && relayId <= 16) {
                    updateRelayUI(relayId, relayState);
                }
            });
        }
        // All relays: "ALL:1" or "ALL:0"
        else if (message.startsWith('ALL:')) {
            const state = message.endsWith(':1');
            RELAYS.forEach(relay => {
                updateRelayUI(relay.id, state);
            });
        }
    }
}

// Update Relay UI
function updateRelayUI(id, state) {
    const relay = RELAYS.find(r => r.id === id);
    if (relay) {
        relay.state = state;
        
        const card = document.getElementById(`relay-${id}`);
        if (card) {
            card.className = `relay-card ${state ? 'active' : ''}`;
            
            const led = card.querySelector('.led');
            const statusText = card.querySelector('.status-text');
            
            if (led) led.className = `led ${state ? 'on' : ''}`;
            if (statusText) statusText.textContent = state ? 'ON' : 'OFF';
        }
        
        updateStats();
    }
}

// Publish Message
function publishMessage(topic, message) {
    if (mqttClient && mqttClient.connected) {
        mqttClient.publish