import { useEffect } from 'preact/hooks'
import { items, loadError, loading, loadItems } from './state'

export function App() {
  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div class="min-h-screen bg-slate-50">
      <div class="mx-auto max-w-3xl px-4 py-10 text-center space-y-4">
        <h1 class="text-4xl font-bold text-slate-900">Kitchen Ledger</h1>
        <p class="text-slate-600">Track what's in your kitchen.</p>
        {loading.value && <p class="text-slate-500">Loading…</p>}
        {loadError.value && (
          <p class="text-red-600">Couldn't load items: {loadError.value}</p>
        )}
        {!loading.value && !loadError.value && (
          <p class="text-slate-500">{items.value.length} item(s)</p>
        )}
      </div>
    </div>
  )
}
