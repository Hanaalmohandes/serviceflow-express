const { spawn } = require('node:child_process');
const path = require('node:path');

const cert = path.resolve(process.cwd(), '../certs/localhost.pem');
const command = process.platform === 'win32' ? 'vite.cmd' : 'vite';

const child = spawn(command, ['dev'], {
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, NODE_EXTRA_CA_CERTS: cert },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

child.on('error', (error) => {
  console.error('Could not start the HTTPS development server:', error);
  process.exit(1);
});
