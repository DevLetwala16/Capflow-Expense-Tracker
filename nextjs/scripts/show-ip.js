const os = require("os");
const fs = require("fs");
const path = require("path");

// In development mode: clean up workbox artifacts and provide a self-unregistering sw.js
// so that any browser requesting /sw.js receives valid JS (200 OK) instead of a 404 HTML error page.
try {
  const publicDir = path.resolve(__dirname, "..", "public");
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    for (const f of files) {
      if (f.startsWith("workbox-") || f.endsWith(".sw.js.map") || f.startsWith("worker-")) {
        fs.unlinkSync(path.join(publicDir, f));
      }
    }
    const devSW = `// CapFlow Development Mode Service Worker\n` +
      `self.addEventListener('install', () => self.skipWaiting());\n` +
      `self.addEventListener('activate', (event) => {\n` +
      `  event.waitUntil(self.registration.unregister());\n` +
      `});\n`;
    fs.writeFileSync(path.join(publicDir, "sw.js"), devSW, "utf8");
  }
} catch (_) {}

const nets = os.networkInterfaces();
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === "IPv4" && !net.internal) {
      console.log(`\n\x1b[36m📱 Mobile / Network URL for your Phone:\x1b[0m \x1b[1m\x1b[32mhttp://${net.address}:3000\x1b[0m\n`);
      return;
    }
  }
}
