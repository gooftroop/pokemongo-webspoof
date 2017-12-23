import path from 'path';
import webpack from 'webpack';

const root = process.cwd();

export default {
  entry: [
    'babel-polyfill',
    './src/index.js'
  ],
  target: 'electron',
  output: {
    path: path.join(root, 'dist'),
    filename: 'index.js',
    chunkFilename: '[name].js',
    library: 'PokemonGoWebspoof',
    libraryTarget: 'commonjs2'
  },
  devtool: 'source-map',
  externals: /config/,
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
      { test: /\.woff$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff&name=[path][name].[ext]' },
      { test: /\.woff2$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff2&name=[path][name].[ext]' },
      { test: /\.(eot|ttf|svg|gif|png)$/, loader: 'file-loader' },
      { test: /\.css$/, loader: 'style-loader!css-loader!postcss-loader' },
      { test: /\.json$/, loader: 'json-loader' }
    ]
  },
  plugins: [
    // https://github.com/postcss/postcss-loader/issues/99
    new webpack.LoaderOptionsPlugin({
      test: /\.css$/,
      options: {
        postcss: (webpackInstance) => {
          return [
            require('postcss-import')({ addDependencyTo: webpackInstance }),
            require('precss')()
          ];
        },
        context: __dirname
      }
    }),
    new webpack.IgnorePlugin(/vertx/),
    ...process.env.NODE_ENV === 'production' ? [
      new webpack.LoaderOptionsPlugin({ minimize: false, debug: false }),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
          screw_ie8: true,
          sequences: true,
          dead_code: true,
          drop_debugger: true,
          comparisons: true,
          conditionals: true,
          evaluate: true,
          booleans: true,
          loops: true,
          unused: true,
          hoist_funs: true,
          if_return: true,
          join_vars: true,
          cascade: true,
          drop_console: true
        },
        output: {
          comments: false
        }
      })
    ] : []
  ]
};
