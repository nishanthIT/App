// Quick script to get your WiFi IP address
const os = require('os');

function getWiFiIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prefer WiFi/Wireless adapters
        if (name.toLowerCase().includes('wi-fi') || 
            name.toLowerCase().includes('wireless') ||
            name.toLowerCase().includes('wlan')) {
          return iface.address;
        }
      }
    }
  }
  
  // Fallback: return first non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'IP not found';
}

const ip = getWiFiIP();
console.log('\n🌐 Your WiFi IP Address:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   ${ip}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📝 Update config/api.ts:');
console.log(`   WIFI: 'http://${ip}:3000'\n`);
