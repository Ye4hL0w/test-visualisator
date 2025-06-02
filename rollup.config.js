import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { readFile } from 'node:fs/promises'; // Pour lire le package.json

// On va envelopper la configuration dans une fonction asynchrone
export default async function createConfig() {
  // new URL('./package.json', import.meta.url) crée un chemin absolu vers package.json
  const packageJsonString = await readFile(new URL('./package.json', import.meta.url), 'utf-8');
  const packageJson = JSON.parse(packageJsonString);

  return {
    input: 'components/VisGraph.js',
    output: [
      {
        file: packageJson.main,
        format: 'umd',
        name: 'VisGraph',
        sourcemap: true,
        globals: {
          d3: 'd3'
        }
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        globals: {
          d3: 'd3'
        }
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      terser()
    ],
    external: ['d3']
  };
} 