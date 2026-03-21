import { validateAccess } from './access/validateAccess'
import { translateCollection } from './aiTranslate'
import { PluginTypes } from './types'
import { PayloadHandler } from 'payload'

const encoder = new TextEncoder()

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

const getHeaderValue = (headers: unknown, name: string): string | undefined => {
  if (!headers) return undefined

  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) || undefined
  }

  const normalizedName = name.toLowerCase()
  const entries = Object.entries(headers as Record<string, unknown>)
  const matchedEntry = entries.find(([key]) => key.toLowerCase() === normalizedName)

  return typeof matchedEntry?.[1] === 'string' ? matchedEntry[1] : undefined
}

export const createTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async req => {
    const reqAny = req as any
    const body = reqAny.data || (reqAny.json ? await reqAny.json() : reqAny.body || {})
    const acceptHeader = getHeaderValue(reqAny.headers, 'accept')
    const wantsProgressStream = Boolean(acceptHeader?.includes('application/x-ndjson'))
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

    const doc = await req.payload.findByID({
      collection: collectionSlug,
      id: body.id,
      locale: body.locale,
    })

    if (!doc) return new Response(null, { status: 404 })

    const collectionOptions = pluginOptions.collections?.[collectionSlug] || {}

    const hasAccess = await validateAccess(req, pluginOptions)
    if (!hasAccess) return jsonResponse({ error: 'not allowed' }, 403)

    const settings = {
      ...(body.settings || {}),
      ...(collectionOptions.settings || {}),
    }

    if (wantsProgressStream) {
      const stream = new ReadableStream({
        start(controller) {
          const send = (payload: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
          }

          void (async () => {
            try {
              send({ type: 'started' })

              await translateCollection({
                doc,
                req,
                previousDoc: {},
                context: {},
                collectionOptions,
                collection: collectionConfig,
                onlyMissing: body.onlyMissing,
                codes: body.codes,
                sourceLanguage: body.locale,
                settings: { ...settings },
                onProgress: (progress: Record<string, unknown>) => {
                  send({ type: 'language', ...progress })
                },
              })

              send({ type: 'complete' })
            } catch (error: any) {
              send({
                type: 'error',
                message: error?.message || 'Translation failed',
              })
            } finally {
              controller.close()
            }
          })()
        },
      })

      return new Response(stream, {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/x-ndjson; charset=utf-8',
        },
      })
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
      sourceLanguage: body.locale,
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
    return jsonResponse(translated)
  }
}
