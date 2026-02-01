/*************************************************
 * Atomic Smart DB - PWA MQTT Client
 * HiveMQ Cloud (FREE Serverless)
 * 16-Channel Relay Control with EEPROM
 *************************************************/

// ====== CONFIG (EDIT ONLY THESE ONCE) ======
const HIVEMQ_HOST = "0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud";
const HIVEMQ_PORT = 8884; // WebSocket Secure
const HIVEMQ_USERNAME = "SMARTHOMEDB";
const HIVEMQ_PASSWORD = "Aa1234567@";

// Base topic namespace
const BASE_TOPIC = "atomic";

// ===========================================

let client = null;
let deviceId = null;
let relayStates = Array(16).fill(false); // Track 16 relay states

// UI log helper
function log(msg) {
  const el = document.getElementById("log");
  el.textContent += new Date().toLocaleTimeString() + " - " + msg + "\n";
  el.scrollTop = el.scrollHeight;
}

// Save Device ID (called from UI)
function saveDeviceId() {
  const input = document.getElementById("deviceIdInput").value.trim();

  if (!input) {
    alert("Device ID cannot be empty");
    return;
  }

  localStorage.setItem("atomic_device_id", input);
  deviceId = input;

  log("✅ Device ID saved: " + deviceId);
  document.getElementById("deviceIdLabel").textContent = "Device: " + deviceId;

  // Create relay controls UI
  createRelayControls();
  
  if (!client || !client.connected) {
    connectMQTT();
  }
}

// Load Device ID on startup
function loadDeviceId() {
  const stored = localStorage.getItem("atomic_device_id");
  if (stored) {
    deviceId = stored;
    document.getElementById("deviceIdInput").value = stored;
    document.getElementById("deviceIdLabel").textContent = "Device: " + stored;
    log("📦 Loaded Device ID: " + stored);
    createRelayControls();
    connectMQTT();
  }
}

// Build per-device topic safely
function topic(path) {
  if (!deviceId) {
    throw new Error("Device ID not set");
  }
  return `${BASE_TOPIC}/${deviceId}/${path}`;
}

// Create UI for 16 relays
function createRelayControls() {
  const container = document.getElementById("relayContainer");
  if (!container) return;
  
  container.innerHTML = '';
  
  // Create 4 rows of 4 relays each
  for (let row = 0; row < 4; row++) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "relay-row";
    
    for (let col = 0; col < 4; col++) {
      const relayNum = row * 4 + col + 1;
      const relayDiv = document.createElement("div");
      relayDiv.className = "relay-control";
      relayDiv.id = `relay${relayNum}`;
      
      relayDiv.innerHTML = `
        <div class="relay-header">
          <span class="relay-label">Relay ${relayNum}</span>
          <span class="relay-status" id="status${relayNum}">OFF</span>
        </div>
        <div class="relay-buttons">
          <button onclick="controlRelay(${relayNum}, true)" class="btn-on">ON</button>
          <button onclick="controlRelay(${relayNum}, false)" class="btn-off">OFF</button>
        </div>
      `;
      
      rowDiv.appendChild(relayDiv);
    }
    
    container.appendChild(rowDiv);
  }
  
  // Add bulk control buttons
  const bulkDiv = document.createElement("div");
  bulkDiv.className = "bulk-controls";
  bulkDiv.innerHTML = `
    <h3>Bulk Controls</h3>
    <div class="bulk-buttons">
      <button onclick="controlAll(true)" class="btn-all-on">All ON</button>
      <button onclick="controlAll(false)" class="btn-all-off">All OFF</button>
      <button onclick="restoreFromEEPROM()" class="btn-restore">Restore EEPROM</button>
      <button onclick="getStatus()" class="btn-status">Get Status</button>
    </div>
    <div class="range-control">
      <h4>Control Range:</h4>
      <input type="number" id="rangeStart" min="1" max="16" value="1" placeholder="Start">
      <input type="number" id="rangeEnd" min="1" max="16" value="16" placeholder="End">
      <button onclick="controlRange(true)" class="btn-range-on">Range ON</button>
      <button onclick="controlRange(false)" class="btn-range-off">Range OFF</button>
    </div>
  `;
  
  container.appendChild(bulkDiv);
}

// Connect to HiveMQ
function connectMQTT() {
  if (!deviceId) {
    log("⚠️ Cannot connect: Device ID missing");
    return;
  }

  const clientId = "pwa_" + Math.random().toString(16).substr(2, 8);

  const options = {
    clientId,
    username: HIVEMQ_USERNAME,
    password: HIVEMQ_PASSWORD,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10_000,
  };

  const url = `wss://${HIVEMQ_HOST}:${HIVEMQ_PORT}/mqtt`;

  log("🔌 Connecting to HiveMQ...");
  client = mqtt.connect(url, options);

  client.on("connect", () => {
    log("✅ MQTT connected");

    // Subscribe to status topics
    client.subscribe(topic("status/#"), (err) => {
      if (!err) {
        log("📡 Subscribed to status topics");
        // Request initial status
        getStatus();
      }
    });
    
    // Subscribe to command responses
    client.subscribe(topic("command"), (err) => {
      if (!err) {
        log("📡 Subscribed to command topics");
      }
    });
  });

  client.on("message", (topic, payload) => {
    const msg = payload.toString();
    log(`📥 ${topic} → ${msg}`);
    
    // Parse status messages
    if (topic.includes("/status/relay")) {
      const relayNum = parseInt(topic.split("/relay")[1]);
      if (!isNaN(relayNum) && relayNum >= 1 && relayNum <= 16) {
        const state = msg === "ON";
        relayStates[relayNum - 1] = state;
        updateRelayUI(relayNum, state);
      }
    }
  });

  client.on("error", (err) => {
    log("❌ MQTT Error: " + err.message);
  });

  client.on("reconnect", () => {
    log("🔄 Reconnecting...");
  });

  client.on("close", () => {
    log("🔌 Connection closed");
  });
}

// Control single relay
function controlRelay(relayNumber, state) {
  if (!client || !client.connected) {
    alert("MQTT not connected");
    return;
  }

  if (relayNumber < 1 || relayNumber > 16) {
    alert("Invalid relay number (1-16 only)");
    return;
  }

  const payload = JSON.stringify({
    relay: relayNumber,
    state: state ? "ON" : "OFF"
  });

  const t = topic(`relay/${relayNumber}/set`);
  client.publish(t, payload, { qos: 1 });

  log(`📤 ${t} → ${payload}`);
  
  // Update UI optimistically
  relayStates[relayNumber - 1] = state;
  updateRelayUI(relayNumber, state);
}

// Control multiple relays
function controlRelays(relayNumbers, state) {
  if (!client || !client.connected) {
    alert("MQTT not connected");
    return;
  }

  const payload = JSON.stringify({
    relays: relayNumbers,
    state: state ? "ON" : "OFF"
  });

  const t = topic("command");
  client.publish(t, payload, { qos: 1 });

  log(`📤 ${t} → ${payload}`);
  
  // Update UI optimistically
  relayNumbers.forEach(num => {
    if (num >= 1 && num <= 16) {
      relayStates[num - 1] = state;
      updateRelayUI(num, state);
    }
  });
}

// Control all relays
function controlAll(state) {
  if (!client || !client.connected) {
    alert("MQTT not connected");
    return;
  }

  const payload = JSON.stringify({
    all: true,
    state: state ? "ON" : "OFF"
  });

  const t = topic("command");
  client.publish(t, payload, { qos: 1 });

  log(`📤 ${t} → All relays ${state ? "ON" : "OFF"}`);
  
  // Update all UI states optimistically
  for (let i = 1; i <= 16; i++) {
    relayStates[i - 1] = state;
    updateRelayUI(i, state);
  }
}

// Control range of relays
function controlRange(state) {
  if (!client || !client.connected) {
    alert("MQTT not connected");
    return;
  }

  const start = parseInt(document.getElementById("rangeStart").value) || 1;
  const end = parseInt(document.getElementById("rangeEnd").value) || 16;
  
  if (start < 1 || end > 16 || start > end) {
    alert("Invalid range. Use 1-16 with start ≤ end");
    return;
  }

  const payload = JSON.stringify({
    start: start,
    end: end,
    state: state ? "ON" : "OFF"
  });

  const t = topic("command");
  client.publish(t, payload, { qos: 1 });

  log(`📤 ${t} → Relays ${start}-${end} ${state ? "ON" : "OFF"}`);
  
  // Update UI optimistically
  for (let i = start; i <= end; i++) {
    relayStates[i - 1] = state;
    updateRelayUI(i, state);
  }
}

// Restore from EEPROM
function restoreFromEEPROM() {
  if (!client || !client.connected) {
    alert("MQTT not connected");
    return;
  }

  const payload = JSON.stringify({
    command: "restore"
  });

  const t = topic("command");
  client.publish(t, payload, { qos: 1 });

  log(`📤 ${t} → Restore from EEPROM`);
}

// Get all relay statuses
function getStatus() {
  if (!client || !client.connected) {
    alert("MQTT not connected");
    return;
  }

  const payload = JSON.stringify({
    command: "status"
  });

  const t = topic("command");
  client.publish(t, payload, { qos: 1 });

  log(`📤 ${t} → Request status update`);
}

// Update relay UI
function updateRelayUI(relayNumber, state) {
  const statusElement = document.getElementById(`status${relayNumber}`);
  const relayElement = document.getElementById(`relay${relayNumber}`);
  
  if (statusElement) {
    statusElement.textContent = state ? "ON" : "OFF";
    statusElement.className = `relay-status ${state ? 'status-on' : 'status-off'}`;
  }
  
  if (relayElement) {
    relayElement.className = `relay-control ${state ? 'relay-on' : 'relay-off'}`;
  }
}

// Auto-load Device ID on page load
window.addEventListener("load", loadDeviceId);
