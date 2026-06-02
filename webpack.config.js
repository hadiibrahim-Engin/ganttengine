const path               = require('path');
const HtmlWebpackPlugin  = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin         = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    entry: './src/main.jsx',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      assetModuleFilename: 'assets/[hash:8][ext]',
      clean: true,
      publicPath: './',
    },

    resolve: { extensions: ['.js', '.jsx'] },

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: '> 0.5%, last 2 versions, not dead', modules: false }],
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
              cacheDirectory: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: isProd
            ? [MiniCssExtractPlugin.loader, 'css-loader']
            : ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|ico|woff2?|ttf|eot)$/,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({ template: './index.html' }),
      new CopyPlugin({ patterns: [{ from: 'public', to: '.', noErrorOnMissing: true }] }),
      ...(isProd ? [new MiniCssExtractPlugin({ filename: 'assets/[name].[contenthash:8].css' })] : []),
    ],

    devServer: {
      port: 5173,
      hot: true,
      historyApiFallback: true,
      static: { directory: path.join(__dirname, 'public') },
      open: false,
      client: { overlay: true },
    },

    devtool: isProd ? false : 'eval-cheap-module-source-map',
    optimization: { splitChunks: isProd ? { chunks: 'all', name: 'vendor' } : false },
    performance: { hints: false },
    stats: isProd ? 'normal' : 'errors-warnings',
  };
};
