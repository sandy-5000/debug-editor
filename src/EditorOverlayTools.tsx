import type { PointerEvent as ReactPointerEvent, MouseEvent } from 'react'
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
} from 'react-icons/fi'
import * as monaco from 'monaco-editor'
import { CursorJoystick } from './CursorJoystick.tsx'
import { OnScreenKeyboard } from './OnScreenKeyboard.tsx'
import type { ArrowKeysPlacement } from './storage.ts'
import type { OverlayToolId, ToolLayoutState } from './toolLayout.ts'

type CursorDirection = 'up' | 'down' | 'left' | 'right'

type EditorOverlayToolsProps = {
  layout: ToolLayoutState
  placement: ArrowKeysPlacement
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null
  startCursorRepeat: (direction: CursorDirection) => void
  stopCursorRepeat: () => void
  bindCursorPad: (direction: CursorDirection) => {
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onPointerCancel: () => void
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void
  }
}

function renderTool(
  id: OverlayToolId,
  props: EditorOverlayToolsProps,
) {
  if (!props.layout.visibility[id]) {
    return null
  }

  switch (id) {
    case 'arrow-pad':
      return (
        <div key={id} className="editor-tool editor-tool-pad">
          <div className="cursor-pad-grid">
            <button
              type="button"
              className="cursor-pad-button cursor-pad-up"
              tabIndex={-1}
              aria-label="Move cursor up"
              {...props.bindCursorPad('up')}
            >
              <FiChevronUp size={30} aria-hidden />
            </button>
            <button
              type="button"
              className="cursor-pad-button cursor-pad-left"
              tabIndex={-1}
              aria-label="Move cursor left"
              {...props.bindCursorPad('left')}
            >
              <FiChevronLeft size={30} aria-hidden />
            </button>
            <button
              type="button"
              className="cursor-pad-button cursor-pad-down"
              tabIndex={-1}
              aria-label="Move cursor down"
              {...props.bindCursorPad('down')}
            >
              <FiChevronDown size={30} aria-hidden />
            </button>
            <button
              type="button"
              className="cursor-pad-button cursor-pad-right"
              tabIndex={-1}
              aria-label="Move cursor right"
              {...props.bindCursorPad('right')}
            >
              <FiChevronRight size={30} aria-hidden />
            </button>
          </div>
        </div>
      )
    case 'joystick':
      return (
        <div key={id} className="editor-tool editor-tool-joystick">
          <CursorJoystick
            startRepeat={props.startCursorRepeat}
            stopRepeat={props.stopCursorRepeat}
          />
        </div>
      )
    case 'on-screen-keyboard':
      return (
        <div key={id} className="editor-tool editor-tool-keyboard">
          <OnScreenKeyboard getEditor={props.getEditor} />
        </div>
      )
    default:
      return null
  }
}

export function EditorOverlayTools(props: EditorOverlayToolsProps) {
  const visibleTools = props.layout.order.filter((id) => props.layout.visibility[id])
  if (visibleTools.length === 0) {
    return null
  }

  return (
    <div
      className={`editor-overlay-stack editor-overlay-${props.placement}`}
      aria-label="Editor tools"
    >
      {visibleTools.map((id) => renderTool(id, props))}
    </div>
  )
}
