/**
 * PM2 ile tek süreç, çökünce otomatik kalkar; SIGTERM’de graceful shutdown (Chromium kilidi).
 *
 * Kurulum: npm i -g pm2
 * Başlat:  cd server && pm2 start ecosystem.config.cjs
 * Otomatik OS açılışı: pm2 startup && pm2 save
 */
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "viona-node-api",
      script: path.join(__dirname, "src/index.js"),
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 100,
      min_uptime: "20s",
      exp_backoff_restart_delay: 2000,
      kill_timeout: 30_000,
      listen_timeout: 120_000,
      watch: false,
    },
  ],
};
