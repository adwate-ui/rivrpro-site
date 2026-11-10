import type { ImageMetadata } from 'astro';

const photos = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp,avif}', { eager: true });
const screens = import.meta.glob<{ default: ImageMetadata }>('../assets/screens/*.png', { eager: true });

/** The owner's club photos, by file name (src/assets/photos/<name>.jpg). */
export const PHOTO_NAMES = ['hero', 'room', 'tables', 'lounge', 'kitchen', 'technology'] as const;
export type PhotoName = (typeof PHOTO_NAMES)[number];

/** Platform screenshots from staging, by file name (src/assets/screens/<name>.png). */
export const SCREEN_NAMES = ['app-home', 'app-card', 'console-floor', 'console-members', 'tablet', 'tv-waitlist'] as const;
export type ScreenName = (typeof SCREEN_NAMES)[number];

function byName(files: Record<string, { default: ImageMetadata }>, name: string): ImageMetadata | undefined {
  const match = Object.entries(files).find(([path]) => path.split('/').pop()!.replace(/\.\w+$/, '') === name);
  return match?.[1].default;
}

export const photo = (name: PhotoName) => byName(photos, name);
export const screen = (name: ScreenName) => byName(screens, name);
