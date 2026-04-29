import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SearchStore {
  token: string
  claudeKey: string
  setToken: (t: string) => void
  setClaudeKey: (k: string) => void
}

export const useStore = create<SearchStore>()(
  persist(
    (set) => ({
      token: '',
      claudeKey: '',
      setToken: (t: string) => set({ token: t }),
      setClaudeKey: (k: string) => set({ claudeKey: k }),
    }),
    {
      name: 'sl_store',
    },
  ),
)
