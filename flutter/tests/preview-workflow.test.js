const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');
const workflow = yaml.load(fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/record-shop-preview.yml'), 'utf8'));
const steps = workflow.jobs['mac-preview'].steps;
const prepare = steps.find(s => s.name === 'Prepare preview signing keychain');
const build = steps.find(s => s.name === 'Build private Mac preview');
const cleanup = steps.find(s => s.name === 'Remove preview signing keychain');
function harness(t) {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-workflow-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
 const stub = path.join(dir, 'security.cjs');
 fs.writeFileSync(stub, `const fs=require('node:fs'),path=require('node:path');const args=process.argv.slice(2),dir=process.env.RUNNER_TEMP;fs.appendFileSync(path.join(dir,'calls'),JSON.stringify(args)+'\\n');const passwordFile=path.join(dir,'password');if(args[0]==='create-keychain'){fs.writeFileSync(passwordFile,args[args.indexOf('-p')+1]);fs.writeFileSync(args.at(-1),'dummy');}if(args[0]==='set-key-partition-list' && args[args.indexOf('-k')+1]!==fs.readFileSync(passwordFile,'utf8'))process.exit(1);if(args[0]==='delete-keychain')fs.unlinkSync(args.at(-1));`);
 fs.writeFileSync(path.join(dir, 'security'), '#!/bin/sh\nexec "' + process.execPath + '" "' + stub + '" "$@"\n', { mode: 0o700 });
 const envFile = path.join(dir, 'github-env'); fs.writeFileSync(envFile, '');
 const env = { ...process.env, PATH: dir + path.delimiter + process.env.PATH, RUNNER_TEMP: dir, GITHUB_ENV: envFile, CSC_LINK: Buffer.from('fake certificate fixture').toString('base64'), CSC_KEY_PASSWORD: 'fixture-certificate-password', APPLE_ID: 'fixture', APPLE_APP_SPECIFIC_PASSWORD: 'fixture', APPLE_TEAM_ID: 'fixture' };
 const run = script => spawnSync('/bin/bash', ['-e', '-c', script], { env, encoding: 'utf8' });
 return { dir, env, envFile, run };
}
test('preview signing uses distinct keychain/certificate passwords and bypasses automatic import', t => {
 const h = harness(t); const result = h.run(prepare.run); assert.equal(result.status, 0, 'Signing setup shell failed.');
 const calls = fs.readFileSync(path.join(h.dir, 'calls'), 'utf8').trim().split('\n').map(JSON.parse);
 const created = calls.find(c => c[0] === 'create-keychain'); const imported = calls.find(c => c[0] === 'import'); const partition = calls.find(c => c[0] === 'set-key-partition-list');
 assert.equal(imported[imported.indexOf('-P') + 1], h.env.CSC_KEY_PASSWORD);
 assert.equal(partition[partition.indexOf('-k') + 1], created[created.indexOf('-p') + 1]);
 assert.notEqual(partition[partition.indexOf('-k') + 1], h.env.CSC_KEY_PASSWORD);
 assert.ok(fs.readFileSync(h.envFile, 'utf8').includes('CSC_KEYCHAIN=')); assert.ok(fs.readFileSync(h.envFile, 'utf8').includes('WF_PREVIEW_SIGNED=yes'));
 assert.equal(Object.hasOwn(build.env, 'CSC_LINK'), false);
 assert.equal(fs.existsSync(path.join(h.dir, 'record-shop-preview.p12')), false);
 assert.equal(h.run(cleanup.run).status, 0); assert.equal(fs.existsSync(path.join(h.dir, 'record-shop-preview.keychain-db')), false);
});
test('missing signing setup selects unsigned preview; workflow cannot publish a release', t => {
 const h = harness(t); h.env.CSC_LINK = ''; assert.equal(h.run(prepare.run).status, 0);
 assert.equal(fs.existsSync(path.join(h.dir, 'calls')), false); assert.ok(fs.readFileSync(h.envFile,'utf8').includes('WF_PREVIEW_SIGNED=no'));
 assert.equal(workflow.permissions.contents, 'read'); assert.deepEqual(workflow.on.push.branches, ['codex/record-shop-v1']);
 assert.ok(build.run.includes('--publish never')); assert.equal(JSON.stringify(workflow).includes('gh release'), false);
 for (const s of steps.filter(s => s.run)) assert.equal(spawnSync('/bin/bash', ['-n'], { input: s.run }).status, 0);
 assert.equal(cleanup.if, 'always()');
});
