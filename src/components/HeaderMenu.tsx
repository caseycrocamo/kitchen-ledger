import { useEffect, useState } from 'preact/hooks'
import { navigate } from '../router'

export function HeaderMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Menu"
        class="inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-600 hover:bg-slate-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
          <path
            fill-rule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75ZM2.75 14a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H2.75Z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div class="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                navigate('/dashboard')
                setOpen(false)
              }}
              class="block w-full text-left px-4 py-2.5 min-h-11 text-sm text-slate-700 hover:bg-slate-100"
            >
              Dashboard
            </button>
          </div>
        </>
      )}
    </div>
  )
}
