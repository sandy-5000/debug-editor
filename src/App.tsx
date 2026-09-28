import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import type { IconType } from 'react-icons'
import {
  FiAlertCircle,
  FiAlignLeft,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiCopy,
  FiFolder,
  FiHelpCircle,
  FiLayers,
  FiLink,
  FiMinus,
  FiPlay,
  FiPlus,
  FiMoon,
  FiSettings,
  FiSun,
  FiTerminal,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker'
import {
  LANGUAGE_OPTIONS,
  loadArrowKeysPlacement,
  loadArrowKeysVisible,
  loadCode,
  loadFontSize,
  loadLanguage,
  loadTheme,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  monacoTheme,
  saveArrowKeysPlacement,
  saveArrowKeysVisible,
  type ArrowKeysPlacement,
  saveCode,
  saveFontSize,
  saveLanguage,
  saveTheme,
  type EditorLanguage,
  type EditorTheme,
} from './storage.ts'
import {
  getBuiltInTemplates,
  isHttpUrl,
  loadTemplateContent,
  loadUserTemplates,
  nameFromUrl,
  saveUserTemplates,
  templateSubtitle,
  type Template,
} from './templates.ts'
import {
  buildEmbedUrl,
  formatRunResult,
  isRunnableLanguage,
  oneCompilerFileName,
  oneCompilerLanguage,
  type OneCompilerCodePayload,
} from './onecompiler.ts'
import { prepareCppCodeForRun } from './cppRunner.ts'
import { formatSource } from './formatCode.ts'

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    switch (label) {
      case 'json':
        return new jsonWorker()
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker()
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker()
      case 'typescript':
      case 'javascript':
        return new tsWorker()
      default:
        return new editorWorker()
    }
  },
}

const INITIAL_VALUE = `#include <iostream>
#include <string>

std::string greet(const std::string& name) {
  return "Hello, " + name;
}

int main() {
  std::cout << greet("Monaco") << std::endl;
  return 0;
}
`

function defaultCodeForLanguage(language: EditorLanguage) {
  return language === 'cpp' ? INITIAL_VALUE : ''
}

function codeForLanguage(language: EditorLanguage) {
  return loadCode(language) ?? defaultCodeForLanguage(language)
}

type PanelId = 'templates' | 'settings' | 'links' | 'files' | 'help'

const PANEL_ITEMS: { id: PanelId; label: string; icon: IconType }[] = [
  { id: 'templates', label: 'Templates', icon: FiLayers },
  { id: 'settings', label: 'Settings', icon: FiSettings },
  { id: 'links', label: 'Links', icon: FiLink },
  { id: 'files', label: 'Files', icon: FiFolder },
  { id: 'help', label: 'Help', icon: FiHelpCircle },
]

function TemplatesPanel({
  templates,
  applyingId,
  status,
  onAdd,
  onRemove,
  onApply,
}: {
  templates: Template[]
  applyingId: string | null
  status: string | null
  onAdd: (name: string, url: string) => string | null
  onRemove: (id: string) => void
  onApply: (template: Template) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    const error = onAdd(name, url)
    if (error) {
      setFormError(error)
      return
    }

    setName('')
    setUrl('')
    setFormError(null)
  }

  return (
    <>
      <h2>Templates</h2>
      <p>Tap a template to replace the editor. You will be asked first, and your current code is saved.</p>

      <ul className="template-list">
        {templates.map((template) => (
          <li key={template.id} className="template-item">
            <button
              type="button"
              className="template-apply"
              disabled={applyingId === template.id}
              onClick={() => onApply(template)}
            >
              <span className="template-name">{template.name}</span>
              <span className="template-url">{templateSubtitle(template)}</span>
            </button>
            {template.builtIn ? null : (
              <button
                type="button"
                className="template-delete"
                aria-label={`Remove ${template.name}`}
                onClick={() => onRemove(template.id)}
              >
                <FiTrash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <form className="template-form" onSubmit={handleAdd}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="main.cpp"
          />
        </label>
        <label>
          Git raw link
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://raw.githubusercontent.com/..."
          />
        </label>
        <button type="submit" className="template-add">
          <FiPlus size={16} />
          Add template
        </button>
        {formError ? <p className="template-status error">{formError}</p> : null}
        {status ? <p className="template-status">{status}</p> : null}
      </form>
    </>
  )
}

function PanelContent({
  panel,
  theme,
  language,
  fontSize,
  onThemeChange,
  onLanguageChange,
  onFontSizeChange,
  arrowKeysVisible,
  onArrowKeysVisibleChange,
  arrowKeysPlacement,
  onArrowKeysPlacementChange,
  onRequestClearCode,
}: {
  panel: PanelId
  theme: EditorTheme
  language: EditorLanguage
  fontSize: number
  onThemeChange: (theme: EditorTheme) => void
  onLanguageChange: (language: EditorLanguage) => void
  onFontSizeChange: (size: number) => void
  arrowKeysVisible: boolean
  onArrowKeysVisibleChange: (visible: boolean) => void
  arrowKeysPlacement: ArrowKeysPlacement
  onArrowKeysPlacementChange: (placement: ArrowKeysPlacement) => void
  onRequestClearCode: () => void
}) {
  if (panel === 'settings') {
    const languageLabel = LANGUAGE_OPTIONS.find((option) => option.id === language)?.label ?? language

    return (
      <div className="settings-panel">
        <h2>Settings</h2>
        <section className="settings-section" aria-labelledby="settings-editor-heading">
          <h3 id="settings-editor-heading" className="settings-section-title">Editor</h3>
          <div className="settings-row">
            <label className="settings-row-label" htmlFor="settings-language">
              Language
            </label>
            <p className="settings-row-hint" id="settings-language-hint">
              Controls highlighting and which runtimes can execute your code. Currently{' '}
              <strong>{languageLabel}</strong>.
            </p>
            <div className="settings-row-options settings-select-wrap">
              <select
                id="settings-language"
                className="settings-select"
                value={language}
                aria-describedby="settings-language-hint"
                onChange={(event) => onLanguageChange(event.target.value as EditorLanguage)}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="settings-select-chevron" aria-hidden />
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-appearance-heading">
          <h3 id="settings-appearance-heading" className="settings-section-title">Appearance</h3>

          <div className="settings-row">
            <span className="settings-row-label">Font size</span>
            <p className="settings-row-hint">
              Text size in the editor ({MIN_FONT_SIZE}–{MAX_FONT_SIZE}px). Saved for your next visit.
            </p>
            <div className="settings-row-options font-size-control">
              <button
                type="button"
                className="font-size-step"
                aria-label="Decrease font size"
                disabled={fontSize <= MIN_FONT_SIZE}
                onClick={() => onFontSizeChange(Math.max(MIN_FONT_SIZE, fontSize - 1))}
              >
                <FiMinus aria-hidden />
              </button>
              <span className="font-size-value" aria-live="polite">
                {fontSize}px
              </span>
              <button
                type="button"
                className="font-size-step"
                aria-label="Increase font size"
                disabled={fontSize >= MAX_FONT_SIZE}
                onClick={() => onFontSizeChange(Math.min(MAX_FONT_SIZE, fontSize + 1))}
              >
                <FiPlus aria-hidden />
              </button>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Theme</span>
            <p className="settings-row-hint">
              {theme === 'dark'
                ? 'Dark mode reduces glare in low light.'
                : 'Light mode improves contrast in bright environments.'}
            </p>
            <div className="settings-row-options">
            <button
              type="button"
              className={`theme-slider${theme === 'dark' ? ' is-dark' : ''}`}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label={theme === 'dark' ? 'Dark theme on' : 'Light theme on'}
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            >
              <span className="theme-slider-track">
                <FiSun className="theme-slider-icon theme-slider-icon-sun" aria-hidden />
                <FiMoon className="theme-slider-icon theme-slider-icon-moon" aria-hidden />
                <span className="theme-slider-thumb" aria-hidden>
                  {theme === 'dark' ? <FiMoon /> : <FiSun />}
                </span>
              </span>
            </button>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">On-screen arrow keys</span>
            <p className="settings-row-hint">
              {arrowKeysVisible
                ? `Pad on the ${arrowKeysPlacement} right, over the minimap.`
                : 'Off—use a keyboard or turn on for touch.'}
            </p>
            <div className="settings-row-options settings-arrow-controls">
              <button
                type="button"
                className={`settings-visibility-toggle${arrowKeysVisible ? ' is-on' : ''}`}
                role="switch"
                aria-checked={arrowKeysVisible}
                aria-label={arrowKeysVisible ? 'Arrow keys visible' : 'Arrow keys hidden'}
                onClick={() => onArrowKeysVisibleChange(!arrowKeysVisible)}
              >
                <span className="settings-visibility-track">
                  <span className="settings-visibility-thumb" />
                </span>
                <span className="settings-visibility-label">
                  {arrowKeysVisible ? 'On' : 'Off'}
                </span>
              </button>
              <div
                className={`settings-placement-toggle${arrowKeysVisible ? '' : ' is-disabled'}`}
                role="group"
                aria-label="Arrow keys corner"
              >
                <button
                  type="button"
                  className={`settings-placement-option${arrowKeysPlacement === 'top' ? ' active' : ''}`}
                  disabled={!arrowKeysVisible}
                  aria-label="Top right"
                  aria-pressed={arrowKeysPlacement === 'top'}
                  onClick={() => onArrowKeysPlacementChange('top')}
                >
                  Top
                </button>
                <button
                  type="button"
                  className={`settings-placement-option${arrowKeysPlacement === 'bottom' ? ' active' : ''}`}
                  disabled={!arrowKeysVisible}
                  aria-label="Bottom right"
                  aria-pressed={arrowKeysPlacement === 'bottom'}
                  onClick={() => onArrowKeysPlacementChange('bottom')}
                >
                  Bottom
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section settings-section-danger" aria-labelledby="settings-storage-heading">
          <h3 id="settings-storage-heading" className="settings-section-title">Storage</h3>
          <p className="settings-row-hint">
            Code is auto-saved locally as you type. Clear all wipes the editor and removes that saved
            copy from this device—it cannot be undone.
          </p>
          <button type="button" className="settings-clear-button" onClick={onRequestClearCode}>
            Clear all code
          </button>
        </section>
      </div>
    )
  }

  if (panel === 'links') {
    return (
      <>
        <h2>Links</h2>
        <ul className="panel-links">
          <li>
            <a href="https://microsoft.github.io/monaco-editor/" target="_blank" rel="noreferrer">
              Monaco Editor
            </a>
          </li>
          <li>
            <a href="https://en.cppreference.com/w/" target="_blank" rel="noreferrer">
              C++ reference
            </a>
          </li>
          <li>
            <a href="https://onecompiler.com/apis/embed-editor" target="_blank" rel="noreferrer">
              OneCompiler embed API
            </a>
          </li>
        </ul>
      </>
    )
  }

  if (panel === 'files') {
    return (
      <>
        <h2>Files</h2>
        <p>File system support will be added in a future update.</p>
      </>
    )
  }

  return (
    <>
      <h2>Help</h2>
      <p>
        Use the on-screen arrow pad on the editor minimap or a keyboard to move the cursor. Format
        code from the sidebar or with Shift+Alt+F (Option+Shift+F on Mac). Open Output to run code
        and see results. Templates replace the editor after you confirm.
      </p>
    </>
  )
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const runnerRef = useRef<HTMLIFrameElement>(null)
  const repeatRef = useRef<number | null>(null)
  const delayRef = useRef<number | null>(null)
  const awaitingRunRef = useRef(false)
  const pendingRunRef = useRef(false)
  const runTriggerTimeoutRef = useRef<number | null>(null)
  const runTimeoutRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const saveLocallyRef = useRef<() => void>(() => {})
  const runCodeRef = useRef<() => void>(() => {})
  const formatDocumentRef = useRef<() => void>(() => {})
  const languageRef = useRef<EditorLanguage>(loadLanguage())
  const languageSwitchReadyRef = useRef(false)
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null)
  const [userTemplates, setUserTemplates] = useState(() => loadUserTemplates(loadLanguage()))
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [templateStatus, setTemplateStatus] = useState<string | null>(null)
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null)
  const [pendingClear, setPendingClear] = useState(false)
  const [theme, setTheme] = useState<EditorTheme>(loadTheme)
  const [language, setLanguage] = useState<EditorLanguage>(loadLanguage)
  const [fontSize, setFontSize] = useState(loadFontSize)
  const [arrowKeysVisible, setArrowKeysVisible] = useState(loadArrowKeysVisible)
  const [arrowKeysPlacement, setArrowKeysPlacement] = useState(loadArrowKeysPlacement)
  const [outputOpen, setOutputOpen] = useState(false)
  const [outputText, setOutputText] = useState('Run your code to see output here.')
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [runnerReady, setRunnerReady] = useState(false)
  const [runnerKey, setRunnerKey] = useState(0)
  const [toast, setToast] = useState<'save' | 'copy' | 'copy-error' | 'format-error' | null>(
    null,
  )
  const templates = useMemo(() => {
    return [...getBuiltInTemplates(language), ...userTemplates]
  }, [language, userTemplates])
  const embedUrl = useMemo(
    () => buildEmbedUrl(language, theme === 'dark' ? 'dark' : 'light', fontSize),
    [language, theme, fontSize],
  )

  const showToast = useCallback((kind: 'save' | 'copy' | 'copy-error' | 'format-error') => {
    setToast(kind)
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 2500)
  }, [])

  const saveEditorLocally = useCallback(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }
    saveCode(editor.getValue(), languageRef.current)
    showToast('save')
  }, [showToast])

  saveLocallyRef.current = saveEditorLocally

  languageRef.current = language

  const changeLanguage = useCallback(
    (next: EditorLanguage) => {
      if (next === language) {
        return
      }

      const editor = editorRef.current
      if (editor) {
        saveCode(editor.getValue(), language)
      }

      setLanguage(next)
    },
    [language],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const initialLanguage = loadLanguage()
    const editor = monaco.editor.create(container, {
      value: codeForLanguage(initialLanguage),
      language: initialLanguage,
      theme: monacoTheme(loadTheme()),
      automaticLayout: true,
      fontSize: loadFontSize(),
      tabSize: 4,
      insertSpaces: true,
      detectIndentation: false,
      minimap: { enabled: true },
      padding: { top: 12 },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
    })

    saveCode(editor.getValue(), initialLanguage)
    const persist = editor.onDidChangeModelContent(() => {
      saveCode(editor.getValue(), languageRef.current)
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveLocallyRef.current()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Semicolon, () => {
      runCodeRef.current()
    })

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      formatDocumentRef.current()
    })

    editorRef.current = editor

    return () => {
      persist.dispose()
      editorRef.current = null
      editor.dispose()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        formatDocumentRef.current()
        return
      }

      if (!(event.ctrlKey || event.metaKey)) {
        return
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveLocallyRef.current()
        return
      }

      if (event.key === ';' || event.code === 'Semicolon') {
        event.preventDefault()
        runCodeRef.current()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    monaco.editor.setTheme(monacoTheme(theme))
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    setUserTemplates(loadUserTemplates(language))
  }, [language])

  useEffect(() => {
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!editor || !model) {
      return
    }

    monaco.editor.setModelLanguage(model, language)
    saveLanguage(language)

    if (!languageSwitchReadyRef.current) {
      languageSwitchReadyRef.current = true
      return
    }

    editor.setValue(codeForLanguage(language))
  }, [language])

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize })
    saveFontSize(fontSize)
  }, [fontSize])

  useEffect(() => {
    saveArrowKeysVisible(arrowKeysVisible)
  }, [arrowKeysVisible])

  useEffect(() => {
    saveArrowKeysPlacement(arrowKeysPlacement)
  }, [arrowKeysPlacement])

  const focusEditor = () => {
    editorRef.current?.focus()
  }

  const stopCursorRepeat = () => {
    if (delayRef.current !== null) {
      window.clearTimeout(delayRef.current)
      delayRef.current = null
    }

    if (repeatRef.current !== null) {
      window.clearInterval(repeatRef.current)
      repeatRef.current = null
    }

    focusEditor()
  }

  type CursorDirection = 'up' | 'down' | 'left' | 'right'

  const cursorCommand: Record<CursorDirection, string> = {
    up: 'cursorUp',
    down: 'cursorDown',
    left: 'cursorLeft',
    right: 'cursorRight',
  }

  const moveCursor = (direction: CursorDirection) => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    editor.focus()
    editor.trigger('keyboard', cursorCommand[direction], null)
  }

  const startCursorRepeat = (direction: CursorDirection) => {
    if (delayRef.current !== null) {
      window.clearTimeout(delayRef.current)
      delayRef.current = null
    }

    if (repeatRef.current !== null) {
      window.clearInterval(repeatRef.current)
      repeatRef.current = null
    }

    moveCursor(direction)
    delayRef.current = window.setTimeout(() => {
      delayRef.current = null
      repeatRef.current = window.setInterval(() => {
        moveCursor(direction)
      }, 80)
    }, 400)
  }

  const bindCursorPad = (direction: CursorDirection) => ({
    onPointerDown: (event: PointerEvent) => {
      event.preventDefault()
      startCursorRepeat(direction)
    },
    onPointerUp: stopCursorRepeat,
    onPointerLeave: stopCursorRepeat,
    onPointerCancel: stopCursorRepeat,
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  })

  useEffect(() => {
    return () => {
      stopCursorRepeat()
    }
  }, [])

  const clearRunTimers = () => {
    if (runTriggerTimeoutRef.current !== null) {
      window.clearTimeout(runTriggerTimeoutRef.current)
      runTriggerTimeoutRef.current = null
    }

    if (runTimeoutRef.current !== null) {
      window.clearTimeout(runTimeoutRef.current)
      runTimeoutRef.current = null
    }
  }

  const cancelRun = useCallback(() => {
    clearRunTimers()
    awaitingRunRef.current = false
    pendingRunRef.current = false
    setRunning(false)
    setOutputText('Run cancelled.')
    setRunnerReady(false)
    setRunnerKey((key) => key + 1)
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://onecompiler.com') {
        return
      }

      const data = event.data as OneCompilerCodePayload | undefined
      if (!data || typeof data !== 'object') {
        return
      }

      if (
        awaitingRunRef.current &&
        data.result !== undefined &&
        data.result !== null
      ) {
        clearRunTimers()
        setOutputText(formatRunResult(data.result) || 'Program finished with no output.')
        setRunning(false)
        awaitingRunRef.current = false
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      if (pendingTemplate) {
        setPendingTemplate(null)
        return
      }

      if (pendingClear) {
        setPendingClear(false)
        return
      }

      if (outputOpen && running) {
        cancelRun()
        return
      }

      if (outputOpen) {
        setOutputOpen(false)
        return
      }

      if (openPanel) {
        setOpenPanel(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openPanel, pendingTemplate, pendingClear, outputOpen, running, cancelRun])

  const runCode = useCallback(() => {
    setOpenPanel(null)
    setOutputOpen(true)

    if (!isRunnableLanguage(language)) {
      setOutputText('This language cannot be run. Switch to C++, Python, Java, and similar in Settings.')
      setRunning(false)
      return
    }

    const ocLanguage = oneCompilerLanguage(language)
    const editor = editorRef.current
    const frame = runnerRef.current

    if (!ocLanguage || !editor || !frame?.contentWindow) {
      setOutputText('Runner is not ready yet. Try again in a moment.')
      return
    }

    if (!runnerReady) {
      pendingRunRef.current = true
      setOutputText('Loading runner...')
      setRunning(true)
      return
    }

    clearRunTimers()
    setRunning(true)
    setOutputText('Running...')
    awaitingRunRef.current = true

    const source = editor.getValue()
    const content = language === 'cpp' ? prepareCppCodeForRun(source, stdin) : source

    frame.contentWindow.postMessage(
      {
        eventType: 'populateCode',
        language: ocLanguage,
        files: [
          {
            name: oneCompilerFileName(language),
            content,
          },
        ],
      },
      '*',
    )

    runTriggerTimeoutRef.current = window.setTimeout(() => {
      runTriggerTimeoutRef.current = null
      frame.contentWindow?.postMessage({ eventType: 'triggerRun' }, '*')
    }, 350)

    runTimeoutRef.current = window.setTimeout(() => {
      runTimeoutRef.current = null
      if (!awaitingRunRef.current) {
        return
      }
      setRunning(false)
      awaitingRunRef.current = false
      setOutputText((current) =>
        current === 'Running...'
          ? 'No output received. The program may still be running, or this language needs more time.'
          : current,
      )
    }, 30000)
  }, [language, runnerReady, stdin])

  runCodeRef.current = () => {
    if (running) {
      return
    }
    runCode()
  }

  useEffect(() => {
    setRunnerReady(false)
    pendingRunRef.current = false
  }, [embedUrl])

  useEffect(() => {
    if (!runnerReady || !pendingRunRef.current) {
      return
    }
    pendingRunRef.current = false
    runCode()
  }, [runnerReady, runCode])

  const formatEditorCode = useCallback(async () => {
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!editor || !model) {
      return
    }

    const result = await formatSource(model.getValue(), language)
    if (result.status === 'unsupported') {
      return
    }
    if (result.status === 'error') {
      showToast('format-error')
      return
    }
    if (result.text === model.getValue()) {
      return
    }

    const fullRange = model.getFullModelRange()
    editor.pushUndoStop()
    editor.executeEdits('format', [{ range: fullRange, text: result.text }])
    editor.pushUndoStop()
    saveCode(editor.getValue(), language)
  }, [language, showToast])

  formatDocumentRef.current = formatEditorCode

  const copyEditorCode = async () => {
    const code = editorRef.current?.getValue() ?? ''

    try {
      await navigator.clipboard.writeText(code)
      showToast('copy')
    } catch {
      showToast('copy-error')
    }
  }

  const toggleOutput = () => {
    if (outputOpen) {
      setOutputOpen(false)
      return
    }

    setOpenPanel(null)
    setOutputOpen(true)
  }

  const togglePanel = (id: PanelId) => {
    if (openPanel === id) {
      setOpenPanel(null)
      return
    }

    setOutputOpen(false)
    setOpenPanel(id)
  }

  const addTemplate = (name: string, url: string) => {
    const trimmedUrl = url.trim()
    if (!isHttpUrl(trimmedUrl)) {
      return 'Enter a valid http or https raw link.'
    }

    if (templates.some((template) => template.url === trimmedUrl)) {
      return 'That template link is already saved.'
    }

    const template: Template = {
      id: crypto.randomUUID(),
      name: name.trim() || nameFromUrl(trimmedUrl),
      url: trimmedUrl,
    }

    setUserTemplates((current) => {
      const next = [...current, template]
      saveUserTemplates(next, language)
      return next
    })
    setTemplateStatus(`Saved ${template.name}`)
    return null
  }

  const removeTemplate = (id: string) => {
    setUserTemplates((current) => {
      const next = current.filter((template) => template.id !== id)
      saveUserTemplates(next, language)
      return next
    })
    setTemplateStatus('Template removed')
  }

  const requestApplyTemplate = (template: Template) => {
    setPendingTemplate(template)
  }

  const cancelApplyTemplate = () => {
    setPendingTemplate(null)
  }

  const requestClearCode = () => {
    setPendingClear(true)
  }

  const cancelClearCode = () => {
    setPendingClear(false)
  }

  const confirmClearCode = () => {
    const editor = editorRef.current
    if (editor) {
      editor.setValue('')
      saveCode('', language)
      editor.focus()
    }
    setPendingClear(false)
  }

  const confirmApplyTemplate = async () => {
    const template = pendingTemplate
    if (!template) {
      return
    }

    const editor = editorRef.current
    if (editor) {
      saveCode(editor.getValue(), language)
    }

    setPendingTemplate(null)
    setApplyingId(template.id)
    setTemplateStatus(`Loading ${template.name}...`)

    try {
      const text = await loadTemplateContent(template)
      editorRef.current?.setValue(text)
      setTemplateStatus(`Loaded ${template.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load template'
      setTemplateStatus(message)
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div className="page" data-theme={theme}>
      <div
        className={`app-toast${toast ? ' visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast === 'save' ? (
          <>
            <FiCheckCircle className="app-toast-icon" size={26} aria-hidden />
            <div className="app-toast-body">
              <p className="app-toast-title">Saved to this browser</p>
              <p className="app-toast-detail">
                Your code is stored on this device, not on a server.
              </p>
            </div>
          </>
        ) : null}
        {toast === 'copy' ? (
          <>
            <FiCopy className="app-toast-icon" size={26} aria-hidden />
            <div className="app-toast-body">
              <p className="app-toast-title">Copied to clipboard</p>
              <p className="app-toast-detail">Paste your code anywhere with Ctrl+V (Cmd+V on Mac).</p>
            </div>
          </>
        ) : null}
        {toast === 'copy-error' ? (
          <>
            <FiAlertCircle className="app-toast-icon app-toast-icon-error" size={26} aria-hidden />
            <div className="app-toast-body">
              <p className="app-toast-title">Could not copy</p>
              <p className="app-toast-detail">Your browser blocked clipboard access. Try selecting the code manually.</p>
            </div>
          </>
        ) : null}
        {toast === 'format-error' ? (
          <>
            <FiAlertCircle className="app-toast-icon app-toast-icon-error" size={26} aria-hidden />
            <div className="app-toast-body">
              <p className="app-toast-title">Cannot format</p>
              <p className="app-toast-detail">
                Fix syntax errors in your code, then try again. C++ and similar languages are not
                supported yet.
              </p>
            </div>
          </>
        ) : null}
      </div>
      <iframe
        key={runnerKey}
        ref={runnerRef}
        title="OneCompiler runner"
        className="oc-runner"
        src={embedUrl}
        onLoad={() => setRunnerReady(true)}
      />
      <div className="editor-shell">
        <div ref={containerRef} className="editor" />
        {arrowKeysVisible ? (
          <div
            className={`cursor-pad cursor-pad-${arrowKeysPlacement}`}
            aria-label="Cursor keys"
          >
            <div className="cursor-pad-grid">
              <button
                type="button"
                className="cursor-pad-button cursor-pad-up"
                tabIndex={-1}
                aria-label="Move cursor up"
                {...bindCursorPad('up')}
              >
                <FiChevronUp size={20} />
              </button>
              <button
                type="button"
                className="cursor-pad-button cursor-pad-left"
                tabIndex={-1}
                aria-label="Move cursor left"
                {...bindCursorPad('left')}
              >
                <FiChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="cursor-pad-button cursor-pad-down"
                tabIndex={-1}
                aria-label="Move cursor down"
                {...bindCursorPad('down')}
              >
                <FiChevronDown size={20} />
              </button>
              <button
                type="button"
                className="cursor-pad-button cursor-pad-right"
                tabIndex={-1}
                aria-label="Move cursor right"
                {...bindCursorPad('right')}
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`panel-backdrop${openPanel ? ' open' : ''}`}
        onClick={() => setOpenPanel(null)}
      />

      <aside
        className={`side-panel${openPanel ? ' open' : ''}${openPanel === 'settings' ? ' side-panel-settings' : ''}`}
        role="dialog"
        aria-modal={openPanel ? true : undefined}
        aria-hidden={!openPanel}
        aria-label={openPanel ? PANEL_ITEMS.find((item) => item.id === openPanel)?.label : 'Panel'}
      >
        {openPanel ? (
          <>
            <button
              type="button"
              className="panel-close"
              onClick={() => setOpenPanel(null)}
              aria-label="Close panel"
            >
              <FiX size={18} />
            </button>
            {openPanel === 'templates' ? (
              <TemplatesPanel
                templates={templates}
                applyingId={applyingId}
                status={templateStatus}
                onAdd={addTemplate}
                onRemove={removeTemplate}
                onApply={requestApplyTemplate}
              />
            ) : (
              <PanelContent
                panel={openPanel}
                theme={theme}
                language={language}
                fontSize={fontSize}
                onThemeChange={setTheme}
                onLanguageChange={changeLanguage}
                onFontSizeChange={setFontSize}
                arrowKeysVisible={arrowKeysVisible}
                onArrowKeysVisibleChange={setArrowKeysVisible}
                arrowKeysPlacement={arrowKeysPlacement}
                onArrowKeysPlacementChange={setArrowKeysPlacement}
                onRequestClearCode={requestClearCode}
              />
            )}
          </>
        ) : null}
      </aside>

      <div
        className={`output-backdrop${outputOpen ? ' open' : ''}`}
        onClick={() => setOutputOpen(false)}
      />

      <aside
        className={`output-panel${outputOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal={outputOpen ? true : undefined}
        aria-hidden={!outputOpen}
        aria-labelledby="output-title"
      >
        {outputOpen ? (
          <>
            <button
              type="button"
              className="panel-close"
              onClick={() => setOutputOpen(false)}
              aria-label="Close output"
            >
              <FiX size={18} />
            </button>
            <h2 id="output-title">Output</h2>
            <p className="output-hint">
              Code runs on OneCompiler in the background. Standard input is injected for C++ only
              (your <code>main</code> is renamed to <code>user_main</code>).
            </p>
            <label className="theme-label">
              Standard input (C++ only)
              <textarea
                className="output-stdin"
                value={stdin}
                disabled={language !== 'cpp'}
                onChange={(event) => setStdin(event.target.value)}
                placeholder={
                  language === 'cpp'
                    ? 'Text fed to cin (newlines and spaces preserved)'
                    : 'Not used for this language'
                }
                rows={9}
              />
            </label>
            <pre className="output-pre">{outputText}</pre>
            <div className="confirm-actions output-actions">
              <button type="button" className="confirm-button cancel" onClick={() => setOutputOpen(false)}>
                Close
              </button>
              {running ? (
                <button type="button" className="confirm-button cancel-run" onClick={cancelRun}>
                  Cancel run
                </button>
              ) : (
                <button type="button" className="confirm-button replace" onClick={runCode}>
                  <FiPlay size={16} />
                  Run
                </button>
              )}
            </div>
          </>
        ) : null}
      </aside>

      {pendingClear ? (
        <div className="confirm-backdrop" onClick={cancelClearCode}>
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="clear-confirm-title">Clear all code?</h2>
            <p>
              This empties the editor completely. The code stored in this browser will be
              cleared too.
            </p>
            <div className="confirm-actions">
              <button type="button" className="confirm-button cancel" onClick={cancelClearCode}>
                Cancel
              </button>
              <button type="button" className="confirm-button danger" onClick={confirmClearCode}>
                Clear all
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingTemplate ? (
        <div className="confirm-backdrop" onClick={cancelApplyTemplate}>
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title">Replace current code?</h2>
            <p>
              This will overwrite the editor with {pendingTemplate.name}. Your current
              code is saved in this browser.
            </p>
            <div className="confirm-actions">
              <button type="button" className="confirm-button cancel" onClick={cancelApplyTemplate}>
                Cancel
              </button>
              <button type="button" className="confirm-button replace" onClick={confirmApplyTemplate}>
                Replace
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="options-strip" aria-label="Options">
        <button
          type="button"
          className="strip-button"
          tabIndex={-1}
          aria-label="Move cursor up"
          {...bindCursorPad('up')}
        >
          <FiChevronUp size={22} />
        </button>
        <button
          type="button"
          className="strip-button"
          tabIndex={-1}
          aria-label="Move cursor down"
          {...bindCursorPad('down')}
        >
          <FiChevronDown size={22} />
        </button>
        <div className="strip-divider" />
        <button
          type="button"
          className={`strip-button${outputOpen ? ' active' : ''}`}
          aria-label="Output"
          aria-expanded={outputOpen}
          onClick={toggleOutput}
        >
          <FiTerminal size={20} />
        </button>
        <button
          type="button"
          className="strip-button"
          aria-label="Copy code"
          onClick={copyEditorCode}
        >
          <FiCopy size={20} />
        </button>
        <button
          type="button"
          className="strip-button"
          aria-label="Format code"
          onClick={formatEditorCode}
        >
          <FiAlignLeft size={20} />
        </button>
        <div className="strip-divider" />
        {PANEL_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`strip-button${openPanel === id ? ' active' : ''}`}
            aria-label={label}
            aria-expanded={openPanel === id}
            onClick={() => togglePanel(id)}
          >
            <Icon size={20} />
          </button>
        ))}
      </aside>
    </div>
  )
}
