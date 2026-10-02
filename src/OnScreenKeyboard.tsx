import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import * as monaco from 'monaco-editor'

type KeyKind = 'normal' | 'tab' | 'backspace' | 'enter' | 'shift' | 'caps' | 'space' | 'spacer'

type OskKey = {
  key?: string
  label?: string
  kind?: KeyKind
}

type OskRow = {
  indent?: number
  keys: OskKey[]
}

const KEY_LAYOUT: OskRow[] = [
  {
    indent: 1.5,
    keys: [
      { key: '{' },
      { key: '}' },
      { key: ':' },
      { key: '"', label: '"' },
      { key: '<' },
      { key: '>' },
      { key: '?' },
      { key: '|' },
      { kind: 'spacer' },
    ],
  },
  {
    keys: [
      { key: '~' },
      { key: '!' },
      { key: '@' },
      { key: '#' },
      { key: '$' },
      { key: '%' },
      { key: '^' },
      { key: '&' },
      { key: '*' },
      { key: '(' },
      { key: ')' },
      { key: '_' },
      { key: '+' },
      { kind: 'spacer' },
    ],
  },
  {
    keys: [
      { key: '`' },
      { key: '1' },
      { key: '2' },
      { key: '3' },
      { key: '4' },
      { key: '5' },
      { key: '6' },
      { key: '7' },
      { key: '8' },
      { key: '9' },
      { key: '0' },
      { key: '-' },
      { key: '=' },
      { key: 'Backspace', kind: 'backspace', label: 'BS' },
    ],
  },
  {
    keys: [
      { key: 'Tab', kind: 'tab' },
      { key: 'q' },
      { key: 'w' },
      { key: 'e' },
      { key: 'r' },
      { key: 't' },
      { key: 'y' },
      { key: 'u' },
      { key: 'i' },
      { key: 'o' },
      { key: 'p' },
      { key: '[' },
      { key: ']' },
      { key: '\\' },
    ],
  },
  {
    keys: [
      { key: 'CapsLock', kind: 'caps', label: 'Caps' },
      { key: 'a' },
      { key: 's' },
      { key: 'd' },
      { key: 'f' },
      { key: 'g' },
      { key: 'h' },
      { key: 'j' },
      { key: 'k' },
      { key: 'l' },
      { key: ';' },
      { key: "'" },
      { key: 'Enter', kind: 'enter' },
    ],
  },
  {
    indent: 1,
    keys: [
      { key: 'Shift', kind: 'shift' },
      { key: 'z' },
      { key: 'x' },
      { key: 'c' },
      { key: 'v' },
      { key: 'b' },
      { key: 'n' },
      { key: 'm' },
      { key: ',' },
      { key: '.' },
      { key: '/' },
      { key: 'Shift', kind: 'shift' },
    ],
  },
  {
    keys: [{ key: 'Space', kind: 'space', label: '␣' }],
  },
]

type OnScreenKeyboardProps = {
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null
}

function letterText(key: string, shiftHeld: boolean, capsLock: boolean) {
  if (key.length !== 1 || key < 'a' || key > 'z') {
    return key
  }

  const uppercase = capsLock !== shiftHeld
  return uppercase ? key.toUpperCase() : key
}

function sendKey(
  editor: monaco.editor.IStandaloneCodeEditor,
  key: string,
  shiftHeld: boolean,
  capsLock: boolean,
) {
  editor.focus()

  if (key === 'Backspace') {
    editor.trigger('on-screen-keyboard', 'deleteLeft', null)
    return
  }

  if (key === 'Tab') {
    editor.trigger('on-screen-keyboard', 'tab', null)
    return
  }

  if (key === 'Enter') {
    editor.trigger('on-screen-keyboard', 'type', { text: '\n' })
    return
  }

  if (key === 'Space') {
    editor.trigger('on-screen-keyboard', 'type', { text: ' ' })
    return
  }

  if (key === 'Shift' || key === 'CapsLock') {
    return
  }

  const text = letterText(key, shiftHeld, capsLock)
  editor.trigger('on-screen-keyboard', 'type', { text })
}

function keyClass(kind: KeyKind | undefined) {
  switch (kind) {
    case 'tab':
      return 'osk-key osk-key-tab'
    case 'backspace':
      return 'osk-key osk-key-backspace'
    case 'enter':
      return 'osk-key osk-key-enter'
    case 'shift':
      return 'osk-key osk-key-shift'
    case 'caps':
      return 'osk-key osk-key-caps'
    case 'space':
      return 'osk-key osk-key-space'
    case 'spacer':
      return 'osk-key-spacer'
    default:
      return 'osk-key'
  }
}

export function OnScreenKeyboard({ getEditor }: OnScreenKeyboardProps) {
  const shiftHeldRef = useRef(false)
  const capsLockRef = useRef(false)

  const onKeyPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    event.preventDefault()
    const editor = getEditor()
    if (!editor) {
      return
    }

    if (key === 'CapsLock') {
      capsLockRef.current = !capsLockRef.current
      event.currentTarget.classList.toggle('is-active', capsLockRef.current)
      event.currentTarget.setAttribute('aria-pressed', capsLockRef.current ? 'true' : 'false')
      return
    }

    if (key === 'Shift') {
      shiftHeldRef.current = !shiftHeldRef.current
      event.currentTarget.classList.toggle('is-active', shiftHeldRef.current)
      return
    }

    sendKey(editor, key, shiftHeldRef.current, capsLockRef.current)
    if (shiftHeldRef.current && key !== 'Shift') {
      shiftHeldRef.current = false
      document.querySelectorAll('.osk-key-shift.is-active').forEach((node) => {
        node.classList.remove('is-active')
      })
    }
  }

  return (
    <div className="on-screen-keyboard" role="group" aria-label="On-screen keyboard">
      {KEY_LAYOUT.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="on-screen-keyboard-row"
          style={
            row.indent
              ? { paddingLeft: `calc(var(--osk-unit) * ${row.indent} + var(--osk-gap) * ${row.indent})` }
              : undefined
          }
        >
          {row.keys.map((item, keyIndex) => {
            if (item.kind === 'spacer') {
              return (
                <span
                  key={`${rowIndex}-${keyIndex}-spacer`}
                  className="osk-key-spacer"
                  aria-hidden
                />
              )
            }

            const key = item.key ?? ''
            return (
              <button
                key={`${rowIndex}-${keyIndex}-${key}`}
                type="button"
                className={keyClass(item.kind)}
                tabIndex={-1}
                aria-pressed={item.kind === 'caps' ? false : undefined}
                onPointerDown={(event) => onKeyPointerDown(event, key)}
              >
                {item.label ?? key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
