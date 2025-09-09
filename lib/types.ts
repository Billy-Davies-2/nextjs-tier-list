export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'

export interface Item {
  id: number
  name: string
  tier: Tier
  image: string | null
  user_id?: number
}

export type Grouped = Record<Tier, Item[]>

export interface User {
  id: number
  name: string
}