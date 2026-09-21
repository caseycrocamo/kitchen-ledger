import { signal } from '@preact/signals'

export const currentPath = signal(window.location.pathname)

export function navigate(path: string): void {
  if (path === currentPath.value) return
  window.history.pushState(null, '', path)
  currentPath.value = path
}

window.addEventListener('popstate', () => {
  currentPath.value = window.location.pathname
})
