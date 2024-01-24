import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { CollectionConfig } from 'payload/types'

// Example Collection - For reference only, this must be added to payload.config.ts to be used.
const Examples: CollectionConfig = {
  slug: 'examples',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
    },
    {
      name: 'contentRichText',
      type: 'richText',
      //editor: lexicalEditor({}),
      localized: true,
    },
    {
      name: 'longText',
      type: 'code',
      localized: true,
    },
    {
      name: 'doNotAutoTranslate',
      type: 'code',
      localized: true,
    },
  ],
}

export default Examples
