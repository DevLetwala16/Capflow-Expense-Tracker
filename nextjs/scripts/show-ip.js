const os = require("os");
const nets = os.networkInterfaces();
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === "IPv4" && !net.internal) {
      console.log(`\n\x1b[36m📱 Mobile / Network URL for your Phone:\x1b[0m \x1b[1m\x1b[32mhttp://${net.address}:3000\x1b[0m\n`);
      return;
    }
  }
}
