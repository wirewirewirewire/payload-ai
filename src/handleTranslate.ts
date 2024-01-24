import aiTranslate, { translateCollection } from './aiTranslate'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload/config'

export const createTranslatorHandler = (translatorConfig: PluginTypes): PayloadHandler => {
  return async (req, res) => {
    const doc = await req.payload.findByID({
      collection: req.collection.config.slug,
      id: req.body.id,
    })

    if (!doc) return res.status(404).send()

    const collectionOptions = translatorConfig.collections[req.collection.config.slug]

    //  const translator = aiTranslate({ collectionOptions, collection: req.collection }, 'fallback')

    const result = await translateCollection({
      doc,
      req,
      previousDoc: {},
      context: {},
      collectionOptions,
      collection: req.collection.config,
      onlyMissing: req.body.onlyMissing,
      codes: req.body.codes,
    })
    /*if (translatorConfig.access) {
      const hasAccesses = await translatorConfig.access(req)
      if (!hasAccesses) res.status(403).send()
    } else {
      if (!req.user) return res.status(403).send()
    }
*/
    const translated = { result: 'translated' }
    res.json(translated)
  }
}
