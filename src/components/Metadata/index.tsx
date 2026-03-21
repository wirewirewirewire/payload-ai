import React from 'react'

import { Button, useAllFormFields, useDocumentInfo, useForm, useLocale } from '@payloadcms/ui'

const baseClass = 'after-dashboard'

export const GenerateMetadata: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false)

  const [fields, dispatchFields] = useAllFormFields()
  const { setModified } = useForm()

  const locale = useLocale()
  const documentInfo: any = useDocumentInfo()
  const translate = async () => {
    setIsLoading(true)
    try {
      dispatchFields({
        type: 'REPLACE_STATE',
        state: {
          ...fields,
          title: { ...fields.title, value: 'new title here' },
        } as any,
      })

      setModified(true)

      /*const response = await fetch(`/api/${documentInfo.collection.slug}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: documentInfo.id,
        }),
      })

      const translatedValues = await response.json()*/

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      console.error(error)
    }
  }

  return (
    <div className={baseClass}>
      <Button disabled={isLoading} size="small" onClick={translate}>
        <span>Generate metdadata</span>
        {isLoading && <>Loading...</>}
      </Button>
    </div>
  )
}
