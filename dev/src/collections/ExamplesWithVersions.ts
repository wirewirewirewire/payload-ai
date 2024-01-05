import { CollectionConfig } from 'payload/types'

// Example Collection - For reference only, this must be added to payload.config.ts to be used.
const ExamplesWithVersions: CollectionConfig = {
  slug: 'examples-with-versions',
  admin: {
    useAsTitle: 'someField',
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'richText',
      type: 'text',
      localized: true,
    },
  ],
}

export default ExamplesWithVersions
