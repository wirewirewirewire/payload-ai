'use client'

import { Button } from '@payloadcms/ui'
import React, { useCallback } from 'react'

import { modelOptions } from '../../modelOptions.js'

import './index.css'

type LocaleShape = { code: string; label?: string }

type BackfillResult = {
  failedDocs?: number
  failures?: Array<{ error: string; id: number | string }>
  processedDocs?: number
  totalDocs?: number
}

type TranslationsBackfillProps = {
  localization?: {
    defaultLocale?: string
    locales?: Array<LocaleShape | string>
  }
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Backfill failed.'

const normalizeLocales = ({
  defaultLocaleCode,
  localizationLocales,
}: {
  defaultLocaleCode: string
  localizationLocales?: Array<LocaleShape | string>
}) => {
  if (!Array.isArray(localizationLocales)) {
    return [{ code: defaultLocaleCode, label: defaultLocaleCode }]
  }

  const normalizedLocales: LocaleShape[] = []

  localizationLocales.forEach(localeEntry => {
    if (typeof localeEntry === 'string') {
      normalizedLocales.push({
        code: localeEntry,
        label: localeEntry,
      })
      return
    }

    if (localeEntry && typeof localeEntry === 'object' && localeEntry.code) {
      normalizedLocales.push({
        code: localeEntry.code,
        label: localeEntry.label || localeEntry.code,
      })
    }
  })

  return normalizedLocales.length
    ? normalizedLocales
    : [{ code: defaultLocaleCode, label: defaultLocaleCode }]
}

export const TranslationsBackfill: React.FC<TranslationsBackfillProps> = ({ localization }) => {
  const baseClass = 'ai-translations-backfill'
  const defaultLocaleCode = localization?.defaultLocale || 'en'
  const locales = React.useMemo(
    () =>
      normalizeLocales({
        defaultLocaleCode,
        localizationLocales: localization?.locales,
      }),
    [defaultLocaleCode, localization?.locales],
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<BackfillResult | null>(null)
  const [statusMessage, setStatusMessage] = React.useState<null | string>(null)
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState<string>('default')
  const [selectedSourceLocale, setSelectedSourceLocale] =
    React.useState<string>(defaultLocaleCode)

  const sourceLocaleOptions = locales.map(locale => ({
    label: locale.label,
    value: locale.code,
  }))

  const handleOpen = useCallback(() => {
    setStatusMessage(null)
    setResult(null)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false)
    }
  }, [isLoading])

  const backfillMissingTranslations = async () => {
    setIsLoading(true)
    setStatusMessage('Backfill started. Existing content will be left untouched.')
    setResult(null)

    try {
      const response = await fetch('/api/translations/translate-missing', {
        body: JSON.stringify({
          locale: selectedSourceLocale,
          onlyMissing: true,
          settings: {
            model: selectedModel === 'default' ? undefined : selectedModel,
          },
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const responseBody = await response.json()

      if (!response.ok) {
        throw new Error(responseBody?.error || `Backfill failed with status ${response.status}`)
      }

      setResult(responseBody)
      setStatusMessage(
        responseBody.failedDocs
          ? `Backfill finished with ${responseBody.failedDocs} failed entries.`
          : 'Backfill finished.',
      )
    } catch (error: unknown) {
      setStatusMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={baseClass}>
      <Button buttonStyle="secondary" onClick={handleOpen} size="small">
        Backfill empty translations
      </Button>

      {isOpen ? (
        <div aria-modal={true} className={`${baseClass}__modal`} role="dialog">
          <button
            aria-label="Close"
            className={`${baseClass}__backdrop`}
            disabled={isLoading}
            onClick={handleClose}
            type="button"
          />
          <div className={`${baseClass}__dialog`}>
            <div className={`${baseClass}__content`}>
              <div className={`${baseClass}__header`}>
                <h2>Backfill empty translations</h2>
                <button
                  aria-label="Close"
                  className={`${baseClass}__close`}
                  disabled={isLoading}
                  onClick={handleClose}
                  type="button"
                >
                  X
                </button>
              </div>

              <p className={`${baseClass}__description`}>
                Walk through every translation entry and fill empty localized content only.
              </p>

              {statusMessage ? (
                <p className={`${baseClass}__status-message`}>{statusMessage}</p>
              ) : null}

              {result ? (
                <div aria-live="polite" className={`${baseClass}__result`}>
                  <p>
                    Processed {result.processedDocs || 0} of {result.totalDocs || 0} entries.
                  </p>
                  {result.failedDocs ? <p>{result.failedDocs} entries failed.</p> : null}
                  {result.failures?.length ? (
                    <ul>
                      {result.failures.slice(0, 5).map(failure => (
                        <li key={failure.id}>
                          {failure.id}: {failure.error}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className={`${baseClass}__field`}>
                <p className={`${baseClass}__label`}>Source locale</p>
                <div
                  aria-label="Source locale"
                  className={`${baseClass}__radio-group`}
                  role="radiogroup"
                >
                  {sourceLocaleOptions.map(option => (
                    <label className={`${baseClass}__radio-option`} key={option.value}>
                      <input
                        aria-label={`Use ${option.label} as source locale`}
                        checked={selectedSourceLocale === option.value}
                        disabled={isLoading}
                        name="backfillSourceLocale"
                        onChange={() => setSelectedSourceLocale(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`${baseClass}__field`}>
                <p className={`${baseClass}__label`}>Model</p>
                <div aria-label="Model" className={`${baseClass}__radio-group`} role="radiogroup">
                  {modelOptions.map(option => (
                    <label className={`${baseClass}__radio-option`} key={option.value}>
                      <input
                        aria-label={`Use ${option.label} model`}
                        checked={selectedModel === option.value}
                        disabled={isLoading}
                        name="backfillSelectedModel"
                        onChange={() => setSelectedModel(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`${baseClass}__actions`}>
                <Button disabled={isLoading} onClick={backfillMissingTranslations}>
                  {isLoading ? 'Backfilling...' : 'Start backfill'}
                </Button>
                <Button buttonStyle="secondary" disabled={isLoading} onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
