'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelPosition {
  x: number
  y: number
  width: number
  height: number
}

interface DraggablePanelProps {
  id: string
  children: ReactNode
  defaultPosition: PanelPosition
  className?: string
  style?: React.CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onTouchStart?: () => void
  onTouchEnd?: () => void
}

const STORAGE_KEY = 'pomodoro-panel-positions'

function loadPositions(): Record<string, PanelPosition> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function savePositions(positions: Record<string, PanelPosition>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  } catch {
    // Ignore storage errors
  }
}

export function DraggablePanel({
  id,
  children,
  defaultPosition,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
}: DraggablePanelProps) {
  const [position, setPosition] = useState<PanelPosition>(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  // Load saved position on mount
  useEffect(() => {
    const positions = loadPositions()
    if (positions[id]) {
      setPosition(positions[id])
    }
  }, [id])

  // Save position when it changes
  const savePosition = useCallback((newPosition: PanelPosition) => {
    const positions = loadPositions()
    positions[id] = newPosition
    savePositions(positions)
  }, [id])

  // Handle mouse drag start
  const handleMouseDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [position.x, position.y])

  // Handle touch drag start
  const handleTouchDragStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [position.x, position.y])

  // Handle mouse/touch move and end
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x
        const deltaY = e.clientY - dragStartRef.current.y
        const newX = Math.max(0, Math.min(window.innerWidth - position.width, dragStartRef.current.posX + deltaX))
        const newY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY))
        setPosition(prev => ({ ...prev, x: newX, y: newY }))
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        const touch = e.touches[0]
        const deltaX = touch.clientX - dragStartRef.current.x
        const deltaY = touch.clientY - dragStartRef.current.y
        const newX = Math.max(0, Math.min(window.innerWidth - position.width, dragStartRef.current.posX + deltaX))
        const newY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY))
        setPosition(prev => ({ ...prev, x: newX, y: newY }))
      }
    }

    const handleEnd = () => {
      if (isDragging) {
        savePosition(position)
      }
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, position, savePosition])

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-20 group/panel',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height > 0 ? position.height : 'auto',
        ...style,
      }}
      onMouseEnter={() => {
        onMouseEnter?.()
      }}
      onMouseLeave={() => {
        onMouseLeave?.()
      }}
      onTouchStart={() => {
        onTouchStart?.()
      }}
      onTouchEnd={() => {
        onTouchEnd?.()
      }}
    >
      {/* Drag handle at the top */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-10 cursor-grab select-none z-30 touch-none',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDragStart}
        onTouchStart={handleTouchDragStart}
      />
      {children}
    </div>
  )
}

// Hook to reset panel positions
export function useResetPanelPositions() {
  return useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      window.location.reload()
    }
  }, [])
}
