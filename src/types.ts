export interface PluginTypes {
  /**
   * Enable or disable plugin
   * @default false
   */
  enabled?: boolean
  /**
   * Collection options
   */
  collections: {
    [key: string]: any
  }
}

export interface NewCollectionTypes {
  title: string
}

export interface TranslatorConfig {
  name: string
  type: string
}
