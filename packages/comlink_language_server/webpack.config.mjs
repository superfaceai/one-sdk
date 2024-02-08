// esbuild src/server.ts --bundle --target=node18 --platform=node --format=esm --tree-shaking=true --loader:.wasm=file --outdir=dist
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export default {
  mode: 'production',
  entry: './src/server.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  target: 'node18',
  output: {
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist/'),
    filename: 'server.js',
  }
}

// 