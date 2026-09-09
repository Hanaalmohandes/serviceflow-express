const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const cert = path.resolve(process.cwd(), '../certs/localhost.pem');
const key = path.resolve(process.cwd(), '../certs/localhost-key.pem');
const command = process.platform === 'win32' ? 'vite.cmd' : 'vite';

if (!fs.existsSync(cert) || !fs.existsSync(key)) {
  console.error(
    'HTTPS certificate files are missing. Create certs/localhost.pem and certs/localhost-key.pem as described in the README.'
  );
  process.exit(1);
}

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
