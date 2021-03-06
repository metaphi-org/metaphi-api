// webpack.config.js
const path = require("path");
const webpack = require('webpack')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: "production",
  entry: "./lib/index.js",
  output: {
    globalObject: 'this',
    publicPath: "/",
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    libraryTarget: 'commonjs'
  },
  plugins: [new CleanWebpackPlugin(), new MiniCssExtractPlugin(), new webpack.ProvidePlugin({
    "React": "react",
 })],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: path.resolve(__dirname, "lib"),
        exclude: /(node_modules|bower_components|build)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", ["@babel/preset-react", { "runtime": "automatic" }]],
          },
        },
      },
      {
        test: /\.s[ac]ss$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loader: "url-loader",
        options: {
          limit: 8000, // Convert images < 8kb to base64 strings
          name: "public/[name].[ext]",
        },
      },
      {
        type: 'javascript/auto',
        test: /\.json$/,
        include: /(lottie)/,
        loader: 'lottie-web-webpack-loader',
        options: {
          assets: {
            scale: 0.5 // proportional resizing multiplier
          }
        }
      }
    ],
  },
  externals: {
    react: {
      commonjs: 'react',
      commonjs2: 'react'
    },
    'react-dom': {
      commonjs: 'react-dom',
      commonjs2: 'react-dom'
    }
  },
  // resolve: {
  //   fallback: {
  //       assert: require.resolve('assert'),
  //       crypto: require.resolve('crypto-browserify'),
  //       http: require.resolve('stream-http'),
  //       https: require.resolve('https-browserify'),
  //       os: require.resolve('os-browserify/browser'),
  //       stream: require.resolve('stream-browserify'),
  //       url: require.resolve('url'),
  //     },
  // },
};
