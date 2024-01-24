import { CollectionConfig } from 'payload/types'

// Example Collection - For reference only, this must be added to payload.config.ts to be used.
const ExamplesWithVersions: CollectionConfig = {
  slug: 'examples-with-versions',
  admin: {
    useAsTitle: 'title',
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
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

export default ExamplesWithVersions
