import type { ArrowKeysStyle } from './storage.ts'

export const OVERLAY_TOOL_IDS = [
  'arrow-pad',
  'arrow-horizontal',
  'joystick',
  'on-screen-keyboard',
] as const

export type OverlayToolId = (typeof OVERLAY_TOOL_IDS)[number]

export type ToolLayoutState = {
  locked: boolean
  order: OverlayToolId[]
  visibility: Record<OverlayToolId, boolean>
}

const STORAGE_KEY = 'debug-editor-tool-layout'

export const OVERLAY_TOOL_LABELS: Record<OverlayToolId, string> = {
  'arrow-pad': 'Arrow pad',
  'arrow-horizontal': 'Left / right arrows',
  joystick: 'Joystick',
  'on-screen-keyboard': 'PC keyboard',
}

const DEFAULT_VISIBILITY: Record<OverlayToolId, boolean> = {
  'arrow-pad': true,
  'arrow-horizontal': false,
  joystick: false,
  'on-screen-keyboard': false,
}

export function defaultToolLayout(): ToolLayoutState {
  return {
    locked: true,
    order: [...OVERLAY_TOOL_IDS],
    visibility: { ...DEFAULT_VISIBILITY },
  }
}

function isOverlayToolId(value: string): value is OverlayToolId {
  return (OVERLAY_TOOL_IDS as readonly string[]).includes(value)
}

function normalizeOrder(order: unknown): OverlayToolId[] {
  if (!Array.isArray(order)) {
    return [...OVERLAY_TOOL_IDS]
  }

  const seen = new Set<OverlayToolId>()
  const normalized: OverlayToolId[] = []

  for (const item of order) {
    if (typeof item === 'string' && isOverlayToolId(item) && !seen.has(item)) {
      seen.add(item)
      normalized.push(item)
    }
  }

  for (const id of OVERLAY_TOOL_IDS) {
    if (!seen.has(id)) {
      normalized.push(id)
    }
  }

  return normalized
}

function normalizeVisibility(
  visibility: unknown,
  fallback: Record<OverlayToolId, boolean>,
): Record<OverlayToolId, boolean> {
  const next = { ...fallback }
  if (!visibility || typeof visibility !== 'object') {
    return next
  }

  for (const id of OVERLAY_TOOL_IDS) {
    const value = (visibility as Record<string, unknown>)[id]
    if (typeof value === 'boolean') {
      next[id] = value
    }
  }

  return next
}

export function loadToolLayout(
  legacyArrowVisible = true,
  legacyStyle: ArrowKeysStyle = 'dpad',
): ToolLayoutState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const layout = defaultToolLayout()
    if (!legacyArrowVisible) {
      layout.visibility['arrow-pad'] = false
      layout.visibility.joystick = false
    } else if (legacyStyle === 'joystick') {
      layout.visibility['arrow-pad'] = false
      layout.visibility.joystick = true
    }
    return layout
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return defaultToolLayout()
    }

    const record = parsed as Record<string, unknown>
    const base = defaultToolLayout()
    return {
      locked: record.locked !== false,
      order: normalizeOrder(record.order),
      visibility: normalizeVisibility(record.visibility, base.visibility),
    }
  } catch {
    return defaultToolLayout()
  }
}

export function saveToolLayout(layout: ToolLayoutState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
}

export function moveTool(layout: ToolLayoutState, from: number, to: number): ToolLayoutState {
  if (layout.locked || from === to || from < 0 || to < 0) {
    return layout
  }

  const order = [...layout.order]
  if (from >= order.length || to >= order.length) {
    return layout
  }

  const [item] = order.splice(from, 1)
  order.splice(to, 0, item)
  return { ...layout, order }
}

export function setToolVisible(
  layout: ToolLayoutState,
  id: OverlayToolId,
  visible: boolean,
): ToolLayoutState {
  if (layout.locked) {
    return layout
  }

  return {
    ...layout,
    visibility: { ...layout.visibility, [id]: visible },
  }
}

export function setLayoutLocked(layout: ToolLayoutState, locked: boolean): ToolLayoutState {
  return { ...layout, locked }
}
