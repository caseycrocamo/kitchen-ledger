import { useState } from 'preact/hooks'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}

export function TagInput({ value, onChange, suggestions }: TagInputProps) {
  const [text, setText] = useState('')

  function commit(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    if (value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setText('')
      return
    }
    onChange([...value, trimmed])
    setText('')
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(text)
    } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
      removeAt(value.length - 1)
    }
  }

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(text.trim().toLowerCase()) &&
      !value.some((t) => t.toLowerCase() === s.toLowerCase()),
  )
  const showSuggestions = text.trim().length > 0 && filteredSuggestions.length > 0

  return (
    <div class="relative">
      <div class="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1.5 focus-within:border-emerald-500">
        {value.map((tag, i) => (
          <span
            key={tag}
            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove ${tag}`}
              class="text-slate-400 hover:text-slate-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Add tags…' : ''}
          class="min-w-[6rem] flex-1 border-none px-1 py-1 text-sm focus:outline-none"
        />
      </div>
      {showSuggestions && (
        <ul class="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg">
          {filteredSuggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => commit(s)}
                class="block w-full px-3 py-2 text-left hover:bg-slate-100"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
