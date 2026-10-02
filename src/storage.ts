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

const CODE_BY_LANG_KEY = 'debug-editor-code-by-lang'
const LEGACY_CODE_KEY = 'debug-editor-code'
const THEME_KEY = 'debug-editor-theme'
const LANGUAGE_KEY = 'debug-editor-language'
const FONT_SIZE_KEY = 'debug-editor-font-size'
const ARROW_KEYS_KEY = 'debug-editor-arrow-keys'
const ARROW_KEYS_PLACEMENT_KEY = 'debug-editor-arrow-keys-placement'
const ARROW_KEYS_STYLE_KEY = 'debug-editor-arrow-keys-style'
const BLOCK_OS_KEYBOARD_KEY = 'debug-editor-block-os-keyboard'

export type ArrowKeysPlacement = 'bottom' | 'top'
export type ArrowKeysStyle = 'dpad' | 'joystick'

export const DEFAULT_FONT_SIZE = 16
export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 28

const LANGUAGE_IDS = new Set<string>(LANGUAGE_OPTIONS.map((option) => option.id))

let legacyCodeMigrated = false

function readCodeMap(): Partial<Record<EditorLanguage, string>> {
  const raw = localStorage.getItem(CODE_BY_LANG_KEY)
  if (!raw) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    const map: Partial<Record<EditorLanguage, string>> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (LANGUAGE_IDS.has(key) && typeof value === 'string') {
        map[key as EditorLanguage] = value
      }
    }
    return map
  } catch {
    return {}
  }
}

function writeCodeMap(map: Partial<Record<EditorLanguage, string>>) {
  localStorage.setItem(CODE_BY_LANG_KEY, JSON.stringify(map))
}

function migrateLegacyCode() {
  if (legacyCodeMigrated) {
    return
  }
  legacyCodeMigrated = true

  const legacy = localStorage.getItem(LEGACY_CODE_KEY)
  if (!legacy) {
    return
  }

  const map = readCodeMap()
  if (map.cpp === undefined) {
    map.cpp = legacy
    writeCodeMap(map)
  }
  localStorage.removeItem(LEGACY_CODE_KEY)
}

export function loadCode(language: EditorLanguage) {
  migrateLegacyCode()
  const map = readCodeMap()
  return map[language] ?? null
}

export function saveCode(code: string, language: EditorLanguage) {
  migrateLegacyCode()
  const map = readCodeMap()
  map[language] = code
  writeCodeMap(map)
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

export function loadArrowKeysVisible() {
  return localStorage.getItem(ARROW_KEYS_KEY) !== 'false'
}

export function saveArrowKeysVisible(visible: boolean) {
  localStorage.setItem(ARROW_KEYS_KEY, visible ? 'true' : 'false')
}

export function loadArrowKeysPlacement(): ArrowKeysPlacement {
  return localStorage.getItem(ARROW_KEYS_PLACEMENT_KEY) === 'top' ? 'top' : 'bottom'
}

export function saveArrowKeysPlacement(placement: ArrowKeysPlacement) {
  localStorage.setItem(ARROW_KEYS_PLACEMENT_KEY, placement)
}

export function loadArrowKeysStyle(): ArrowKeysStyle {
  return localStorage.getItem(ARROW_KEYS_STYLE_KEY) === 'joystick' ? 'joystick' : 'dpad'
}

export function saveArrowKeysStyle(style: ArrowKeysStyle) {
  localStorage.setItem(ARROW_KEYS_STYLE_KEY, style)
}

export function loadBlockOsKeyboard() {
  return localStorage.getItem(BLOCK_OS_KEYBOARD_KEY) === 'true'
}

export function saveBlockOsKeyboard(block: boolean) {
  localStorage.setItem(BLOCK_OS_KEYBOARD_KEY, block ? 'true' : 'false')
}
