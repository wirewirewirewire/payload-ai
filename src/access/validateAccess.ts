import type { Access } from 'payload/config'

export const validateAccess = (req: any, res: any, pluginOptions: any) => {
  const collectionOptions = pluginOptions.collections[req.collection.config.slug]

  const accessControl = collectionOptions.access || req.collection.config.access.update
  const access = accessControl({ req })

  if (!access) {
    res.status(403).send({ error: 'not allowed' })
  }
  return access
}
