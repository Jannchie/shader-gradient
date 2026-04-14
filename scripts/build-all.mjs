import { spawnSync } from 'node:child_process'

const result = spawnSync('pnpm', ['-r', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
