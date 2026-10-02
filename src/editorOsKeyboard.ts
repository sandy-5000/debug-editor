import type * as monaco from 'monaco-editor'

export function applyEditorOsKeyboardPolicy(
  editor: monaco.editor.IStandaloneCodeEditor,
  blockSystemKeyboard: boolean,
) {
  const root = editor.getContainerDomNode()
  const textarea = root.querySelector('textarea.inputarea') as HTMLTextAreaElement | null

  if ('virtualKeyboardPolicy' in root) {
    ;(root as HTMLElement & { virtualKeyboardPolicy: string }).virtualKeyboardPolicy =
      blockSystemKeyboard ? 'manual' : ''
  }

  if (!textarea) {
    return
  }

  if (blockSystemKeyboard) {
    textarea.inputMode = 'none'
    textarea.readOnly = true
    textarea.autocomplete = 'off'
    textarea.setAttribute('autocorrect', 'off')
    textarea.setAttribute('autocapitalize', 'off')
    textarea.spellcheck = false
  } else {
    textarea.inputMode = 'text'
    textarea.readOnly = false
    textarea.autocomplete = ''
    textarea.removeAttribute('autocorrect')
    textarea.removeAttribute('autocapitalize')
    textarea.spellcheck = true
  }
}

export function attachEditorOsKeyboardPolicy(
  editor: monaco.editor.IStandaloneCodeEditor,
  getBlockSystemKeyboard: () => boolean,
) {
  const root = editor.getContainerDomNode()

  const sync = () => {
    applyEditorOsKeyboardPolicy(editor, getBlockSystemKeyboard())
  }

  sync()

  const onFocus = editor.onDidFocusEditorText(sync)
  const observer = new MutationObserver(sync)
  observer.observe(root, { childList: true, subtree: true })

  return () => {
    onFocus.dispose()
    observer.disconnect()
    applyEditorOsKeyboardPolicy(editor, false)
  }
}
