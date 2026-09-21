import './style.css'
import { h, render } from 'preact'
import { App } from './App'

const app = document.querySelector<HTMLDivElement>('#app')!

render(h(App, null), app)
