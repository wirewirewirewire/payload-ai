import type { Plugin } from 'payload'
import fs from 'fs'
import path from 'path'

import { onInitExtension } from './onInitExtension'
import type { PluginTypes } from './types'
import stringTranslations from './stringTranslations'
import { createTranslatorHandler } from './handleTranslate'
import { generateTextHandler } from './generateText'
import aiCaptionHook from './aiCaption'

export const aiTranslatorPlugin =
  (pluginOptions: PluginTypes): Plugin =>
  incomingConfig => {
    const { collections: allCollectionOptions } = pluginOptions
    let translatorComponentAbsolutePath = path.resolve(
      __dirname,
      './components/Translator/index.js',
    )
    if (translatorComponentAbsolutePath.includes(`${path.sep}.next${path.sep}`)) {
      const fromRepoRootDist = path.resolve(process.cwd(), '../dist/components/Translator/index.js')
      const fromNodeModulesDist = path.resolve(
        process.cwd(),
        'node_modules/payload-ai/dist/components/Translator/index.js',
      )

      if (fs.existsSync(fromRepoRootDist)) {
        translatorComponentAbsolutePath = fromRepoRootDist
      } else if (fs.existsSync(fromNodeModulesDist)) {
        translatorComponentAbsolutePath = fromNodeModulesDist
      }
    }
    const adminImportMapBaseDir = incomingConfig.admin?.importMap?.baseDir
    const translatorComponentPathFromBaseDir = adminImportMapBaseDir
      ? path.relative(adminImportMapBaseDir, translatorComponentAbsolutePath)
      : translatorComponentAbsolutePath
    const translatorComponentPath = `${
      translatorComponentPathFromBaseDir.startsWith('.')
        ? translatorComponentPathFromBaseDir
        : `./${translatorComponentPathFromBaseDir}`
    }#Translator`

    const localizationConfig =
      typeof incomingConfig.localization === 'object' && incomingConfig.localization
        ? incomingConfig.localization
        : undefined

    const sanitizedLocalization = localizationConfig
      ? {
          defaultLocale: localizationConfig.defaultLocale,
          locales: Array.isArray(localizationConfig.locales)
            ? localizationConfig.locales
                .map((locale: any) => {
                  if (typeof locale === 'string') {
                    return {
                      code: locale,
                      label: locale,
                    }
                  }

                  if (!locale || typeof locale !== 'object' || typeof locale.code !== 'string') {
                    return null
                  }

                  const rawLabel = locale.label
                  let label = locale.code

                  if (typeof rawLabel === 'string') {
                    label = rawLabel
                  } else if (rawLabel && typeof rawLabel === 'object') {
                    const defaultLocaleLabel =
                      typeof localizationConfig.defaultLocale === 'string'
                        ? rawLabel[localizationConfig.defaultLocale]
                        : undefined
                    const firstStringLabel = Object.values(rawLabel).find(
                      value => typeof value === 'string',
                    ) as string | undefined

                    label =
                      (typeof defaultLocaleLabel === 'string'
                        ? defaultLocaleLabel
                        : firstStringLabel) || locale.code
                  }

                  return {
                    code: locale.code,
                    label,
                  }
                })
                .filter((locale): locale is { code: string; label: string } => Boolean(locale))
            : [],
        }
      : undefined

    const translatorComponent = {
      path: translatorComponentPath,
      clientProps: {
        localization: sanitizedLocalization,
      },
    }

    const withTranslatorControl = (collectionConfig: any) => ({
      ...collectionConfig,
      admin: {
        ...(collectionConfig.admin || {}),
        components: {
          ...(collectionConfig.admin?.components || {}),
          edit: {
            ...(collectionConfig.admin?.components?.edit || {}),
            beforeDocumentControls: [
              ...(collectionConfig.admin?.components?.edit?.beforeDocumentControls || []),
              translatorComponent,
            ],
          },
        },
      },
    })

    let config = { ...incomingConfig }

    config.collections = (config.collections || []).map(existingCollection => {
      const collectionOptions = {}
      if (existingCollection.slug !== 'media') return existingCollection

      return {
        ...existingCollection,

        endpoints: [
          ...(existingCollection.endpoints || []),
          /* {
            path: '/translate',
            method: 'post',
            handler: createTranslatorHandler(pluginOptions),
          }, */
        ],
        hooks: {
          ...(existingCollection.hooks || {}),
          afterChange: [
            ...(existingCollection.hooks?.afterChange || []),
            aiCaptionHook({ collectionOptions, pluginOptions, collection: existingCollection }),
          ],
        },
      }
    })

    config.collections = (config.collections || []).map(existingCollection => {
      const collectionOptions = allCollectionOptions[existingCollection.slug]

      if (!collectionOptions) return existingCollection

      return {
        ...withTranslatorControl(existingCollection),

        endpoints: [
          ...(existingCollection.endpoints || []),
          {
            path: '/translate',
            method: 'post',
            handler: createTranslatorHandler(pluginOptions),
          },
        ],
        hooks: {
          ...(existingCollection.hooks || {}),
          afterChange: [
            ...(existingCollection.hooks?.afterChange || []),
            //  aiTranslate({ collectionOptions, collection: existingCollection }),
            // getBeforeChangeHook({ adapter, collection: existingCollection }),
          ],
        },
        fields: [...(existingCollection.fields || [])],
      }
    })

    // If the plugin is disabled, return the config without modifying it
    // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
    if (pluginOptions.enabled === false) {
      return config
    }

    config.collections = [
      ...(config.collections || []),
      withTranslatorControl(stringTranslations(pluginOptions)),
    ]

    config.globals = [...(config.globals || [])]

    config.hooks = {
      ...(config.hooks || {}),
    }

    config.endpoints = [
      ...(config.endpoints || []),
      {
        path: '/generate-text',
        method: 'post',
        handler: generateTextHandler(pluginOptions),
      },
    ]

    config.onInit = async payload => {
      if (incomingConfig.onInit) await incomingConfig.onInit(payload)
      // Add additional onInit code by using the onInitExtension function
      onInitExtension(pluginOptions, payload)
    }

    return config
  }
