import type { EditorLanguage } from './storage.ts'

const RUNNABLE: Partial<Record<EditorLanguage, string>> = {
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust',
}

const FILE_NAMES: Partial<Record<EditorLanguage, string>> = {
  cpp: 'main.cpp',
  c: 'main.c',
  csharp: 'Program.cs',
  java: 'Main.java',
  python: 'main.py',
  javascript: 'script.js',
  typescript: 'script.ts',
  go: 'main.go',
  rust: 'main.rs',
}

export function isRunnableLanguage(language: EditorLanguage) {
  return language in RUNNABLE
}

export function oneCompilerLanguage(language: EditorLanguage) {
  return RUNNABLE[language] ?? null
}

export function oneCompilerFileName(language: EditorLanguage) {
  return FILE_NAMES[language] ?? 'main.txt'
}

export function buildEmbedUrl(language: EditorLanguage, theme: 'dark' | 'light') {
  const slug = oneCompilerLanguage(language) ?? 'cpp'
  const params = new URLSearchParams({
    listenToEvents: 'true',
    codeChangeEvent: 'true',
    hideLanguageSelection: 'true',
    hideNew: 'true',
    hideRun: 'true',
    hideResult: 'true',
    hideTitle: 'true',
    hideEditorOptions: 'true',
    hideStdin: 'true',
    theme,
    fontSize: '16',
  })

  return `https://onecompiler.com/embed/${slug}?${params.toString()}`
}

export function formatRunResult(result: unknown) {
  if (result === null || result === undefined) {
    return ''
  }

  if (typeof result === 'string') {
    return result
  }

  if (typeof result !== 'object') {
    return String(result)
  }

  const record = result as Record<string, unknown>
  const chunks: string[] = []

  for (const key of ['stdout', 'stderr', 'output', 'exception', 'compileOutput']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      chunks.push(value.trimEnd())
    }
  }

  if (typeof record.status === 'string' && record.status) {
    chunks.push(`Status: ${record.status}`)
  }

  if (chunks.length > 0) {
    return chunks.join('\n\n')
  }

  return JSON.stringify(result, null, 2)
}

export type OneCompilerCodePayload = {
  language?: string
  files?: { name: string; content: string }[]
  stdin?: string
  result?: unknown
}
