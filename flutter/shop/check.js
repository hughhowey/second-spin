const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
for (const file of ['main.js', 'preload.js', 'shop/service.js', 'shop/dev.js', 'renderer/shop.js']) {
  const result = spawnSync(process.execPath, ['--check', path.resolve(__dirname, '..', file)], { stdio: 'inherit' });
  if (result.status) process.exit(result.status);
}
const files = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'))).build.files;
if (!files.includes('shop/service.js') || !files.includes('shop/catalog.json') || files.some(f => /env|dev\.js/.test(f))) throw new Error('Unsafe or incomplete packaged file list.');
console.log('Local source build checked. No distributable created.');
