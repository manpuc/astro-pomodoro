'use client'

import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'
import { useStore } from 'zustand'

export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

export interface Task {
  id: string
  title: string
  completed: boolean
  pomodoros: number
  estimatedPomodoros: number
  createdAt: number
}

export interface Session {
  id: string
  mode: TimerMode
  duration: number
  completedAt: number
  taskId?: string
}

export interface TimerSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  soundEnabled: boolean
  soundVolume: number
  notificationsEnabled: boolean
}

export interface DisplaySettings {
  showTaskList: boolean
  showStatistics: boolean
  showProgressRing: boolean
  showTimeDisplay: boolean
  showTickMarks: boolean
  showModeLabel: boolean
  animationsEnabled: boolean
  focusMode: boolean
  workColor: string
  breakColor: string
  longBreakColor: string
  customBackgroundColor: string
  timerFontFamily: string
  progressRingThickness: number
}

export interface MonthlyPoints {
  points: number
  month: number // 1-12
  year: number
}

export interface PomodoroState {
  // Timer state
  mode: TimerMode
  timeRemaining: number
  isRunning: boolean
  completedPomodoros: number
  displayPomodoros: number // 表示用カウンター（リセット可能）
  
  // Tasks
  tasks: Task[]
  activeTaskId: string | null
  
  // Sessions (for statistics)
  sessions: Session[]
  
  // Monthly points
  monthlyPoints: MonthlyPoints
  
  // Settings
  timerSettings: TimerSettings
  displaySettings: DisplaySettings
  
  // Audio state
  audioPlaying: boolean
  triggerAudio: () => void
  stopAudio: () => void
  
  // Actions
  setMode: (mode: TimerMode) => void
  setTimeRemaining: (time: number) => void
  setIsRunning: (running: boolean) => void
  tick: (multiplier?: number) => void
  resetTimer: () => void
  skipTimer: (elapsedTime?: number) => void
  completeSession: () => void
  resetDisplayPomodoros: () => void
  
  // Task actions
  addTask: (title: string, estimatedPomodoros?: number) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskComplete: (id: string) => void
  setActiveTask: (id: string | null) => void
  clearCompletedTasks: () => void
  
  // Settings actions
  updateTimerSettings: (settings: Partial<TimerSettings>) => void
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void
  resetDisplayColors: () => void
  
  // Stats
  getTodayStats: () => { work: number; breaks: number; pomodoros: number }
  getWeekStats: () => Session[]
  
  // Monthly points
  getMonthlyPoints: () => number
  addMonthlyPoints: (points: number) => void
}

const defaultTimerSettings: TimerSettings = {
  workDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  soundVolume: 0.5,
  notificationsEnabled: false,
}

const defaultDisplaySettings: DisplaySettings = {
  showTaskList: true,
  showStatistics: true,
  showProgressRing: true,
  showTimeDisplay: true,
  showTickMarks: false,
  showModeLabel: true,
  animationsEnabled: true,
  focusMode: false,
  workColor: '#f87171',
  breakColor: '#4ade80',
  longBreakColor: '#60a5fa',
  customBackgroundColor: '', 
  timerFontFamily: 'Geist Mono',
  progressRingThickness: 10,
}

const getInitialMonthlyPoints = (): MonthlyPoints => {
  const now = new Date()
  return {
    points: 0,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

export const pomodoroStore = createStore<PomodoroState>()(
  persist(
    (set, get) => ({
      mode: 'work',
      timeRemaining: defaultTimerSettings.workDuration,
      isRunning: false,
      completedPomodoros: 0,
      displayPomodoros: 0,
      audioPlaying: false,
      tasks: [],
      activeTaskId: null,
      sessions: [],
      monthlyPoints: getInitialMonthlyPoints(),
      timerSettings: defaultTimerSettings,
      displaySettings: defaultDisplaySettings,

      setMode: (mode) => {
        const { timerSettings } = get()
        let duration: number
        switch (mode) {
          case 'work':
            duration = timerSettings.workDuration
            break
          case 'shortBreak':
            duration = timerSettings.shortBreakDuration
            break
          case 'longBreak':
            duration = timerSettings.longBreakDuration
            break
        }
        set({ mode, timeRemaining: duration, isRunning: false })
      },

      setTimeRemaining: (time) => set({ timeRemaining: time }),
      setIsRunning: (running) => set({ isRunning: running }),

      tick: (multiplier = 1) => {
        const { timeRemaining, isRunning } = get()
        if (isRunning && timeRemaining > 0) {
          set({ timeRemaining: Math.max(0, timeRemaining - multiplier) })
        }
      },

      resetTimer: () => {
        const { mode, timerSettings } = get()
        let duration: number
        switch (mode) {
          case 'work':
            duration = timerSettings.workDuration
            break
          case 'shortBreak':
            duration = timerSettings.shortBreakDuration
            break
          case 'longBreak':
            duration = timerSettings.longBreakDuration
            break
        }
        set({ timeRemaining: duration, isRunning: false })
      },

      skipTimer: (elapsedTime?: number) => {
        const { mode, completedPomodoros, timerSettings, activeTaskId, tasks, sessions } = get()
        
        // Always record session so that stats and Pomodoro counts are updated
        const sessionDuration = (elapsedTime !== undefined && elapsedTime >= 0) ? elapsedTime : 0
        const session: Session = {
          id: Date.now().toString(),
          mode,
          duration: sessionDuration,
          completedAt: Date.now(),
          taskId: activeTaskId || undefined,
        }
        set({ sessions: [...sessions, session] })
        
        if (mode === 'work') {
          const newCompletedPomodoros = completedPomodoros + 1
          const isLongBreak = newCompletedPomodoros % timerSettings.longBreakInterval === 0
          
          // Update active task pomodoro count
          if (activeTaskId) {
            const updatedTasks = tasks.map(t => 
              t.id === activeTaskId ? { ...t, pomodoros: t.pomodoros + 1 } : t
            )
            set({ tasks: updatedTasks })
          }
          
          const { displayPomodoros } = get()
          
          set({
            completedPomodoros: newCompletedPomodoros,
            displayPomodoros: displayPomodoros + 1,
            mode: isLongBreak ? 'longBreak' : 'shortBreak',
            timeRemaining: isLongBreak 
              ? timerSettings.longBreakDuration 
              : timerSettings.shortBreakDuration,
            isRunning: timerSettings.autoStartBreaks,
          })
        } else {
          set({
            mode: 'work',
            timeRemaining: timerSettings.workDuration,
            isRunning: timerSettings.autoStartPomodoros,
          })
        }
      },

      completeSession: () => {
        const { mode, timerSettings, completedPomodoros, activeTaskId, tasks, sessions, monthlyPoints } = get()
        
        // Record session
        const session: Session = {
          id: Date.now().toString(),
          mode,
          duration: mode === 'work' 
            ? timerSettings.workDuration 
            : mode === 'shortBreak' 
              ? timerSettings.shortBreakDuration 
              : timerSettings.longBreakDuration,
          completedAt: Date.now(),
          taskId: activeTaskId || undefined,
        }
        
        if (mode === 'work') {
          const newCompletedPomodoros = completedPomodoros + 1
          const isLongBreak = newCompletedPomodoros % timerSettings.longBreakInterval === 0
          
          // Calculate points: 10pt for session completion + 5pt bonus for consecutive pomodoros
          let pointsToAdd = 10
          if (newCompletedPomodoros >= 2) {
            pointsToAdd += 5 // Consecutive bonus
          }
          
          // Check current month for points
          const now = new Date()
          const currentMonth = now.getMonth() + 1
          const currentYear = now.getFullYear()
          let newMonthlyPoints = monthlyPoints
          
          if (monthlyPoints.month !== currentMonth || monthlyPoints.year !== currentYear) {
            newMonthlyPoints = { points: pointsToAdd, month: currentMonth, year: currentYear }
          } else {
            newMonthlyPoints = { ...monthlyPoints, points: monthlyPoints.points + pointsToAdd }
          }
          
          // Update active task pomodoro count
          let updatedTasks = tasks
          if (activeTaskId) {
            updatedTasks = tasks.map(t => 
              t.id === activeTaskId ? { ...t, pomodoros: t.pomodoros + 1 } : t
            )
          }
          
          const { displayPomodoros } = get()
          set({
            sessions: [...sessions, session],
            tasks: updatedTasks,
            completedPomodoros: newCompletedPomodoros,
            displayPomodoros: displayPomodoros + 1,
            monthlyPoints: newMonthlyPoints,
            mode: isLongBreak ? 'longBreak' : 'shortBreak',
            timeRemaining: isLongBreak 
              ? timerSettings.longBreakDuration 
              : timerSettings.shortBreakDuration,
            isRunning: timerSettings.autoStartBreaks,
          })
        } else {
          set({
            sessions: [...sessions, session],
            mode: 'work',
            timeRemaining: timerSettings.workDuration,
            isRunning: timerSettings.autoStartPomodoros,
          })
        }
      },

      resetDisplayPomodoros: () => {
        set({ displayPomodoros: 0 })
      },

      triggerAudio: () => set({ audioPlaying: true }),
      stopAudio: () => set({ audioPlaying: false }),

      addTask: (title, estimatedPomodoros = 1) => {
        const task: Task = {
          id: Date.now().toString(),
          title,
          completed: false,
          pomodoros: 0,
          estimatedPomodoros,
          createdAt: Date.now(),
        }
        set((state) => ({ tasks: [...state.tasks, task] }))
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }))
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
        }))
      },

      toggleTaskComplete: (id) => {
        const { tasks, monthlyPoints } = get()
        const task = tasks.find(t => t.id === id)
        
        // Add 20 points when completing a task (not uncompleting)
        if (task && !task.completed) {
          const now = new Date()
          const currentMonth = now.getMonth() + 1
          const currentYear = now.getFullYear()
          
          let newMonthlyPoints = monthlyPoints
          if (monthlyPoints.month !== currentMonth || monthlyPoints.year !== currentYear) {
            newMonthlyPoints = { points: 20, month: currentMonth, year: currentYear }
          } else {
            newMonthlyPoints = { ...monthlyPoints, points: monthlyPoints.points + 20 }
          }
          
          set({
            tasks: tasks.map((t) => t.id === id ? { ...t, completed: true } : t),
            monthlyPoints: newMonthlyPoints,
          })
        } else {
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, completed: !t.completed } : t
            ),
          }))
        }
      },

      setActiveTask: (id) => set({ activeTaskId: id }),

      clearCompletedTasks: () => {
        set((state) => ({
          tasks: state.tasks.filter((t) => !t.completed),
        }))
      },

      updateTimerSettings: (settings) => {
        set((state) => {
          const newSettings = { ...state.timerSettings, ...settings }
          // Update current time if mode duration changed
          let newTimeRemaining = state.timeRemaining
          if (!state.isRunning) {
            switch (state.mode) {
              case 'work':
                if (settings.workDuration !== undefined) {
                  newTimeRemaining = settings.workDuration
                }
                break
              case 'shortBreak':
                if (settings.shortBreakDuration !== undefined) {
                  newTimeRemaining = settings.shortBreakDuration
                }
                break
              case 'longBreak':
                if (settings.longBreakDuration !== undefined) {
                  newTimeRemaining = settings.longBreakDuration
                }
                break
            }
          }
          return { timerSettings: newSettings, timeRemaining: newTimeRemaining }
        })
      },

      updateDisplaySettings: (settings) => {
        set((state) => {
          const newSettings = { ...state.displaySettings, ...settings }
          
          // Apply colors to document root
          if (typeof document !== 'undefined') {
            if (newSettings.workColor) {
              document.documentElement.style.setProperty('--timer-work', newSettings.workColor)
            }
            if (newSettings.breakColor) {
              document.documentElement.style.setProperty('--timer-break', newSettings.breakColor)
            }
            if (newSettings.longBreakColor) {
              document.documentElement.style.setProperty('--timer-long-break', newSettings.longBreakColor)
            }
            if (newSettings.customBackgroundColor) {
              document.documentElement.style.setProperty('--background-custom', newSettings.customBackgroundColor)
            } else {
              document.documentElement.style.removeProperty('--background-custom')
            }
          }
          
          return { displaySettings: newSettings }
        })
      },

      resetDisplayColors: () => {
        const { displaySettings } = get()
        const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        
        const defaults = isDark ? {
          workColor: '#f87171',
          breakColor: '#4ade80',
          longBreakColor: '#60a5fa',
          customBackgroundColor: '',
        } : {
          workColor: '#b15c00',
          breakColor: '#587539',
          longBreakColor: '#2e7de9',
          customBackgroundColor: '',
        }
        
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--timer-work', defaults.workColor)
          document.documentElement.style.setProperty('--timer-break', defaults.breakColor)
          document.documentElement.style.setProperty('--timer-long-break', defaults.longBreakColor)
          document.documentElement.style.removeProperty('--background-custom')
        }
        
        set({
          displaySettings: {
            ...displaySettings,
            ...defaults
          }
        })
      },

      getTodayStats: () => {
        const { sessions } = get()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todaySessions = sessions.filter(
          (s) => s.completedAt >= today.getTime()
        )
        
        const workSessions = todaySessions.filter((s) => s.mode === 'work')
        const breakSessions = todaySessions.filter((s) => s.mode !== 'work')
        
        return {
          work: workSessions.reduce((acc, s) => acc + s.duration, 0),
          breaks: breakSessions.reduce((acc, s) => acc + s.duration, 0),
          pomodoros: workSessions.length,
        }
      },

      getWeekStats: () => {
        const { sessions } = get()
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        return sessions.filter((s) => s.completedAt >= weekAgo)
      },

      getMonthlyPoints: () => {
        const { monthlyPoints } = get()
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()
        
        // Reset if month changed
        if (monthlyPoints.month !== currentMonth || monthlyPoints.year !== currentYear) {
          set({
            monthlyPoints: {
              points: 0,
              month: currentMonth,
              year: currentYear,
            },
          })
          return 0
        }
        return monthlyPoints.points
      },

      addMonthlyPoints: (points) => {
        const { monthlyPoints } = get()
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()
        
        // Reset if month changed, then add points
        if (monthlyPoints.month !== currentMonth || monthlyPoints.year !== currentYear) {
          set({
            monthlyPoints: {
              points,
              month: currentMonth,
              year: currentYear,
            },
          })
        } else {
          set({
            monthlyPoints: {
              ...monthlyPoints,
              points: monthlyPoints.points + points,
            },
          })
        }
      },
    }),
    {
      name: 'pomodoro-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        sessions: state.sessions,
        timerSettings: state.timerSettings,
        displaySettings: state.displaySettings,
        completedPomodoros: state.completedPomodoros,
        displayPomodoros: state.displayPomodoros,
        monthlyPoints: state.monthlyPoints,
        mode: state.mode,
        timeRemaining: state.timeRemaining,
        isRunning: state.isRunning,
      }),
    }
  )
)

export function usePomodoroStore<T>(selector: (state: PomodoroState) => T): T;
export function usePomodoroStore(): PomodoroState;
export function usePomodoroStore<T>(selector?: (state: PomodoroState) => T) {
  return useStore(pomodoroStore, selector!)
}
