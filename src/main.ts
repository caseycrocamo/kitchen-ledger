import { h, render } from 'preact'
import './style.css'
import { App } from './App'

// .ts (not .tsx), so no JSX here — use the `h` pragma directly.
const app = document.querySelector<HTMLDivElement>('#app')!
render(h(App, {}), app)
