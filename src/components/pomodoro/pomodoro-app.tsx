'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePomodoroStore } from '@/lib/store'
import { usePWA } from '@/hooks/use-pwa'
import { Timer } from '@/components/pomodoro/timer'
import { TaskList } from '@/components/pomodoro/task-list'
import { DraggablePanel } from '@/components/pomodoro/draggable-panel'
import { cn } from '@/lib/utils'
import React, { Suspense } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const Statistics = React.lazy(() =>
  import('@/components/pomodoro/statistics').then(m => ({ default: m.Statistics }))
)

const Settings = React.lazy(() =>
  import('@/components/pomodoro/settings').then(m => ({ default: m.Settings }))
)


export function PomodoroApp() {
  const {
    displaySettings,
    updateDisplaySettings,
    isRunning,
    setIsRunning,
    resetTimer,
    completeSession,
  } = usePomodoroStore(
    useShallow((state: any) => ({
      displaySettings: state.displaySettings,
      updateDisplaySettings: state.updateDisplaySettings,
      isRunning: state.isRunning,
      setIsRunning: state.setIsRunning,
      resetTimer: state.resetTimer,
      completeSession: state.completeSession,
    }))
  )
  const { isInstallable, install } = usePWA()
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Track previous panel states for exit animations
  const [showTaskListAnimated, setShowTaskListAnimated] = useState(true)
  const [showStatisticsAnimated, setShowStatisticsAnimated] = useState(true)
  const [isTaskListExiting, setIsTaskListExiting] = useState(false)
  const [isStatisticsExiting, setIsStatisticsExiting] = useState(false)

  // Handle panel visibility with animations
  const handlePanelAnimation = useCallback((
    newValue: boolean,
    setAnimated: (v: boolean) => void,
    setExiting: (v: boolean) => void
  ) => {
    if (!displaySettings.animationsEnabled) {
      setAnimated(newValue)
      return
    }

    if (newValue) {
      setExiting(false)
      setAnimated(true)
    } else {
      setExiting(true)
      setTimeout(() => {
        setAnimated(false)
        setExiting(false)
      }, 400)
    }
  }, [displaySettings.animationsEnabled])

  // Watch for task list visibility changes
  useEffect(() => {
    if (mounted) {
      handlePanelAnimation(displaySettings.showTaskList, setShowTaskListAnimated, setIsTaskListExiting)
    }
  }, [displaySettings.showTaskList, handlePanelAnimation, mounted])

  // Watch for statistics visibility changes
  useEffect(() => {
    if (mounted) {
      handlePanelAnimation(displaySettings.showStatistics, setShowStatisticsAnimated, setIsStatisticsExiting)
    }
  }, [displaySettings.showStatistics, handlePanelAnimation, mounted])

  // Mark as mounted for hydration safety and check desktop
  useEffect(() => {
    setMounted(true)
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Add reduce-motion class when animations are disabled
  useEffect(() => {
    if (!displaySettings.animationsEnabled) {
      document.body.classList.add('reduce-motion')
    } else {
      document.body.classList.remove('reduce-motion')
    }
  }, [displaySettings.animationsEnabled])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const key = e.key.toLowerCase()

      switch (key) {
        case 's': // Start
          if (!isRunning) {
            setIsRunning(true)
          }
          break
        case 'e': // End/Stop
          if (isRunning) {
            setIsRunning(false)
          }
          break
        case 'p': // Pause toggle
          setIsRunning(!isRunning)
          break
        case 'r': // Reset
          resetTimer()
          break
        case 'q': // Skip
          setIsRunning(false)
          completeSession()
          break
        case 't': // Toggle task panel
          updateDisplaySettings({ showTaskList: !displaySettings.showTaskList })
          break
        case 'g': // Toggle statistics panel
          updateDisplaySettings({ showStatistics: !displaySettings.showStatistics })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning, setIsRunning, resetTimer, completeSession, updateDisplaySettings, displaySettings.showTaskList, displaySettings.showStatistics])

  // Default panel positions for desktop (タイマーの左右に配置)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920)

  useEffect(() => {
    const updateWidth = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // タイマー中心から計算（中央配置）
  const centerX = windowWidth / 2
  const panelWidth = 340
  const timerWidth = 400 // タイマー領域の幅
  const gap = 40 // タイマーとパネルの間

  const taskPanelDefault = {
    x: Math.max(20, centerX - timerWidth / 2 - panelWidth - gap),
    y: 180,
    width: panelWidth,
    height: 0,
  }

  const statsPanelDefault = {
    x: Math.min(windowWidth - panelWidth - 20, centerX + timerWidth / 2 + gap),
    y: 180,
    width: panelWidth,
    height: 0,
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="pomodoro-app min-h-screen flex flex-col items-center p-4 md:p-8 lg:p-12 pt-20 lg:pt-12 lg:justify-center relative overflow-hidden" suppressHydrationWarning>
        {/* Background gradient */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-timer-work/5 blur-3xl" />
          <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-timer-break/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 rounded-full bg-timer-long-break/5 blur-3xl" />
        </div>

        {/* Header - only show on desktop */}
        <header className="header-container fixed top-0 left-0 right-0 z-30 p-4 md:p-6 hidden lg:flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground/80">Pomodoro</h1>
          <div className="flex items-center gap-4 mr-16">
            {isInstallable && (
              <button
                onClick={install}
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                インストール
              </button>
            )}
          </div>
        </header>

        {/* Timer - always centered */}
        <div
          className={cn(
            'panel-center flex-shrink-0 z-10 mt-4 lg:mt-0',
            displaySettings.animationsEnabled && 'container-animate-enter'
          )}
        >
          <Timer />
        </div>

        {/* Desktop layout - draggable panels */}
        {isDesktop && showTaskListAnimated && (
          <DraggablePanel
            id="task-panel"
            defaultPosition={taskPanelDefault}
            className={cn(
              'layout-transition',
              displaySettings.animationsEnabled && !isTaskListExiting && 'container-animate-enter',
              isTaskListExiting && 'container-animate-exit'
            )}
          >
            <div className="w-full h-full overflow-auto">
              <TaskList />
            </div>
          </DraggablePanel>
        )}

        {isDesktop && showStatisticsAnimated && (
          <DraggablePanel
            id="stats-panel"
            defaultPosition={statsPanelDefault}
            className={cn(
              'layout-transition',
              displaySettings.animationsEnabled && !isStatisticsExiting && 'container-animate-enter',
              isStatisticsExiting && 'container-animate-exit'
            )}
            style={{
              animationDelay: displaySettings.animationsEnabled && !isStatisticsExiting ? '0.1s' : '0s',
            }}
          >
            <div className="w-full h-full overflow-hidden">
              <Suspense fallback={null}>
                <Statistics />
              </Suspense>
            </div>
          </DraggablePanel>
        )}

        {/* Mobile layout - stacked */}
        {!isDesktop && (
          <div className="flex flex-col items-center gap-8 w-full mt-8">
            {showTaskListAnimated && (
              <div
                className={cn(
                  'panel-left w-full layout-transition',
                  displaySettings.animationsEnabled && !isTaskListExiting && 'container-animate-enter',
                  isTaskListExiting && 'container-animate-exit'
                )}
              >
                <TaskList />
              </div>
            )}

            {showStatisticsAnimated && (
              <div
                className={cn(
                  'panel-right w-full layout-transition',
                  displaySettings.animationsEnabled && !isStatisticsExiting && 'container-animate-enter',
                  isStatisticsExiting && 'container-animate-exit'
                )}
                style={{
                  animationDelay: displaySettings.animationsEnabled && !isStatisticsExiting ? '0.1s' : '0s',
                }}
              >
                <Suspense fallback={null}>
                  <Statistics />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {/* Settings panel - fixed bottom right */}
        <Suspense fallback={null}>
          <Settings />
        </Suspense>

        <Toaster />
      </main>
    </ThemeProvider>
  )
}
