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
