import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const mode = process.argv[2] || 'dev';
const passthrough = process.argv.slice(3);

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

function resolveNextBin() {
  const directProjectInstall = join(projectDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (existsSync(directProjectInstall)) {
    return directProjectInstall;
  }

  const parentInstall = join(projectDir, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
  if (existsSync(parentInstall)) {
    return parentInstall;
  }

  const workspaceHoistedInstall = join(
    projectDir,
    '..',
    '..',
    'node_modules',
    'next',
    'dist',
    'bin',
    'next'
  );
  if (existsSync(workspaceHoistedInstall)) {
    return workspaceHoistedInstall;
  }

  try {
    return require.resolve('next/dist/bin/next', { paths: [projectDir, process.cwd()] });
  } catch {
    return null;
  }
}

const nextBin = resolveNextBin();

if (!nextBin) {
  console.error(
    'Could not find Next.js binary. Install dependencies for this project and retry (`npm install`).'
  );
  process.exit(1);
}

let args;
if (mode === 'dev') {
  const port = process.env.PORT || '3030';
  args = ['dev', '-p', port, projectDir, ...passthrough];
} else if (mode === 'build') {
  args = ['build', projectDir, ...passthrough];
} else if (mode === 'start') {
  const port = process.env.PORT || '3030';
  args = ['start', '-p', port, projectDir, ...passthrough];
} else {
  args = [mode, ...passthrough];
}

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: projectDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  console.error('Failed to run Next.js command:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
