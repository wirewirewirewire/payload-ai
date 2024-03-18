import { buildConfig } from 'payload/config'
import path from 'path'
import Users from './collections/Users'
import Examples from './collections/Examples'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { webpackBundler } from '@payloadcms/bundler-webpack'
//import { slateEditor } from '@payloadcms/richtext-slate'

import {
  BlocksFeature,
  BoldTextFeature,
  LinkFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { aiTranslatorPlugin, generateDescription, generateTitle } from '../../src/index'
import ExamplesWithVersions from './collections/ExamplesWithVersions'
import seo from '@payloadcms/plugin-seo'
import { TextBlock } from './blocks/TextBlock'

export default buildConfig({
  admin: {
    user: Users.slug,
    bundler: webpackBundler(),
    webpack: config => {
      const newConfig = {
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...(config?.resolve?.alias || {}),
            react: path.join(__dirname, '../node_modules/react'),
            'react-dom': path.join(__dirname, '../node_modules/react-dom'),
            payload: path.join(__dirname, '../node_modules/payload'),
            // payload: path.join(__dirname, '../node_modules/payload'),
            // '@faceless-ui/modal': path.join(__dirname, '../node_modules/@faceless-ui/modal'),
          },
        },
      }
      return newConfig
    },
  },
  collections: [Examples, ExamplesWithVersions, Users],
  //editor: slateEditor({}),

  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,

      LinkFeature({
        // Example showing how to customize the built-in fields
        // of the Link feature
        fields: [
          {
            name: 'rel',
            label: 'Rel Attribute',
            type: 'select',
            hasMany: true,
            options: ['noopener', 'noreferrer', 'nofollow'],
            admin: {
              description:
                'The rel attribute defines the relationship between a linked resource and the current document. This is a custom link field.',
            },
          },
        ],
      }),
      BlocksFeature({
        blocks: [TextBlock],
      }),
    ],
  }),
  localization: {
    locales: ['en', 'de' /*'ja' 'es','fr', 'it', 'ja' */],
    defaultLocale: 'en',
    fallback: true,
  },
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  plugins: [
    aiTranslatorPlugin({
      enabled: true,
      collections: {
        examples: {
          fields: ['title', 'longText', 'jsonContent', 'contentRichText'],
        },
        'examples-with-versions': {
          fields: ['title', 'longText', 'jsonContent'],
        },
        translations: {
          settings: {
            model: 'gpt-4',
            promptFunc: ({ messages, namespace }) => {
              console.log('promptFunc', messages, namespace)

              return [
                {
                  role: 'system',
                  content:
                    'Important: Add a smily face at the end of the message to make the AI more friendly. 😊',
                },
                ...messages,
              ]
            },
          },
        },
      },
    }),
    seo({
      collections: ['examples'],
      // uploadsCollection: 'media',
      generateTitle: generateTitle,
      generateDescription: generateDescription,
    }),
  ],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI,
  }),
})
