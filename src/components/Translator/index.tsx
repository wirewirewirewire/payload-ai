import React from 'react'

import { Button } from 'payload/components/elements'
import { useDocumentInfo, useLocale } from 'payload/components/utilities'

const baseClass = 'after-dashboard'

export const Translator: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false)

  const locale = useLocale()
  const documentInfo: any = useDocumentInfo()
  const translate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/${documentInfo.collection.slug}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: documentInfo.id,
        }),
      })

      const translatedValues = await response.json()

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      console.error(error)
    }
  }

  return (
    <div className={baseClass}>
      <Button disabled={isLoading} size="small" onClick={translate}>
        <span>Translate content from default language</span>
        {isLoading && <>Loading...</>}
      </Button>
    </div>
  )
}
