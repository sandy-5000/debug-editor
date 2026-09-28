import { builtInTemplatesForLanguage } from './helloWorldTemplates.ts'
import type { EditorLanguage } from './storage.ts'
import { LANGUAGE_OPTIONS } from './storage.ts'

export type Template = {
  id: string
  name: string
  url?: string
  content?: string
  builtIn?: boolean
}

export function getBuiltInTemplates(language: EditorLanguage): Template[] {
  return builtInTemplatesForLanguage(language)
}

export function templateSubtitle(template: Template) {
  if (template.builtIn && template.content) {
    return 'Built-in Hello World'
  }
  return template.url ?? ''
}

export async function loadTemplateContent(template: Template): Promise<string> {
  if (template.content !== undefined) {
    return template.content
  }
  if (!template.url) {
    throw new Error('Template has no content or URL')
  }
  const response = await fetch(template.url)
  if (!response.ok) {
    throw new Error(`Could not load template (${response.status})`)
  }
  return response.text()
}

const STORAGE_BY_LANG_KEY = 'debug-editor-templates-by-lang'
const LEGACY_STORAGE_KEY = 'debug-editor-templates'

const LANGUAGE_IDS = new Set<string>(LANGUAGE_OPTIONS.map((option) => option.id))

let legacyTemplatesMigrated = false

function isTemplate(value: unknown): value is Template {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Template
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
    return false
  }
  const hasUrl = typeof candidate.url === 'string'
  const hasContent = typeof candidate.content === 'string'
  return hasUrl && !hasContent
}

function readTemplateMap(): Partial<Record<EditorLanguage, Template[]>> {
  const raw = localStorage.getItem(STORAGE_BY_LANG_KEY)
  if (!raw) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    const map: Partial<Record<EditorLanguage, Template[]>> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (!LANGUAGE_IDS.has(key) || !Array.isArray(value)) {
        continue
      }
      map[key as EditorLanguage] = value.filter(isTemplate)
    }
    return map
  } catch {
    return {}
  }
}

function writeTemplateMap(map: Partial<Record<EditorLanguage, Template[]>>) {
  localStorage.setItem(STORAGE_BY_LANG_KEY, JSON.stringify(map))
}

function migrateLegacyTemplates() {
  if (legacyTemplatesMigrated) {
    return
  }
  legacyTemplatesMigrated = true

  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) {
    return
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const templates = parsed.filter(isTemplate)
      if (templates.length > 0) {
        const map = readTemplateMap()
        if (!map.cpp?.length) {
          map.cpp = templates
          writeTemplateMap(map)
        }
      }
    }
  } catch {
    // ignore invalid legacy data
  }

  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function nameFromUrl(url: string) {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop()
    return last ? decodeURIComponent(last) : url
  } catch {
    return url
  }
}

export function loadUserTemplates(language: EditorLanguage): Template[] {
  migrateLegacyTemplates()
  const map = readTemplateMap()
  return map[language] ?? []
}

export function saveUserTemplates(templates: Template[], language: EditorLanguage) {
  migrateLegacyTemplates()
  const map = readTemplateMap()
  map[language] = templates
  writeTemplateMap(map)
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
