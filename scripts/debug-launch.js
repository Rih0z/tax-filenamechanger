const { spawn } = require('child_process');
const path = require('path');

const exePath = path.join(__dirname, '..', 'release', 'gui-app-fixed', '税務書類リネーマー.exe');

console.log('Launching:', exePath);

const child = spawn(exePath, [], {
  stdio: 'inherit',
  cwd: path.dirname(exePath)
});

child.on('error', (error) => {
  console.error('Launch error:', error);
});

child.on('exit', (code, signal) => {
  console.log(`Process exited with code: ${code}, signal: ${signal}`);
});

console.log('Process launched with PID:', child.pid);

// 10秒後にステータス確認
setTimeout(() => {
  console.log('10秒経過 - プロセス状況確認');
  console.log('PID still running:', child.pid);
  console.log('Process killed:', child.killed);
  console.log('Exit code:', child.exitCode);
}, 10000);