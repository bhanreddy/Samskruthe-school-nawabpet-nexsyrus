import type { CelebrationSlideItem } from '../../services/celebrationTypes';

export function isExpiredCelebrationSlide(slide: CelebrationSlideItem, now = Date.now()) {
  if (slide.slide_type !== 'CELEBRATION' || !slide.valid_until) return false;
  const until = new Date(slide.valid_until).getTime();
  return !Number.isNaN(until) && until < now;
}

/**
 * Drops expired celebration banners and extra individual cards when a grouped
 * birthday slide is already present, so cached payloads cannot flood the carousel.
 */
export function filterActiveHeroSlides<T extends CelebrationSlideItem>(slides: T[], now = Date.now()): T[] {
  const live = (slides || []).filter((slide) => !isExpiredCelebrationSlide(slide, now));
  const hasGrouped = live.some((slide) => slide.slide_type === 'CELEBRATION' && slide.is_grouped);
  if (!hasGrouped) return live;
  return live.filter((slide) => slide.slide_type !== 'CELEBRATION' || slide.is_grouped);
}
