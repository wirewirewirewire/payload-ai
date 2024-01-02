import type { Config, Plugin } from 'payload/config'

import { onInitExtension } from './onInitExtension'
import type { PluginTypes } from './types'
import { extendWebpackConfig } from './webpack'
import AfterDashboard from './components/AfterDashboard'
import stringTranslations from './stringTranslations'
import aiTranslate from './aiTranslate'
import { createTranslatorHandler } from './handleTranslate'
import { Translator } from './components/Translator'
import { Field } from 'payload/types'

type PluginType = (pluginOptions: PluginTypes) => Plugin

export const aiTranslatorPlugin =
  (pluginOptions: PluginTypes): Plugin =>
  incomingConfig => {
    const { collections: allCollectionOptions, enabled } = pluginOptions
    let config = { ...incomingConfig }

    // If you need to add a webpack alias, use this function to extend the webpack config
    const webpack = extendWebpackConfig(incomingConfig)

    ;(config.collections = (config.collections || []).map(existingCollection => {
      const collectionOptions = allCollectionOptions[existingCollection.slug]

      /*if (options?.adapter) {
        const adapter = options.adapter({
          collection: existingCollection,
          prefix: options.prefix,
        })

        if (adapter.onInit) initFunctions.push(adapter.onInit)

        const fields = getFields({
          collection: existingCollection,
          disablePayloadAccessControl: options.disablePayloadAccessControl,
          generateFileURL: options.generateFileURL,
          prefix: options.prefix,
          adapter,
        })

        const handlers = [
          ...(typeof existingCollection.upload === 'object' &&
          Array.isArray(existingCollection.upload.handlers)
            ? existingCollection.upload.handlers
            : []),
        ]

        if (!options.disablePayloadAccessControl) {
          handlers.push(adapter.staticHandler)
        }*/

      if (!collectionOptions) return existingCollection

      return {
        ...existingCollection,
        /* upload: {
          ...(typeof existingCollection.upload === 'object' ? existingCollection.upload : {}),
          handlers,
          disableLocalStorage:
            typeof options.disableLocalStorage === 'boolean' ? options.disableLocalStorage : true,
        }, */
        hooks: {
          ...(existingCollection.hooks || {}),
          afterChange: [
            ...(existingCollection.hooks?.afterChange || []),
            aiTranslate({ /* adapter,*/ collectionOptions, collection: existingCollection }),
            // getBeforeChangeHook({ adapter, collection: existingCollection }),
          ],
        },
        fields: [
          ...(existingCollection.fields || []),
          {
            name: 'translator',
            type: 'ui',
            admin: {
              position: 'sidebar',
              components: {
                Field: Translator,
              },
            },
          } as Field,
        ],
      }
      //}

      return existingCollection
    })),
      (config.admin = {
        ...(config.admin || {}),
        // If you extended the webpack config, add it back in here
        // If you did not extend the webpack config, you can remove this line
        webpack,

        // Add additional admin config here

        components: {
          ...(config.admin?.components || {}),
          // Add additional admin components here
          afterDashboard: [...(config.admin?.components?.afterDashboard || []), AfterDashboard],
        },
      })

    // If the plugin is disabled, return the config without modifying it
    // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
    if (pluginOptions.enabled === false) {
      return config
    }

    config.collections = [
      ...(config.collections || []),
      // Add additional collections here
      stringTranslations, // delete this line to remove the example collection
    ]

    config.endpoints = [
      ...(config.endpoints || []),
      /*{
        path: '/ai-translator',
        method: 'post',
        root: true,
        handler: createTranslatorHandler(translatorConfig),
      },*/
      // Add additional endpoints here
    ]

    config.globals = [
      ...(config.globals || []),
      // Add additional globals here
    ]

    config.hooks = {
      ...(config.hooks || {}),
      // Add additional hooks here
    }

    config.onInit = async payload => {
      if (incomingConfig.onInit) await incomingConfig.onInit(payload)
      // Add additional onInit code by using the onInitExtension function
      onInitExtension(pluginOptions, payload)
    }

    return config
  }
