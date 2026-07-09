import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(root, '..', 'assets-src')
const out = path.join(root, '..', 'public', 'icons')

mkdirSync(out, { recursive: true })

const jobs = [
  { input: 'icon.svg', output: 'icon-192.png', size: 192 },
  { input: 'icon.svg', output: 'icon-512.png', size: 512 },
  { input: 'icon-maskable.svg', output: 'icon-maskable-512.png', size: 512 },
  { input: 'icon.svg', output: 'apple-touch-icon.png', size: 180 },
]

for (const job of jobs) {
  await sharp(path.join(src, job.input))
    .resize(job.size, job.size)
    .png()
    .toFile(path.join(out, job.output))
  console.log(`gerado ${job.output}`)
}
