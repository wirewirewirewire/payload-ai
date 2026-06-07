import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { aiTranslatorPlugin as aiTranslatorPluginImported } from '../../dist/index.js'

import { Users } from './collections/Users.js'
import { Media } from './collections/Media.js'
import { Random } from './collections/Random.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const aiTranslatorPlugin = aiTranslatorPluginImported as any

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Random],
  localization: {
    locales: [
      {
        code: 'en',
        label: 'English',
      },
      {
        code: 'de',
        label: 'Deutsch',
      },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [
    aiTranslatorPlugin({
      enabled: true,
      collections: {
        media: {
          fields: ['alt'],
        },
        random: {
          fields: ['alt'],
        },
      },
    }),
  ],
})
