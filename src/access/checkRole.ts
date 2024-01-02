//import type { User } from '../../payload-types'

export const checkRole = (allRoles: any /* User['roles'] = [] */, user?: any): boolean => {
  if (user) {
    if (
      allRoles.some((role: any) => {
        return user?.roles?.some((individualRole: any) => {
          return individualRole === role
        })
      })
    )
      return true
  }

  return false
}
