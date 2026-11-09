export type CosmeticSlot = 'avatar_frame' | 'app_theme';

export interface Cosmetic {
  id: string;
  name: string;
  description: string;
  price: number;
  slot: CosmeticSlot;
  previewClass: string;
}

export const COSMETICS: Cosmetic[] = [
  {
    id: 'avatar-frame-aurora',
    name: '極光頭像框',
    description: '為個人頭像加上藍綠極光邊框。',
    price: 30,
    slot: 'avatar_frame',
    previewClass: 'cosmetic-preview-aurora',
  },
  {
    id: 'avatar-frame-royal',
    name: '皇家頭像框',
    description: '金色光環，讓個人頭像更醒目。',
    price: 50,
    slot: 'avatar_frame',
    previewClass: 'cosmetic-preview-royal',
  },
  {
    id: 'theme-sakura',
    name: '櫻花主題',
    description: '以柔和的粉色漸層點綴介面。',
    price: 40,
    slot: 'app_theme',
    previewClass: 'cosmetic-preview-sakura',
  },
  {
    id: 'theme-ocean',
    name: '海洋主題',
    description: '以清爽的藍綠色點綴介面。',
    price: 40,
    slot: 'app_theme',
    previewClass: 'cosmetic-preview-ocean',
  },
];

export interface OwnedCosmetic {
  item_id: string;
  slot: CosmeticSlot;
  purchased_at: string;
  equipped: boolean;
}

export const getCosmetic = (id: string) => COSMETICS.find(item => item.id === id);
