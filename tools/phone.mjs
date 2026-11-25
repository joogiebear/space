// Serve the static build to the local network so a real phone can open it: `npm run phone`.
// The phone must be on the same Wi-Fi. If it cannot connect, allow Node through the Windows firewall (private networks).
import { spawnSync, spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const PORT = 4173;
const build = spawnSync('npx', ['vite', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, VITE_STATIC_DATA: '1' } });
if (build.status !== 0) process.exit(build.status ?? 1);

const urls = Object.values(networkInterfaces())
  .flat()
  .filter(n => n && n.family === 'IPv4' && !n.internal)
  .map(n => `http://${n.address}:${PORT}/?diag#galaxies`);
console.log('\nOpen one of these on your phone (same Wi-Fi). "?diag" shows fps and device facts on screen:\n');
for (const u of urls) console.log('  ' + u);
console.log('\nCtrl+C to stop.\n');
spawn('npx', ['vite', 'preview', '--host', '--port', String(PORT), '--strictPort'], { stdio: 'inherit', shell: true });
