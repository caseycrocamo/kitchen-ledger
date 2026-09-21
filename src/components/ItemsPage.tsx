import { ItemList } from './ItemList'
import { Toolbar } from './Toolbar'
import type { Item } from '../types'

interface ItemsPageProps {
  onEdit: (item: Item) => void
}

export function ItemsPage({ onEdit }: ItemsPageProps) {
  return (
    <>
      <Toolbar />
      <ItemList onEdit={onEdit} />
    </>
  )
}
