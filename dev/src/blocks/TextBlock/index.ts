import type { Block } from 'payload/types'

export const TextBlock: Block = {
  slug: 'textblock',
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'kind',
      type: 'select',
      options: [
        {
          label: 'Info',
          value: 'info',
        },
        {
          label: 'Warning',
          value: 'warning',
        },
        {
          label: 'Error',
          value: 'error',
        },
      ],
    },
  ],
}
