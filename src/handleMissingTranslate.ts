import { validateAccess } from './access/validateAccess'
import { translateCollection } from './aiTranslate'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload/config'

export const createMissingTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async (req, res) => {
    if (!validateAccess(req, res, pluginOptions)) return

    const allDocs = await req.payload.find({
      collection: req.collection.config.slug,
      locale: req.body.locale,
      limit: 10000,
    })

    if (!allDocs?.docs) return res.status(404).send()
    console.log('translate all docs', allDocs?.docs.length)
    for (const singleDoc of allDocs.docs) {
      const doc = await req.payload.findByID({
        collection: req.collection.config.slug,
        id: singleDoc.id,
        locale: singleDoc.sourceLanguage || req.body.locale,
      })

      console.log('doc', doc.sourceLanguage, req.body.codes)

      const collectionOptions = pluginOptions.collections[req.collection.config.slug]

      const settings = {
        ...(req.body.settings || {}),
        ...collectionOptions.settings,
      }

      const result = await translateCollection({
        doc,
        req,
        previousDoc: {},
        context: {},
        collectionOptions,
        collection: req.collection.config,
        onlyMissing: req.body.onlyMissing,
        codes: req.body.codes,
        sourceLanguage: doc.sourceLanguage || req.body.locale,
        settings: { ...settings },
      })
    }

    const translated = { result: 'translated' }
    console.log('dooone')
    res.json(translated)
  }
}
