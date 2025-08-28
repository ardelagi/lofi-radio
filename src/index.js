const MusicBot = require("./structures/MusicClient.js");
const client = new MusicBot();
module.exports = client;

// Load semua komponen
(async () => {
  try {
    client._loadPlayer();
    client._loadClientEvents();
    client._loadNodeEvents();
    client._loadPlayerEvents();
    await client._loadSlashCommands(); // pastikan await di sini sebelum login
    await loginBot(); // login dengan reconnect otomatis
  } catch (err) {
    console.error("Error saat init bot:", err);
  }
})();

// Fungsi login dengan retry otomatis
async function loginBot() {
  try {
    await client.connect();
    console.log(`[READY] ${client.user.username} online!`);
  } catch (err) {
    console.error("Login gagal, mencoba kembali dalam 10 detik...", err);
    setTimeout(loginBot, 10000);
  }
}

// Event global untuk error & promise
process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err, origin) => {
  console.error("Uncaught Exception:", err, origin);
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.error("Uncaught Exception Monitor:", err, origin);
});

process.on("multipleResolves", (type, promise, reason) => {
  console.warn("Multiple resolves detected:", type, reason);
});

// Keep-alive HTTP server (misal untuk Replit/Glitch)
require("node:http")
  .createServer((_, res) => res.end(`Developed`))
  .listen(8080, () => console.log("HTTP server running on port 5001"));