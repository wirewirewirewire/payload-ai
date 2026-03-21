import path from 'path'
import type { Config } from 'payload'
import type { Configuration as WebpackConfig } from 'webpack'

export const extendWebpackConfig =
  (config: Config): ((webpackConfig: WebpackConfig) => WebpackConfig) =>
  webpackConfig =>
    webpackConfig
