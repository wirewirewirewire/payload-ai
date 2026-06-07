import { describe, expect, it } from 'vitest'

import type { PluginTypes } from './types.js'

import { aiTranslatorPlugin } from './plugin.js'

const createConfig = () =>
  ({
    collections: [
      {
        slug: 'posts',
        fields: [],
      },
    ],
    localization: {
      defaultLocale: 'en',
      locales: ['en', 'de'],
    },
  }) as any

const applyPlugin = (pluginOptions: PluginTypes) =>
  aiTranslatorPlugin(pluginOptions)(createConfig()) as any

describe('aiTranslatorPlugin', () => {
  it('returns the incoming config unchanged when disabled', () => {
    const config = createConfig()
    const result = aiTranslatorPlugin({ enabled: false })(config)

    expect(result).toBe(config)
  })

  it('handles omitted collections and adds default package surfaces', () => {
    const result = applyPlugin({})

    expect(result.collections).toHaveLength(2)
    expect(result.collections.map((collection: any) => collection.slug)).toEqual([
      'posts',
      'translations',
    ])
    expect(result.endpoints).toEqual([
      expect.objectContaining({
        method: 'post',
        path: '/generate-text',
      }),
    ])
  })

  it('can disable string translation and generate-text surfaces independently', () => {
    const result = applyPlugin({
      generateText: {
        enabled: false,
      },
      stringTranslation: {
        enabled: false,
      },
    })

    expect(result.collections.map((collection: any) => collection.slug)).toEqual(['posts'])
    expect(result.endpoints).toBeUndefined()
  })

  it('adds translator UI and endpoint only to configured collections', () => {
    const result = applyPlugin({
      collections: {
        posts: {
          fields: ['title'],
        },
      },
      generateText: {
        enabled: false,
      },
      stringTranslation: {
        enabled: false,
      },
    })

    const posts = result.collections.find((collection: any) => collection.slug === 'posts')

    expect(posts.endpoints).toEqual([
      expect.objectContaining({
        method: 'post',
        path: '/translate',
      }),
    ])
    expect(posts.admin.components.edit.beforeDocumentControls).toEqual([
      expect.objectContaining({
        path: 'payload-ai/rsc#Translator',
      }),
    ])
  })
})
