const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

async function buildRelease() {
  console.log('Building release version...');
  
  // Build configuration
  const config = {
    appId: 'com.rih0z.taxfilenamechanger',
    productName: '税務書類リネーマー',
    directories: {
      output: 'out',
      buildResources: 'build'
    },
    files: [
      'dist/**/*',
      '!dist/**/*.map',
      '!dist/**/*.test.*'
    ],
    win: {
      target: [{
        target: 'dir',
        arch: ['x64']
      }],
      icon: 'build/icon.ico'
    }
  };

  // Save temporary electron-builder config
  const configPath = path.join(__dirname, '..', 'electron-builder-temp.json');
  await fs.writeJson(configPath, config, { spaces: 2 });

  // Build the app
  return new Promise((resolve, reject) => {
    const buildCmd = `npx electron-builder --config ${configPath} --win --dir`;
    
    console.log('Running:', buildCmd);
    
    const buildProcess = exec(buildCmd, {
      cwd: path.join(__dirname, '..'),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    buildProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    buildProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    buildProcess.on('close', async (code) => {
      // Clean up temp config
      await fs.remove(configPath);
      
      if (code !== 0) {
        reject(new Error(`Build process exited with code ${code}`));
        return;
      }

      // Copy to release folder
      const source = path.join(__dirname, '..', 'out', 'win-unpacked');
      const dest = path.join(__dirname, '..', 'release', 'gui-app');
      
      if (await fs.pathExists(source)) {
        console.log('Copying build to release folder...');
        await fs.remove(dest);
        await fs.copy(source, dest);
        console.log('Build completed successfully!');
        resolve();
      } else {
        reject(new Error('Build output not found'));
      }
    });
  });
}

// Run the build
buildRelease().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});