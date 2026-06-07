import type { Payload } from 'payload'

import type { PluginTypes } from './types.js'

export const onInitExtension = (pluginOptions: PluginTypes, payload: Payload): void => {
  try {
    void pluginOptions
    void payload
  } catch (err: unknown) {
    // payload.logger(err)
  }
}
