import { useEffect } from 'preact/hooks'
import { loadItems } from './state'
import { ItemList } from './components/ItemList'

export function App() {
  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div class="min-h-screen bg-slate-50">
      <header class="bg-white border-b border-slate-200">
        <div class="max-w-6xl mx-auto px-4 py-4">
          <h1 class="text-2xl font-bold text-slate-900">Kitchen Ledger</h1>
          <p class="text-sm text-slate-500">Track what's in your kitchen.</p>
        </div>
      </header>
      <main class="max-w-6xl mx-auto px-4 py-6">
        <ItemList />
      </main>
    </div>
  )
}
