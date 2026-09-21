import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="min-h-screen flex items-center justify-center bg-slate-50">
    <div class="text-center space-y-4">
      <h1 class="text-4xl font-bold text-slate-900">Kitchen Ledger</h1>
      <p class="text-slate-600">Track what's in your kitchen.</p>
    </div>
  </div>
`
