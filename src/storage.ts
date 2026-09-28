export type EditorTheme = 'dark' | 'light'

export const LANGUAGE_OPTIONS = [
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'csharp', label: 'C#' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'json', label: 'JSON' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'plaintext', label: 'Plain text' },
] as const

export type EditorLanguage = (typeof LANGUAGE_OPTIONS)[number]['id']

const CODE_KEY = 'debug-editor-code'
const THEME_KEY = 'debug-editor-theme'
const LANGUAGE_KEY = 'debug-editor-language'
const FONT_SIZE_KEY = 'debug-editor-font-size'

export const DEFAULT_FONT_SIZE = 16
export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 28

const LANGUAGE_IDS = new Set<string>(LANGUAGE_OPTIONS.map((option) => option.id))

export function loadCode() {
  return localStorage.getItem(CODE_KEY)
}

export function saveCode(code: string) {
  localStorage.setItem(CODE_KEY, code)
}

export function loadTheme(): EditorTheme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
}

export function saveTheme(theme: EditorTheme) {
  localStorage.setItem(THEME_KEY, theme)
}

export function monacoTheme(theme: EditorTheme) {
  return theme === 'light' ? 'vs' : 'vs-dark'
}

export function loadLanguage(): EditorLanguage {
  const stored = localStorage.getItem(LANGUAGE_KEY)
  if (stored && LANGUAGE_IDS.has(stored)) {
    return stored as EditorLanguage
  }

  return 'cpp'
}

export function saveLanguage(language: EditorLanguage) {
  localStorage.setItem(LANGUAGE_KEY, language)
}

export function loadFontSize() {
  const raw = localStorage.getItem(FONT_SIZE_KEY)
  if (!raw) {
    return DEFAULT_FONT_SIZE
  }

  const size = Number(raw)
  if (!Number.isFinite(size)) {
    return DEFAULT_FONT_SIZE
  }

  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)))
}

export function saveFontSize(size: number) {
  localStorage.setItem(FONT_SIZE_KEY, String(size))
}
