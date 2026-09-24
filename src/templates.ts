export type Template = {
  id: string
  name: string
  url: string
  builtIn?: boolean
}

export const EXAMPLE_TEMPLATE: Template = {
  id: 'example-main-cpp',
  name: 'main.cpp',
  url: 'https://raw.githubusercontent.com/jasmine-zero/file_explorer/main/main.cpp',
  builtIn: true,
}

const STORAGE_KEY = 'debug-editor-templates'

export function nameFromUrl(url: string) {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop()
    return last ? decodeURIComponent(last) : url
  } catch {
    return url
  }
}

export function loadUserTemplates(): Template[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is Template => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Template).id === 'string' &&
        typeof (item as Template).name === 'string' &&
        typeof (item as Template).url === 'string'
      )
    })
  } catch {
    return []
  }
}

export function saveUserTemplates(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
