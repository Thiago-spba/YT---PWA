import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(root, '..', 'assets-src')
const out = path.join(root, '..', 'public', 'icons')

mkdirSync(out, { recursive: true })

const jobs = [
  { input: 'icon.svg', output: 'icon-192.png', width: 192, height: 192 },
  { input: 'icon.svg', output: 'icon-512.png', width: 512, height: 512 },
  { input: 'icon-maskable.svg', output: 'icon-maskable-512.png', width: 512, height: 512 },
  { input: 'icon.svg', output: 'apple-touch-icon.png', width: 180, height: 180 },
  { input: 'og-image.svg', output: 'og-image.png', width: 1200, height: 630 },
]

for (const job of jobs) {
  await sharp(path.join(src, job.input))
    .resize(job.width, job.height)
    .png()
    .toFile(path.join(out, job.output))
  console.log(`gerado ${job.output}`)
}
