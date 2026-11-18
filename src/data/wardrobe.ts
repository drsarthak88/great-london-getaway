/**
 * Jack's wardrobe. Each item fills one slot. Items cost coins today; `pack` marks items
 * that will come from (possibly paid) costume packs later. The catalogue is data so
 * new items and packs can ship without code changes to the shop.
 */
export type OutfitSlot = 'head' | 'neck' | 'body';

export interface OutfitItem {
  id: string;
  name: string;
  slot: OutfitSlot;
  /** Price in coins (ignored for pack items). */
  price: number;
  description: string;
  /** Set for items that come from a costume pack rather than coins. */
  pack?: string;
}

export const OUTFITS: OutfitItem[] = [
  { id: 'flatCap', name: 'Flat Cap', slot: 'head', price: 300, description: 'A tweedy cap for a cheeky chap.' },
  { id: 'bowler', name: 'Bowler Hat', slot: 'head', price: 600, description: 'Very proper. Very round.' },
  { id: 'unionScarf', name: 'Union Jack Scarf', slot: 'neck', price: 450, description: 'Flaps splendidly in the wind.' },
  { id: 'pearlyJacket', name: 'Pearly King Jacket', slot: 'body', price: 1500, description: 'Covered in shiny pearl buttons, fit for a king.' },
];

export interface CostumePack {
  id: string;
  name: string;
  description: string;
  /** Not on sale yet: shown in the shop as "coming soon". */
  available: boolean;
}

export const PACKS: CostumePack[] = [
  { id: 'royalPack', name: 'Royal Pack', description: 'Crowns, capes and a very fancy sceptre.', available: false },
  { id: 'rockPack', name: 'Camden Rock Pack', description: 'Leather jackets, bright mohawks and big boots.', available: false },
];

export function outfitById(id: string | null | undefined): OutfitItem | undefined {
  return OUTFITS.find((o) => o.id === id);
}
