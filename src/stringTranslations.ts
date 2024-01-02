import { Block, CollectionConfig } from 'payload/types'

import { admins } from './access/admins'
import { adminsOrPublished } from './access/adminsOrPublished'
import { anyone } from './access/anyone'
import aiTranslate from './aiTranslate'

const TextAreaBlock: Block = {
  slug: 'translation-textarea',

  fields: [
    {
      name: 'content',
      type: 'textarea',
      localized: true,
    },
  ],
}

const stringTranslations: CollectionConfig = {
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
      }),
      async req => {
        console.log('create-missing', req.body)
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
      handler: async (req, res, next) => {
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
            data: {
              key: req.body.key,
              namespace: req.body.namespace,
              translation: [
                {
                  original: req.body.content,
                  blockType: 'translation-textarea',
                },
              ],
            },
          })

          res.status(200).send(newPost)
          //res.status(404).send({ error: 'not found' })
        }
      },
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

export default stringTranslations
