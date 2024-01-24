import React from 'react'

import { Button } from 'payload/components/elements'
import { useDocumentInfo, useLocale } from 'payload/components/utilities'
import { useAllFormFields, reduceFieldsToValues, useForm } from 'payload/components/forms'
import { Fields } from 'payload/dist/admin/components/forms/Form/types'

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
      console.log('fields', fields)
      dispatchFields({
        type: 'REPLACE_STATE',
        state: {
          ...fields,
          title: { ...fields.title, value: 'new title here' },
        } as Fields,
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
