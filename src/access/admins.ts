import type { AccessArgs } from 'payload/config'

import { checkRole } from './checkRole'
//import type { User } from '../payload-types'

type isAdmin = (args: AccessArgs<unknown, any>) => boolean

export const admins: isAdmin = ({ req: { user } }) => {
  if (!user) return false
  return checkRole(['admin'], user)
}
