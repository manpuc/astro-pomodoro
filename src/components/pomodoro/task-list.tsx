'use client'

import { useState } from 'react'
import { usePomodoroStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { PlusIcon, TrashIcon, CheckIcon, TomatoIcon, XIcon } from '@/components/icons'
import { useShallow } from 'zustand/react/shallow'

export function TaskList() {
  const {
    tasks,
    activeTaskId,
    displaySettings,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    setActiveTask,
    clearCompletedTasks,
  } = usePomodoroStore(
    useShallow((state) => ({
      tasks: state.tasks,
      activeTaskId: state.activeTaskId,
      displaySettings: state.displaySettings,
      addTask: state.addTask,
      updateTask: state.updateTask,
      deleteTask: state.deleteTask,
      toggleTaskComplete: state.toggleTaskComplete,
      setActiveTask: state.setActiveTask,
      clearCompletedTasks: state.clearCompletedTasks,
    }))
  )

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask(newTaskTitle.trim(), newTaskPomodoros)
      setNewTaskTitle('')
      setNewTaskPomodoros(1)
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTaskTitle('')
    }
  }

  const incompleteTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  return (
    <div className="task-list-container liquid-glass rounded-3xl p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium">タスク</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="control-button glass-button p-2.5 rounded-2xl text-muted-foreground hover:text-foreground"
          aria-label="タスクを追加"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Add task form */}
      {isAdding && (
        <div className="mb-5 p-4 rounded-2xl bg-secondary/30 space-y-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="タスク名を入力..."
            className="w-full bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="flex items-center gap-2">
            {/* Pomodoro count */}
            <div className="flex items-center gap-1.5 flex-1 text-sm text-muted-foreground">
              <TomatoIcon className="w-4 h-4 text-timer-work shrink-0" />
              <button
                type="button"
                onClick={() => setNewTaskPomodoros(Math.max(1, newTaskPomodoros - 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                aria-label="ポモドーロ数を減らす"
              >
                <span className="text-xs font-bold">−</span>
              </button>
              <span className="w-5 text-center font-mono text-foreground">{newTaskPomodoros}</span>
              <button
                type="button"
                onClick={() => setNewTaskPomodoros(Math.min(10, newTaskPomodoros + 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                aria-label="ポモドーロ数を増やす"
              >
                <span className="text-xs font-bold">+</span>
              </button>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false)
                  setNewTaskTitle('')
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="キャンセル"
              >
                <XIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
                aria-label="追加"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {incompleteTasks.length === 0 && completedTasks.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-8">
            タスクがありません
          </p>
        )}

        {incompleteTasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer',
              activeTaskId === task.id
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-secondary/30'
            )}
            onClick={() => setActiveTask(activeTaskId === task.id ? null : task.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleTaskComplete(task.id)
              }}
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                'border-muted-foreground/50 hover:border-primary'
              )}
            >
              {task.completed && <CheckIcon className="w-3 h-3"  />}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{task.title}</p>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: task.estimatedPomodoros }).map((_, i) => (
                  <TomatoIcon
                    key={i}
                    className={cn(
                      'w-3 h-3',
                      i < task.pomodoros ? 'text-timer-work' : 'text-muted-foreground/30'
                    )}
                    
                  />
                ))}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteTask(task.id)
              }}
              className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
            >
              <TrashIcon className="w-4 h-4"  />
            </button>
          </div>
        ))}

        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <>
            <div className="flex items-center justify-between pt-4 pb-2">
              <span className="text-xs text-muted-foreground">
                完了 ({completedTasks.length})
              </span>
              <button
                onClick={clearCompletedTasks}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                すべて削除
              </button>
            </div>

            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-4 rounded-2xl opacity-60"
              >
                <button
                  onClick={() => toggleTaskComplete(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center"
                >
                  <CheckIcon className="w-3 h-3 text-primary-foreground"  />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through truncate">{task.title}</p>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                >
                  <TrashIcon className="w-4 h-4"  />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
