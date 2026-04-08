import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface TimerState {
  seconds: number;
  running: boolean;
  sessions: number;
  audioPlaying: boolean; // 保存対象外
  setSeconds: (sec: number) => void;
  toggleRunning: () => void;
  triggerAudio: () => void;
  stopAudio: () => void;
}

export const timerStore = createStore<TimerState>()(
  persist(
    (set) => ({
      seconds: 1500, // 25分
      running: false,
      sessions: 0,
      audioPlaying: false,
      setSeconds: (sec) => set({ seconds: sec }),
      toggleRunning: () => set((state) => ({ running: !state.running })),
      // setTimeoutでの発火は使わず、コンポーネント側 (<audio onEnded>) で正確に戻す
      triggerAudio: () => set({ audioPlaying: true }),
      stopAudio: () => set({ audioPlaying: false }),
    }),
    {
      name: 'pomodoro-timer-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? window.localStorage : { getItem: () => null, setItem: () => { }, removeItem: () => { } } as any),
      // 保存するフィールドと保存しないフィールドの分離
      partialize: (state) => ({
        seconds: state.seconds,
        sessions: state.sessions,
        running: state.running,
      }),
    }
  )
);
