import prettier from 'prettier/standalone'
import * as prettierPluginBabel from 'prettier/plugins/babel'
import * as prettierPluginEstree from 'prettier/plugins/estree'
import * as prettierPluginTypescript from 'prettier/plugins/typescript'
import * as prettierPluginHtml from 'prettier/plugins/html'
import * as prettierPluginPostcss from 'prettier/plugins/postcss'
import * as prettierPluginMarkdown from 'prettier/plugins/markdown'
import type { EditorLanguage } from './storage.ts'

const plugins = [
  prettierPluginBabel,
  prettierPluginEstree,
  prettierPluginTypescript,
  prettierPluginHtml,
  prettierPluginPostcss,
  prettierPluginMarkdown,
]

function parserFor(language: EditorLanguage) {
  switch (language) {
    case 'javascript':
      return 'babel'
    case 'typescript':
      return 'typescript'
    case 'json':
      return 'json'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'markdown':
      return 'markdown'
    default:
      return null
  }
}

export type FormatSourceResult =
  | { status: 'ok'; text: string }
  | { status: 'unsupported' }
  | { status: 'error' }

export async function formatSource(code: string, language: EditorLanguage): Promise<FormatSourceResult> {
  const parser = parserFor(language)
  if (!parser) {
    return { status: 'unsupported' }
  }

  try {
    const text = await prettier.format(code, {
      parser,
      plugins,
      tabWidth: 4,
      useTabs: false,
    })
    return { status: 'ok', text }
  } catch {
    return { status: 'error' }
  }
}
