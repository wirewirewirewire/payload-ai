import { validateAccess } from './access/validateAccess'
import { translateCollection } from './aiTranslate'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

export const createMissingTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async req => {
    const reqAny = req as any
    const body = reqAny.data || (reqAny.json ? await reqAny.json() : reqAny.body || {})
    const collectionSlug =
      reqAny.collection?.config?.slug ||
      reqAny.routeParams?.collection ||
      (typeof reqAny.pathname === 'string'
        ? reqAny.pathname.match(/\/api\/([^/]+)\//)?.[1]
        : undefined)
    const collectionConfig =
      reqAny.collection?.config ||
      reqAny.payload?.config?.collections?.find(
        (collection: any) => collection.slug === collectionSlug,
      )

    if (!collectionSlug || !collectionConfig) {
      return jsonResponse({ error: 'missing collection context' }, 400)
    }

    const hasAccess = await validateAccess(req, pluginOptions)
    if (!hasAccess) return jsonResponse({ error: 'not allowed' }, 403)

    const allDocs = await req.payload.find({
      collection: collectionSlug,
      locale: body.locale,
      limit: 10000,
    })

    if (!allDocs?.docs) return new Response(null, { status: 404 })

    for (const singleDoc of allDocs.docs) {
      const doc = await req.payload.findByID({
        collection: collectionSlug,
        id: singleDoc.id,
        locale: singleDoc.sourceLanguage || body.locale,
      })

      const collectionOptions = pluginOptions.collections?.[collectionSlug] || {}

      const settings = {
        ...(body.settings || {}),
        ...(collectionOptions.settings || {}),
      }

      const result = await translateCollection({
        doc,
        req,
        previousDoc: {},
        context: {},
        collectionOptions,
        collection: collectionConfig,
        onlyMissing: body.onlyMissing,
        codes: body.codes,
        sourceLanguage: doc.sourceLanguage || body.locale,
        settings: { ...settings },
      })
    }

    const translated = { result: 'translated' }

    return jsonResponse(translated)
  }
}
