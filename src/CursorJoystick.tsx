import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export type CursorDirection = 'up' | 'down' | 'left' | 'right'

const BASE_SIZE = 148
const KNOB_SIZE = 56
const MAX_OFFSET = (BASE_SIZE - KNOB_SIZE) / 2 - 4
const DEAD_ZONE = 12

function directionFromDelta(dx: number, dy: number): CursorDirection | null {
  const distance = Math.hypot(dx, dy)
  if (distance < DEAD_ZONE) {
    return null
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left'
  }

  return dy > 0 ? 'down' : 'up'
}

function clampOffset(dx: number, dy: number) {
  const distance = Math.hypot(dx, dy)
  if (distance <= MAX_OFFSET || distance === 0) {
    return { x: dx, y: dy }
  }

  const scale = MAX_OFFSET / distance
  return { x: dx * scale, y: dy * scale }
}

type CursorJoystickProps = {
  startRepeat: (direction: CursorDirection) => void
  stopRepeat: () => void
}

export function CursorJoystick({ startRepeat, stopRepeat }: CursorJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const activeDirectionRef = useRef<CursorDirection | null>(null)
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })

  const setDirection = (direction: CursorDirection | null) => {
    if (activeDirectionRef.current === direction) {
      return
    }

    stopRepeat()
    activeDirectionRef.current = direction
    if (direction) {
      startRepeat(direction)
    }
  }

  const reset = () => {
    setDirection(null)
    setKnobOffset({ x: 0, y: 0 })
  }

  const updateFromClientPoint = (clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) {
      return
    }

    const rect = base.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const rawX = clientX - centerX
    const rawY = clientY - centerY
    const { x, y } = clampOffset(rawX, rawY)
    setKnobOffset({ x, y })
    setDirection(directionFromDelta(rawX, rawY))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromClientPoint(event.clientX, event.clientY)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return
    }

    event.preventDefault()
    updateFromClientPoint(event.clientX, event.clientY)
  }

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    reset()
  }

  return (
    <div
      ref={baseRef}
      className="cursor-joystick"
      style={{ width: BASE_SIZE, height: BASE_SIZE }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={reset}
      role="group"
      aria-label="Joystick cursor control"
    >
      <div
        className="cursor-joystick-knob"
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
        }}
        aria-hidden
      />
    </div>
  )
}
