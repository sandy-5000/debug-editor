import type { EditorLanguage } from './storage.ts'
import type { Template } from './templates.ts'

/** Original C++ sample from GitHub (not leachim6). */
export const BUILTIN_CPP_GITHUB_TEMPLATE: Template = {
  id: 'builtin-github-main-cpp',
  name: 'main.cpp',
  url: 'https://raw.githubusercontent.com/jasmine-zero/file_explorer/main/main.cpp',
  builtIn: true,
}

export function builtInGithubTemplates(language: EditorLanguage): Template[] {
  return language === 'cpp' ? [BUILTIN_CPP_GITHUB_TEMPLATE] : []
}
