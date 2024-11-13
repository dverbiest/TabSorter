import { fileURLToPath } from 'url';
import { dirname, resolve as _resolve } from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  entry: {
    background: './src/background.ts',
    main: './src/main.ts'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    filename: '[name].js', // Dynamic filename pattern
    path: _resolve(__dirname, 'dist')
  },
  mode: 'none',
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src', globOptions: { ignore: ['**/*.ts'] } }
      ]
    })
  ]
};
