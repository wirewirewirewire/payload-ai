import type { Access } from 'payload'

import { checkRole } from './checkRole.js'

export const adminsOrPublished: Access = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) {
    return true
  }

  return true
  return {
    _status: {
      equals: 'published',
    },
  }
}
