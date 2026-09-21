// Add/edit item modal (chunk 07). Shared between both flows: `mode="create"` starts
// blank, `mode="edit"` pre-fills from `item` and additionally allows replacing or
// removing the existing image.

import { useEffect, useRef, useState } from 'preact/hooks'
import { ApiError, createItem, updateItem } from '../api'
import { allTags, items, loadTags } from '../state'
import type { Item } from '../types'
import { TagInput } from './TagInput'

interface ItemFormModalProps {
  mode: 'create' | 'edit'
  item?: Item
  onClose: () => void
}

export function ItemFormModal({ mode, item, onClose }: ItemFormModalProps) {
  const [name, setName] = useState(item?.name ?? '')
  const [tags, setTags] = useState<string[]>(item?.tags ?? [])
  const [servings, setServings] = useState(item?.servings ?? 1)

  // Image handling: `imageFile` is a freshly-picked file awaiting upload. `imageRemoved`
  // means the user explicitly cleared the (existing) image without picking a replacement.
  // `previewUrl` is what's shown in the thumbnail — either an object URL for a freshly
  // picked file, or the existing image's server URL in edit mode.
  const existingImageUrl = item?.image_filename ? `/api/uploads/${item.image_filename}` : null
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  function handleFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null
    if (file) {
      setImageFile(file)
      setImageRemoved(false)
    }
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImageRemoved(true)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      let result: Item
      if (mode === 'create') {
        result = await createItem({
          name,
          tags,
          servings,
          image: imageFile,
        })
        items.value = [...items.value, result]
      } else {
        result = await updateItem(item!.id, {
          name,
          tags,
          servings,
          image: imageFile,
          removeImage: imageRemoved && !imageFile,
        })
        items.value = items.value.map((i) => (i.id === result.id ? result : i))
      }
      loadTags()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      class="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        class="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 class="mb-4 text-lg font-bold text-slate-900">
          {mode === 'create' ? 'Add item' : 'Edit item'}
        </h2>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <div>
            <label for="item-name" class="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label for="item-tags" class="mb-1 block text-sm font-medium text-slate-700">
              Tags
            </label>
            <TagInput value={tags} onChange={setTags} suggestions={allTags.value} />
          </div>

          <div>
            <label for="item-servings" class="mb-1 block text-sm font-medium text-slate-700">
              Servings
            </label>
            <input
              id="item-servings"
              type="number"
              min={0}
              value={servings}
              onInput={(e) => {
                const raw = (e.target as HTMLInputElement).valueAsNumber
                setServings(Number.isNaN(raw) ? 0 : Math.max(0, Math.trunc(raw)))
              }}
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Photo</label>
            <div class="flex items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Item preview"
                  class="h-16 w-16 rounded-md border border-slate-200 object-cover"
                />
              ) : (
                <div class="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
                  No photo
                </div>
              )}
              <div class="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  class="text-sm text-slate-600"
                />
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    class="self-start min-h-11 flex items-center text-sm text-red-600 hover:underline"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div class="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              class="rounded-md border border-slate-300 px-4 py-2.5 min-h-11 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              class="rounded-md bg-emerald-600 px-4 py-2.5 min-h-11 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : mode === 'create' ? 'Add item' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
