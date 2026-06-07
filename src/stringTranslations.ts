import type { Block, CollectionConfig } from 'payload'

import { admins } from './access/admins.js'
import { adminsOrPublished } from './access/adminsOrPublished.js'
import { anyone } from './access/anyone.js'
import { validateAccess } from './access/validateAccess.js'
import aiTranslate from './aiTranslate.js'
import { createMissingTranslatorHandler } from './handleMissingTranslate.js'
import { createTranslatorHandler } from './handleTranslate.js'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  })

const TextAreaBlock: Block = {
  slug: 'translation-textarea',

  fields: [
    {
      name: 'content',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'noAutoTranslate',
      type: 'checkbox',
      label: 'Do not auto-translate',
      localized: true,
    },
  ],
}

const stringTranslations = (pluginOptions: any): CollectionConfig => {
  return {
    slug: 'translations',
    access: {
      read: anyone,
      /*update: admins,
    create: admins,
    delete: admins,*/
    },
    admin: {
      useAsTitle: 'key',
    },

    endpoints: [
      {
        path: '/create-missing',
        //path: '/:id/tracking',
        handler: async (req: any) => {
          const body = req.data || (req.json ? await req.json() : req.body || {})

          const hasAccess = await validateAccess(req, pluginOptions)
          if (!hasAccess) {return jsonResponse({ error: 'not allowed' }, 403)}

          const posts = await req.payload.find({
            collection: 'translations',
            where: {
              key: {
                equals: body.key,
              },
            },
          })

          if (posts.docs.length > 0) {
            return jsonResponse(posts.docs)
          } else {
            const newPost = await req.payload.create({
              collection: 'translations',
              data: {
                key: body.key,
                namespace: body.namespace,
                sourceLanguage: body.language,
                translation: [
                  {
                    blockType: 'translation-textarea',
                    content: body.content,
                  },
                ],
              },
              locale: body.language,
            })

            return jsonResponse(newPost)
          }
        },
        method: 'post',
      },
      {
        handler: createTranslatorHandler({
          ...pluginOptions,
          collections: {
            ...pluginOptions.collections,
            translations: {
              ...pluginOptions.collections?.translations,
              fields: ['content'],
            },
          },
        }),
        method: 'post',
        path: '/translate',
      },
      {
        handler: createMissingTranslatorHandler({
          ...pluginOptions,
          collections: {
            ...pluginOptions.collections,
            translations: {
              ...pluginOptions.collections?.translations,
              fields: ['content'],
            },
          },
        }),
        method: 'post',
        path: '/translate-missing',
      },
    ],
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'key',
            type: 'text',
            admin: {
              width: '50%',
            },
            required: true,
          },
          {
            name: 'namespace',
            type: 'text',
          },
          {
            name: 'sourceLanguage',
            type: 'text',
            admin: {
              width: '10%',
            },
          },
        ],
      },
      {
        name: 'translation',
        type: 'blocks',
        blocks: [TextAreaBlock],
        maxRows: 1,
        minRows: 1,
      },
    ],
    hooks: {
      afterChange: [
        aiTranslate({
          collection: { slug: 'translations' },
          collectionOptions: { fields: ['content'] },
          pluginOptions,
        }),
        async (req: any) => {
          /*if (req.user && req.user.role === 'admin') {
        return req
      }
     
      /*
      return {
        ...req,
        where: {
          ...req.where,
          namespace: {
            equals: 'public',
          },
        },
      }*/
        },
      ],
    },
  }
}

export default stringTranslations
