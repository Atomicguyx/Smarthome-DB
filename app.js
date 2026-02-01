/*************************************************
 * Atomic Smart DB - PWA MQTT Client
 * HiveMQ Cloud (FREE Serverless)
 * Per-Device Topics
 *************************************************/

// ====== CONFIG (EDIT ONLY THESE ONCE) ======
const HIVEMQ_HOST = "0562d333a1f84c1d8fa9a674afa05d6d.s1.eu.hivemq.cloud"; // <-- your cluster host
const HIVEMQ_PORT = 8884; // WebSocket Secure
const HIVEMQ_USERNAME = "SMARTHOMEDB";
const HIVEMQ_PASSWORD = "Aa1234567@";

// Base topic namespace
const BASE_TOPIC = "atomic";

// ===========================================

let client = null;
let deviceId = null;

// UI log helper
function log(msg) {
  const el = document.getElementById("log");
  el.textContent += msg + "\n";
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

  if (!client) {
    connectMQTT();
  }
}

// Load Device ID on startup
function loadDeviceId() {
  const stored = localStorage.getItem("atomic_device_id");
  if (stored) {
    deviceId = stored;
    document.getElementById("deviceIdInput").value = stored;
    log("📦 Loaded Device ID: " + deviceId);
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

    // Example: subscribe to device status
    client.subscribe(topic("status/#"), (err) => {
      if (!err) {
        log("📡 Subscribed to status topics");
      }
    });
  });

  client.on("message", (t, payload) => {
    log(`📥 ${t} → ${payload.toString()}`);
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

// Relay control (ONLY ONE LINE CHANGES PER DEVICE)
function toggleRelay(relayNumber, state) {
  if (!client || !client.connected) {
    alert("MQTT not connected");
    return;
  }

  const payload = JSON.stringify({
    relay: relayNumber,
    state: state ? "ON" : "OFF",
  });

  const t = topic(`relay/${relayNumber}/set`);
  client.publish(t, payload, { qos: 1 });

  log(`📤 ${t} → ${payload}`);
}

// Auto-load Device ID on page load
window.addEventListener("load", loadDeviceId);
