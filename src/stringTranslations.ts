import { Block, CollectionConfig } from 'payload'

import { admins } from './access/admins'
import { adminsOrPublished } from './access/adminsOrPublished'
import { anyone } from './access/anyone'
import aiTranslate from './aiTranslate'
import { createTranslatorHandler } from './handleTranslate'
import { validateAccess } from './access/validateAccess'
import { createMissingTranslatorHandler } from './handleMissingTranslate'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
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
    admin: {
      useAsTitle: 'key',
    },
    access: {
      read: anyone,
      /*update: admins,
    create: admins,
    delete: admins,*/
    },

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
    endpoints: [
      {
        path: '/create-missing',
        //path: '/:id/tracking',
        method: 'post',
        handler: async (req: any) => {
          const body = req.data || (req.json ? await req.json() : req.body || {})

          const hasAccess = await validateAccess(req, pluginOptions)
          if (!hasAccess) return jsonResponse({ error: 'not allowed' }, 403)

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
              locale: body.language,
              data: {
                key: body.key,
                namespace: body.namespace,
                sourceLanguage: body.language,
                translation: [
                  {
                    content: body.content,
                    blockType: 'translation-textarea',
                  },
                ],
              },
            })

            return jsonResponse(newPost)
          }
        },
      },
      {
        path: '/translate',
        method: 'post',
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
      },
      {
        path: '/translate-missing',
        method: 'post',
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
      },
    ],
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'key',
            type: 'text',
            required: true,
            admin: {
              width: '50%',
            },
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
        minRows: 1,
        maxRows: 1,
        blocks: [TextAreaBlock],
      },
    ],
  }
}

export default stringTranslations
