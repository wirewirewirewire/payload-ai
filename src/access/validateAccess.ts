import type { Access } from 'payload'

const getCollectionSlug = (req: any): string | undefined => {
  const fromCollection = req?.collection?.config?.slug
  const fromRouteParams = req?.routeParams?.collection

  if (typeof fromCollection === 'string') return fromCollection
  if (typeof fromRouteParams === 'string') return fromRouteParams

  const pathname = req?.pathname || req?.url || ''
  const pathnameMatch = typeof pathname === 'string' ? pathname.match(/\/api\/([^/]+)\//) : null

  return pathnameMatch?.[1]
}

export const validateAccess = (req: any, pluginOptions: any) => {
  const collectionSlug = getCollectionSlug(req)
  const collectionOptions = (collectionSlug && pluginOptions.collections?.[collectionSlug]) || {}
  const collectionConfig =
    req?.collection?.config ||
    req?.payload?.config?.collections?.find((collection: any) => collection.slug === collectionSlug)

  const accessControl = collectionOptions.access || collectionConfig?.access?.update

  if (typeof accessControl !== 'function') return true

  return accessControl({ req })
}
