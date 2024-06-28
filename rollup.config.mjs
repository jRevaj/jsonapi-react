/* eslint-disable import/no-anonymous-default-export */
import fs from 'fs'
import path from 'path'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import external from 'rollup-plugin-peer-deps-external'
import resolve from '@rollup/plugin-node-resolve'
import size from 'rollup-plugin-size'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'

const pkg = JSON.parse(
  fs.readFileSync(path.resolve('./package.json'), { encoding: 'utf8' })
)

export default [
  {
    input: 'src/index.js',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      external({
        includeDependencies: true,
      }),
      resolve(),
      babel({
        babelHelpers: 'bundled',
      }),
      commonjs(),
      size({
        publish: true,
        exclude: pkg.module,
        filename: 'sizes-cjs.json',
        writeFile: false,
      }),
      sizeSnapshot(),
    ],
  },
  {
    input: 'src/index.js',
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      external({
        includeDependencies: true,
      }),
      babel({
        babelHelpers: 'bundled',
      }),
      size({
        publish: true,
        exclude: pkg.module,
        filename: 'sizes-es.json',
        writeFile: false,
      }),
      sizeSnapshot(),
    ],
  },
]
