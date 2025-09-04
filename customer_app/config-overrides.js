const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve = {
    ...config.resolve,
    fallback: {
      stream: require.resolve("stream-browserify"),
      crypto: require.resolve("crypto-browserify"),
      buffer: require.resolve("buffer/"),
      util: require.resolve("util/"),
      assert: require.resolve("assert/"),
      process: require.resolve("process/browser.js"),
    }
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser.js",
    }),
  ];

  return config;
};