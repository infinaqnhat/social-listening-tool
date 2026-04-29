import { useEffect, useState } from 'react'

interface ToastMessage {
  id: number
  msg: string
}

let addToastFn: ((msg: string) => void) | null = null

export function showToast(msg: string) {
  addToastFn?.(msg)
}

export default function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    addToastFn = (msg: string) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, msg }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
    }
    return () => { addToastFn = null }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in"
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}
