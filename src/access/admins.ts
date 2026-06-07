import type { AccessArgs } from 'payload'

import { checkRole } from './checkRole.js'
//import type { User } from '../payload-types'

type isAdmin = (args: AccessArgs<unknown>) => boolean

export const admins: isAdmin = ({ req: { user } }) => {
  if (!user) {return false}
  return checkRole(['admin'], user)
}
