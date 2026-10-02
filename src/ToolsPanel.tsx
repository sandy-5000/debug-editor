import { useState } from 'react'
import type { DragEvent } from 'react'
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiUnlock,
  FiMove,
} from 'react-icons/fi'
import type { ArrowKeysPlacement } from './storage.ts'
import {
  moveTool,
  OVERLAY_TOOL_LABELS,
  setLayoutLocked,
  setToolVisible,
  type OverlayToolId,
  type ToolLayoutState,
} from './toolLayout.ts'

function ToolPreview({ id }: { id: OverlayToolId }) {
  if (id === 'arrow-pad') {
    return (
      <span className="tools-preview tools-preview-pad" aria-hidden>
        <span />
        <span className="tools-preview-pad-mid">
          <span />
          <span />
          <span />
        </span>
      </span>
    )
  }

  if (id === 'arrow-horizontal') {
    return (
      <span className="tools-preview tools-preview-horizontal" aria-hidden>
        <span />
        <span />
      </span>
    )
  }

  if (id === 'joystick') {
    return <span className="tools-preview tools-preview-joystick" aria-hidden />
  }

  if (id === 'on-screen-keyboard') {
    return <span className="tools-preview tools-preview-keyboard" aria-hidden>⌨</span>
  }

  return <span className="tools-preview" aria-hidden />
}

type ToolsPanelProps = {
  layout: ToolLayoutState
  onLayoutChange: (layout: ToolLayoutState) => void
  placement: ArrowKeysPlacement
  onPlacementChange: (placement: ArrowKeysPlacement) => void
}

export function ToolsPanel({
  layout,
  onLayoutChange,
  placement,
  onPlacementChange,
}: ToolsPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const onDragStart = (index: number) => {
    if (layout.locked) {
      return
    }
    setDragIndex(index)
  }

  const onDragOver = (event: DragEvent, index: number) => {
    if (layout.locked || dragIndex === null || dragIndex === index) {
      return
    }
    event.preventDefault()
    onLayoutChange(moveTool(layout, dragIndex, index))
    setDragIndex(index)
  }

  const onDragEnd = () => {
    setDragIndex(null)
  }

  return (
    <div className="tools-panel">
      <h2>Tools</h2>
      <p className="settings-row-hint">
        Touch helpers on the editor: arrow pads, joystick, and PC keyboard. Lock the layout to
        keep the current order and visibility.
      </p>

      <div className="settings-row">
        <span className="settings-row-label">Layout</span>
        <div className="settings-row-options">
          <button
            type="button"
            className={`tools-lock-button${layout.locked ? ' is-locked' : ''}`}
            onClick={() => onLayoutChange(setLayoutLocked(layout, !layout.locked))}
          >
            {layout.locked ? <FiLock aria-hidden /> : <FiUnlock aria-hidden />}
            {layout.locked ? 'Locked' : 'Unlocked'}
          </button>
        </div>
        <p className="settings-row-hint">
          {layout.locked
            ? 'Unlock to reorder tools or show and hide them.'
            : 'Drag rows to reorder. Use the eye control to show or hide each tool on the editor.'}
        </p>
      </div>

      <ul className="tools-layout-list">
        {layout.order.map((id, index) => {
          const visible = layout.visibility[id]
          return (
            <li
              key={id}
              className={`tools-layout-item${dragIndex === index ? ' is-dragging' : ''}`}
              draggable={!layout.locked}
              onDragStart={() => onDragStart(index)}
              onDragOver={(event) => onDragOver(event, index)}
              onDragEnd={onDragEnd}
            >
              <span className={`tools-drag-handle${layout.locked ? ' is-disabled' : ''}`} aria-hidden>
                <FiMove />
              </span>
              <ToolPreview id={id} />
              <span className="tools-layout-label">{OVERLAY_TOOL_LABELS[id]}</span>
              <button
                type="button"
                className="tools-visibility-button"
                disabled={layout.locked}
                aria-label={visible ? `Hide ${OVERLAY_TOOL_LABELS[id]}` : `Show ${OVERLAY_TOOL_LABELS[id]}`}
                aria-pressed={visible}
                onClick={() => onLayoutChange(setToolVisible(layout, id, !visible))}
              >
                {visible ? <FiEye aria-hidden /> : <FiEyeOff aria-hidden />}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="settings-row">
        <span className="settings-row-label">Editor corner</span>
        <p className="settings-row-hint">Where the pad and joystick stack on the editor (right side).</p>
        <div
          className="settings-placement-toggle"
          role="group"
          aria-label="Tool overlay corner"
        >
          <button
            type="button"
            className={`settings-placement-option${placement === 'top' ? ' active' : ''}`}
            aria-label="Top right"
            aria-pressed={placement === 'top'}
            onClick={() => onPlacementChange('top')}
          >
            Top
          </button>
          <button
            type="button"
            className={`settings-placement-option${placement === 'bottom' ? ' active' : ''}`}
            aria-label="Bottom right"
            aria-pressed={placement === 'bottom'}
            onClick={() => onPlacementChange('bottom')}
          >
            Bottom
          </button>
        </div>
      </div>
    </div>
  )
}
