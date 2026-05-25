import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist');

const CLOUDFLARE_MAX_FILE_BYTES = 25 * 1024 * 1024;

const COPY_DIRS = ['css', 'js', 'images', 'videos', 'assets'];

const COPY_FILES = ['index.html'];

const MODEL_FILES = [
  'models/3d/domyos_dumbbell.pages.glb',
  'models/3d/Woman-Models/athlete_in_black_and_red_activewear.glb',
  'models/3d/Woman-Models/stretching_in_a_gray_workout_set.glb',
  'models/3d/Woman-Models/stretching_in_lilac_workout_set.glb',
  'models/3d/Woman-Models/stretching_pose_in_black_workout_set.pages.glb',
];

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyPath(relPath) {
  const src = path.join(root, relPath);
  const dest = path.join(outDir, relPath);

  if (!fs.existsSync(src)) {
    throw new Error(`[build] Arquivo ou pasta ausente: ${relPath}`);
  }

  const size = fs.statSync(src).size;
  if (size > CLOUDFLARE_MAX_FILE_BYTES) {
    throw new Error(
      `[build] ${relPath} tem ${(size / 1024 / 1024).toFixed(1)} MiB (limite Cloudflare: 25 MiB). ` +
        'Rode npm run compress:models e use as versões .pages.glb.'
    );
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

rmDir(outDir);
fs.mkdirSync(outDir, { recursive: true });

COPY_FILES.forEach(copyPath);
COPY_DIRS.forEach(copyPath);
MODEL_FILES.forEach(copyPath);

console.log(`[build] Site gerado em ${outDir}`);
