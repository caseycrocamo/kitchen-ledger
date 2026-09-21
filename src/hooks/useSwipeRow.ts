import { useRef, useState } from 'preact/hooks'

export const ACTION_WIDTH = 144 // px, two 72px action buttons

const TAP_THRESHOLD = 8 // px — movement under this counts as a tap, not a drag
const OVERSCROLL_RESISTANCE = 0.4
const SNAP_DISTANCE_THRESHOLD = ACTION_WIDTH / 2

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startRevealX: number
  isDragging: boolean
}

export function useSwipeRow() {
  const [expanded, setExpanded] = useState(false)
  const [revealX, setRevealX] = useState(0)
  const [isSnapping, setIsSnapping] = useState(false)
  const horizontalDrag = useRef<DragState | null>(null)
  const verticalDrag = useRef<DragState | null>(null)

  function closeReveal() {
    setIsSnapping(true)
    setRevealX(0)
  }

  function toggleReveal() {
    setIsSnapping(true)
    setRevealX((prev) => (prev === 0 ? -ACTION_WIDTH : 0))
  }

  function toggleExpanded() {
    setExpanded((prev) => !prev)
  }

  function clampReveal(raw: number): number {
    if (raw > 0) return raw * OVERSCROLL_RESISTANCE
    if (raw < -ACTION_WIDTH) return -ACTION_WIDTH + (raw + ACTION_WIDTH) * OVERSCROLL_RESISTANCE
    return raw
  }

  const rowHandlers = {
    onPointerDown: (e: PointerEvent) => {
      if (revealX !== 0) {
        closeReveal()
        return
      }
      horizontalDrag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startRevealX: revealX,
        isDragging: false,
      }
    },
    onPointerMove: (e: PointerEvent) => {
      const drag = horizontalDrag.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.isDragging) {
        if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) return
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical intent — let native scroll / the handle own it.
          horizontalDrag.current = null
          return
        }
        drag.isDragging = true
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
      }
      setIsSnapping(false)
      setRevealX(clampReveal(drag.startRevealX + dx))
    },
    onPointerUp: (e: PointerEvent) => {
      const drag = horizontalDrag.current
      horizontalDrag.current = null
      if (!drag || !drag.isDragging) return
      const dx = e.clientX - drag.startX
      setIsSnapping(true)
      if (dx < -SNAP_DISTANCE_THRESHOLD) {
        setRevealX(-ACTION_WIDTH)
      } else {
        setRevealX(0)
      }
    },
  }

  const handleHandlers = {
    onPointerDown: (e: PointerEvent) => {
      verticalDrag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startRevealX: 0,
        isDragging: false,
      }
    },
    onPointerMove: (e: PointerEvent) => {
      const drag = verticalDrag.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.isDragging) {
        if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) return
        drag.isDragging = true
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
      }
    },
    onPointerUp: (e: PointerEvent) => {
      const drag = verticalDrag.current
      verticalDrag.current = null
      if (!drag) return
      if (!drag.isDragging) {
        toggleExpanded()
        return
      }
      const dy = e.clientY - drag.startY
      if (dy > TAP_THRESHOLD) setExpanded(true)
      else if (dy < -TAP_THRESHOLD) setExpanded(false)
    },
  }

  return {
    expanded,
    toggleExpanded,
    revealX,
    isSnapping,
    rowHandlers,
    handleHandlers,
    closeReveal,
    toggleReveal,
  }
}
