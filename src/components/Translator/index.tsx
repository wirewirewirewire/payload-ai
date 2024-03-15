import React, { useCallback } from 'react'

import { Button, Drawer, DrawerToggler } from 'payload/components/elements'
import { useDocumentInfo, useLocale } from 'payload/components/utilities'
import { useModal } from '@faceless-ui/modal'
import './Translator.scss'
import { SelectInput, useForm } from 'payload/components/forms'

const baseClass = 'after-dashboard'

// React.FC<TogglerProps>

/*
interface DrawerTogglerAltTypes = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (e: any) => void;
  slug: string;
} */

export const DrawerTogglerAlt: any = ({
  children,
  className,
  disabled,
  onClick,
  slug,
  ...rest
}: any) => {
  const { openModal } = useModal()
  console.log('openModal', openModal)

  const handleClick = useCallback(
    (e: any) => {
      openModal(slug)
      if (typeof onClick === 'function') onClick(e)
    },
    [openModal, slug, onClick],
  )

  return (
    <button className={className} disabled={disabled} onClick={handleClick} type="button" {...rest}>
      {children}
    </button>
  )
}

export const Translator: React.FC = () => {
  const baseClass = 'ai-translator'

  //const { fields, getDataByPath } = useForm()

  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState<string>('default')

  const locale = useLocale()
  const documentInfo: any = useDocumentInfo()
  const translate = async ({ codes }: any) => {
    const settings = {
      model: selectedModel === 'default' ? undefined : selectedModel,
    }
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/${documentInfo.collection.slug}/translate?locale=${locale.code}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: documentInfo.id,
            locale: locale.code,
            codes,
            settings,
          }),
        },
      )

      const translatedValues = await response.json()

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      console.error(error)
    }
  }

  const { openModal } = useModal()
  const slug = 'ai-translator'

  const handleClick = useCallback(
    (e: any) => {
      console.log('handleClick')
      openModal(slug)
      // if (typeof onClick === 'function') onClick(e)
    },
    [openModal, slug /*onClick */],
  )
  /*
 <Button onClick={handleClick}>Results are loading...</Button>
 */

  const options = [
    {
      label: 'Default',
      value: 'default',
    },
    {
      label: 'GPT-3.5 Turbo (1106)',
      value: 'gpt-3.5-turbo-1106',
    },
    {
      label: 'GPT-4 Turbo (Preview)',
      value: 'gpt-4-turbo-preview',
    },

    {
      label: 'GPT-4 (most expensive)',
      value: 'gpt-4',
    },
  ]
  return (
    <div className={baseClass}>
      <DrawerToggler slug="ai-translator" className={`${baseClass}__drawer__toggler`}>
        Translator
      </DrawerToggler>

      <Drawer title="Translator" slug="ai-translator">
        {isLoading ? (
          <Button disabled={true}>Results are loading...</Button>
        ) : (
          <>
            <div>
              <SelectInput
                onChange={(e: any) => {
                  setSelectedModel(e.value)
                }}
                name="selectedModel"
                value={selectedModel}
                path="model"
                options={options}
              />
            </div>
            <div>Translates from: {locale.code}</div>
            <div className={`${baseClass}__translation-buttons`}>
              <Button disabled={isLoading} onClick={() => translate({})}>
                <span>Translate content to all languages</span>
              </Button>
              <Button disabled={isLoading} onClick={() => translate({ codes: [locale.code] })}>
                <span>Translate only {locale.label as string}</span>
              </Button>
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}
