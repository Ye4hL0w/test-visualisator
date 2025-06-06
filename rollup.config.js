import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import fs from 'fs'; // Ajout de l'import fs

// Lire package.json pour obtenir le nom et les dépendances
// import pkg from './package.json' assert { type: 'json' }; // Ancienne méthode
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8')); // Nouvelle méthode

const input = 'components/vis-graph.js';

export default [
  // Bundle ES module (pour les bundlers modernes)
  {
    input: input,
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs()
    ],
    // D3 sera bundlé avec le composant car il est dans les dependencies
    // Si D3 était une peerDependency, il faudrait l'ajouter à externals:
    // external: ['d3'] 
  },
  // Bundle CommonJS (pour Node et anciens bundlers)
  {
    input: input,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'auto', // ou 'named' si VisGraph est une exportation nommée
    },
    plugins: [
      resolve(),
      commonjs()
    ],
  },
  // Bundle UMD (pour navigateurs, via <script> tag)
  {
    input: input,
    output: {
      file: pkg.browser,
      format: 'umd',
      name: 'VisGraph', // Nom global pour le UMD
      sourcemap: true,
      globals: {
        // Si d3 était externe pour UMD:
        // 'd3': 'd3' 
      },
      exports: 'auto', // ou 'named'
    },
    plugins: [
      resolve(),
      commonjs(),
      terser() // Utilisation du plugin scopé
    ],
  }
]; 