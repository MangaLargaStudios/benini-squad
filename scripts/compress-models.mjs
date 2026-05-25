import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  {
    input: 'models/3d/domyos_dumbbell.glb',
    output: 'models/3d/domyos_dumbbell.pages.glb',
  },
  {
    input: 'models/3d/Woman-Models/stretching_pose_in_black_workout_set.glb',
    output: 'models/3d/Woman-Models/stretching_pose_in_black_workout_set.pages.glb',
  },
];

for (const { input, output } of TARGETS) {
  const inputPath = path.join(root, input);
  const outputPath = path.join(root, output);

  if (!fs.existsSync(inputPath)) {
    console.warn(`[compress] Ignorado (ausente): ${input}`);
    continue;
  }

  console.log(`[compress] ${input} → ${output}`);
  execSync(
    `npx --yes @gltf-transform/cli optimize "${inputPath}" "${outputPath}" --compress draco`,
    { stdio: 'inherit', cwd: root }
  );

  const sizeMb = fs.statSync(outputPath).size / 1024 / 1024;
  console.log(`[compress] ${output}: ${sizeMb.toFixed(2)} MiB`);
}
