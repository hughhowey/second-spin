// Development launcher: read only an explicitly selected external file.
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { spawn } = require('node:child_process');
const args = process.argv.slice(2), i = args.indexOf('--env');
if (i >= 0) {
  const target = fs.realpathSync(args[i + 1]);
  const repo = fs.realpathSync(path.resolve(__dirname, '../..'));
  if (target === repo || target.startsWith(repo + path.sep)) throw new Error('Choose the existing private env file outside the repository.');
  const values = parseEnv(fs.readFileSync(target, 'utf8'));
  for (const k of ['OPENAI_API_KEY', 'OPENAI_MODEL']) if (values[k] && !process.env[k]) process.env[k] = values[k];
}
process.env.WF_DEV_DATA ||= path.resolve(__dirname, '../../../work/record-shop-preview-data');
const appIndex = args.indexOf('--app');
let executable;
if (appIndex >= 0) {
  const selected = fs.realpathSync(args[appIndex + 1]);
  executable = fs.statSync(selected).isDirectory() && selected.endsWith('.app') ? path.join(selected, 'Contents', 'MacOS', 'Wow and Flutter') : selected;
  fs.accessSync(executable, fs.constants.X_OK);
} else executable = require('electron');
const launchArgs = appIndex >= 0 ? [] : [path.resolve(__dirname, '..')];
const child = spawn(executable, launchArgs, { stdio: 'inherit', env: process.env });
child.on('error', () => { console.error('The local Electron preview could not start.'); process.exitCode = 1; });
child.on('exit', (code, signal) => { if (signal) console.error('The local Electron runtime stopped (' + signal + ').'); process.exit(code ?? 1); });
