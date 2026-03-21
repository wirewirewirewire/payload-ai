import type { CollectionConfig } from 'payload'

export const Random: CollectionConfig = {
  slug: 'random',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      required: true,
    },
  ],
}
