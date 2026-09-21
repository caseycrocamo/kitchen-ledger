import { useEffect } from 'preact/hooks'
import { ItemList } from './components/ItemList'
import { Toolbar } from './components/Toolbar'
import { loadItems } from './state'

export function App() {
  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div class="min-h-screen bg-slate-50">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-6xl px-4 py-4">
          <h1 class="text-2xl font-bold text-slate-900">Kitchen Ledger</h1>
          <p class="text-sm text-slate-500">Track what's in your kitchen.</p>
        </div>
      </header>

      <main class="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Toolbar />
        <ItemList />
      </main>
    </div>
  )
}
