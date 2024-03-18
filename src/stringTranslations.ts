import { Block, CollectionConfig, Field } from 'payload/types'

import { admins } from './access/admins'
import { adminsOrPublished } from './access/adminsOrPublished'
import { anyone } from './access/anyone'
import aiTranslate from './aiTranslate'
import { Translator } from './components/Translator'
import { createTranslatorHandler } from './handleTranslate'

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
        handler: async (req: any, res: any, next: any) => {
          const posts = await req.payload.find({
            collection: 'translations',
            where: {
              key: {
                equals: req.body.key,
              },
            },
          })

          if (posts.docs.length > 0) {
            res.status(200).send(posts.docs)
          } else {
            const newPost = await req.payload.create({
              collection: 'translations',
              locale: req.body.language,
              data: {
                key: req.body.key,
                namespace: req.body.namespace,
                sourceLanguage: req.body.language,
                translation: [
                  {
                    content: req.body.content,
                    blockType: 'translation-textarea',
                  },
                ],
              },
            })

            res.status(200).send(newPost)
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
      {
        name: 'translator',
        type: 'ui',
        admin: {
          position: 'sidebar',
          components: {
            Field: Translator,
          },
        },
      } as Field,
    ],
  }
}

export default stringTranslations
