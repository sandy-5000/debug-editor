import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { IconType } from 'react-icons'
import {
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiFolder,
  FiHelpCircle,
  FiLayers,
  FiLink,
  FiPlay,
  FiPlus,
  FiSettings,
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
  loadCode,
  loadLanguage,
  loadTheme,
  monacoTheme,
  saveCode,
  saveLanguage,
  saveTheme,
  type EditorLanguage,
  type EditorTheme,
} from './storage.ts'
import {
  EXAMPLE_TEMPLATE,
  isHttpUrl,
  loadUserTemplates,
  nameFromUrl,
  saveUserTemplates,
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
              <span className="template-url">{template.url}</span>
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
  onThemeChange,
  onLanguageChange,
}: {
  panel: PanelId
  theme: EditorTheme
  language: EditorLanguage
  onThemeChange: (theme: EditorTheme) => void
  onLanguageChange: (language: EditorLanguage) => void
}) {
  if (panel === 'settings') {
    return (
      <>
        <h2>Settings</h2>
        <label className="theme-label">
          Language
          <select
            className="settings-select"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as EditorLanguage)}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="settings-copy">Theme</p>
        <div className="theme-options" role="group" aria-label="Theme">
          <button
            type="button"
            className={`theme-button${theme === 'light' ? ' active' : ''}`}
            onClick={() => onThemeChange('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`theme-button${theme === 'dark' ? ' active' : ''}`}
            onClick={() => onThemeChange('dark')}
          >
            Dark
          </button>
        </div>
      </>
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
        Use the up and down arrows to move the cursor. Open Output to run code
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
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null)
  const [userTemplates, setUserTemplates] = useState<Template[]>(loadUserTemplates)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [templateStatus, setTemplateStatus] = useState<string | null>(null)
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null)
  const [theme, setTheme] = useState<EditorTheme>(loadTheme)
  const [language, setLanguage] = useState<EditorLanguage>(loadLanguage)
  const [outputOpen, setOutputOpen] = useState(false)
  const [outputText, setOutputText] = useState('Run your code to see output here.')
  const [stdin, setStdin] = useState('')
  const [running, setRunning] = useState(false)
  const [runnerReady, setRunnerReady] = useState(false)
  const [runnerKey, setRunnerKey] = useState(0)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const templates = [EXAMPLE_TEMPLATE, ...userTemplates]
  const embedUrl = useMemo(
    () => buildEmbedUrl(language, theme === 'dark' ? 'dark' : 'light'),
    [language, theme],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const editor = monaco.editor.create(container, {
      value: loadCode() ?? INITIAL_VALUE,
      language: loadLanguage(),
      theme: monacoTheme(loadTheme()),
      automaticLayout: true,
      fontSize: 16,
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

    saveCode(editor.getValue())
    const persist = editor.onDidChangeModelContent(() => {
      saveCode(editor.getValue())
    })

    editorRef.current = editor

    return () => {
      persist.dispose()
      editorRef.current = null
      editor.dispose()
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    monaco.editor.setTheme(monacoTheme(theme))
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, language)
    }
    saveLanguage(language)
  }, [language])

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

  const moveCursor = (direction: 'up' | 'down') => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    editor.focus()
    editor.trigger('keyboard', direction === 'up' ? 'cursorUp' : 'cursorDown', null)
  }

  const startCursorRepeat = (direction: 'up' | 'down') => {
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
  }, [openPanel, pendingTemplate, outputOpen, running, cancelRun])

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

  const copyEditorCode = async () => {
    const code = editorRef.current?.getValue() ?? ''

    try {
      await navigator.clipboard.writeText(code)
      setCopyStatus('Code copied')
    } catch {
      setCopyStatus('Could not copy code')
    }

    window.setTimeout(() => setCopyStatus(null), 2000)
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
      saveUserTemplates(next)
      return next
    })
    setTemplateStatus(`Saved ${template.name}`)
    return null
  }

  const removeTemplate = (id: string) => {
    setUserTemplates((current) => {
      const next = current.filter((template) => template.id !== id)
      saveUserTemplates(next)
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

  const confirmApplyTemplate = async () => {
    const template = pendingTemplate
    if (!template) {
      return
    }

    const editor = editorRef.current
    if (editor) {
      saveCode(editor.getValue())
    }

    setPendingTemplate(null)
    setApplyingId(template.id)
    setTemplateStatus(`Loading ${template.name}...`)

    try {
      const response = await fetch(template.url)
      if (!response.ok) {
        throw new Error(`Could not load template (${response.status})`)
      }

      const text = await response.text()
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
      <iframe
        key={runnerKey}
        ref={runnerRef}
        title="OneCompiler runner"
        className="oc-runner"
        src={embedUrl}
        onLoad={() => setRunnerReady(true)}
      />
      <div ref={containerRef} className="editor" />

      <div
        className={`panel-backdrop${openPanel ? ' open' : ''}`}
        onClick={() => setOpenPanel(null)}
      />

      <aside
        className={`side-panel${openPanel ? ' open' : ''}`}
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
                onThemeChange={setTheme}
                onLanguageChange={setLanguage}
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
          onPointerDown={(event) => {
            event.preventDefault()
            startCursorRepeat('up')
          }}
          onPointerUp={stopCursorRepeat}
          onPointerLeave={stopCursorRepeat}
          onPointerCancel={stopCursorRepeat}
          onContextMenu={(event) => event.preventDefault()}
        >
          <FiChevronUp size={22} />
        </button>
        <button
          type="button"
          className="strip-button"
          tabIndex={-1}
          aria-label="Move cursor down"
          onPointerDown={(event) => {
            event.preventDefault()
            startCursorRepeat('down')
          }}
          onPointerUp={stopCursorRepeat}
          onPointerLeave={stopCursorRepeat}
          onPointerCancel={stopCursorRepeat}
          onContextMenu={(event) => event.preventDefault()}
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
          className={`strip-button${copyStatus === 'Code copied' ? ' active' : ''}`}
          aria-label={copyStatus ?? 'Copy code'}
          onClick={copyEditorCode}
        >
          <FiCopy size={20} />
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
