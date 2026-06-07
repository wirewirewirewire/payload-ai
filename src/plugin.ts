import type { Plugin } from 'payload'

import type { PluginTypes } from './types.js'

import aiCaptionHook from './aiCaption.js'
import { generateTextHandler } from './generateText.js'
import { createTranslatorHandler } from './handleTranslate.js'
import { onInitExtension } from './onInitExtension.js'
import stringTranslations from './stringTranslations.js'

const TRANSLATOR_COMPONENT_PATH = 'payload-ai/rsc#Translator'
const TRANSLATIONS_BACKFILL_COMPONENT_PATH = 'payload-ai/rsc#TranslationsBackfill'

export const aiTranslatorPlugin =
  (pluginOptions: PluginTypes = {}): Plugin =>
  incomingConfig => {
    if (pluginOptions.enabled === false) {
      return incomingConfig
    }

    const allCollectionOptions = pluginOptions.collections || {}

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
                    )

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
      clientProps: {
        localization: sanitizedLocalization,
      },
      path: TRANSLATOR_COMPONENT_PATH,
    }
    const translationsBackfillComponent = {
      clientProps: {
        localization: sanitizedLocalization,
      },
      path: TRANSLATIONS_BACKFILL_COMPONENT_PATH,
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

    const config = { ...incomingConfig }

    config.collections = (config.collections || []).map(existingCollection => {
      const collectionOptions = {}
      if (existingCollection.slug !== 'media') {return existingCollection}

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
            aiCaptionHook({ collection: existingCollection, collectionOptions, pluginOptions }),
          ],
        },
      }
    })

    config.collections = (config.collections || []).map(existingCollection => {
      const collectionOptions = allCollectionOptions[existingCollection.slug]

      if (!collectionOptions) {return existingCollection}

      return {
        ...withTranslatorControl(existingCollection),

        endpoints: [
          ...(existingCollection.endpoints || []),
          {
            handler: createTranslatorHandler(pluginOptions),
            method: 'post',
            path: '/translate',
          },
        ],
        fields: [...(existingCollection.fields || [])],
        hooks: {
          ...(existingCollection.hooks || {}),
          afterChange: [
            ...(existingCollection.hooks?.afterChange || []),
            //  aiTranslate({ collectionOptions, collection: existingCollection }),
            // getBeforeChangeHook({ adapter, collection: existingCollection }),
          ],
        },
      }
    })

    if (pluginOptions.stringTranslation?.enabled !== false) {
      const translationsCollection = withTranslatorControl(stringTranslations(pluginOptions))

      config.collections = [
        ...(config.collections || []),
        {
          ...translationsCollection,
          admin: {
            ...(translationsCollection.admin || {}),
            components: {
              ...(translationsCollection.admin?.components || {}),
              beforeList: [
                translationsBackfillComponent,
                ...(translationsCollection.admin?.components?.beforeList || []),
              ],
            },
          },
        },
      ]
    }

    config.globals = [...(config.globals || [])]

    config.hooks = {
      ...(config.hooks || {}),
    }

    if (pluginOptions.generateText?.enabled !== false) {
      config.endpoints = [
        ...(config.endpoints || []),
        {
          handler: generateTextHandler(pluginOptions),
          method: 'post',
          path: '/generate-text',
        },
      ]
    }

    config.onInit = async payload => {
      if (incomingConfig.onInit) {await incomingConfig.onInit(payload)}
      // Add additional onInit code by using the onInitExtension function
      onInitExtension(pluginOptions, payload)
    }

    return config
  }
