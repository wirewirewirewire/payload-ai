import { translateCollection } from './aiTranslate'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload/config'

export const createTranslatorHandler = (translatorConfig: PluginTypes): PayloadHandler => {
  return async (req, res) => {
    const doc = await req.payload.findByID({
      collection: req.collection.config.slug,
      id: req.body.id,
      locale: req.body.locale,
    })

    if (!doc) return res.status(404).send()

    const collectionOptions = translatorConfig.collections[req.collection.config.slug]

    const settings = req.body.settings || {}

    //     const settings = pluginOptions.collections?.[collection.slug]?.settings

    const result = await translateCollection({
      doc,
      req,
      previousDoc: {},
      context: {},
      collectionOptions,
      collection: req.collection.config,
      onlyMissing: req.body.onlyMissing,
      codes: req.body.codes,
      sourceLanguage: req.body.locale,
      settings: { ...settings },
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
