export interface Item {
  id: number;
  name: string;
  tags: string[];
  servings: number;
  image_filename: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServingBatch {
  id: number;
  item_id: number;
  quantity: number;
  created_at: string;
}

export interface ConsumptionEvent {
  id: number;
  item_id: number;
  quantity: number;
  age_days: number;
  occurred_at: string;
}
