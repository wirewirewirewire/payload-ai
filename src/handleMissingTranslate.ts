import type { PayloadHandler } from 'payload'

import type { PluginTypes } from './types.js'

import { validateAccess } from './access/validateAccess.js'
import { translateCollection } from './aiTranslate.js'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  })

export const createMissingTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async req => {
    const reqAny = req as any
    const body = reqAny.data || (reqAny.json ? await reqAny.json() : reqAny.body || {})
    const onlyMissing = body.onlyMissing !== false
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
    if (!hasAccess) {return jsonResponse({ error: 'not allowed' }, 403)}

    const docs: any[] = []
    const localizationConfig = req.payload.config?.localization
    const sourceLocale =
      body.locale ||
      (localizationConfig && typeof localizationConfig === 'object'
        ? localizationConfig.defaultLocale
        : undefined)
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const pageResult = await req.payload.find({
        collection: collectionSlug,
        limit: 100,
        locale: sourceLocale,
        page,
      })

      if (Array.isArray(pageResult?.docs)) {
        docs.push(...pageResult.docs)
      }

      hasNextPage = Boolean(pageResult?.hasNextPage)
      page += 1
    }

    if (!docs.length) {return jsonResponse({ docs: [], result: 'translated', totalDocs: 0 })}

    const collectionOptions = pluginOptions.collections?.[collectionSlug] || {}
    const settings = {
      ...(body.settings || {}),
      ...(collectionOptions.settings || {}),
    }
    const failures: Array<{ error: string; id: number | string }> = []
    let processedDocs = 0

    for (const singleDoc of docs) {
      try {
      const doc = await req.payload.findByID({
        id: singleDoc.id,
        collection: collectionSlug,
        depth: 0,
        fallbackLocale: false,
        locale: singleDoc.sourceLanguage || sourceLocale,
      })

        await translateCollection({
          codes: body.codes,
          collection: collectionConfig,
          collectionOptions,
          context: {},
          doc,
          onlyMissing,
          previousDoc: {},
          req,
          settings: { ...settings },
          sourceLanguage: doc.sourceLanguage || sourceLocale,
        })

        processedDocs += 1
      } catch (error: any) {
        failures.push({
          id: singleDoc.id,
          error: error?.message || 'Translation failed',
        })
      }
    }

    const translated = {
      failedDocs: failures.length,
      failures,
      onlyMissing,
      processedDocs,
      result: 'translated',
      totalDocs: docs.length,
    }

    return jsonResponse(translated)
  }
}
