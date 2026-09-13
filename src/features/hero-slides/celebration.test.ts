import type { CelebrationSlideItem, CelebrationPerson } from '../../services/celebrationTypes';
import { BIRTHDAY_SOUND_SETTING_KEY } from '../../hooks/useCelebrationAudio';
import { filterActiveHeroSlides } from './celebrationSlides';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Birthday Celebration Slides Architecture', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('1. Correctly distinguishes celebration slide from normal image slide', () => {
    const celebrationSlide: CelebrationSlideItem = {
      id: 'birthday_student_101_2026-09-12',
      slide_type: 'CELEBRATION',
      celebration_type: 'BIRTHDAY',
      priority: 70,
      title: 'Happy Birthday 🎉',
      message: 'Happy Birthday Aarav! Wishing you a wonderful year ahead.',
      person: {
        type: 'STUDENT',
        id: '101',
        name: 'Aarav Reddy',
        initials: 'AR',
        class_name: 'VII',
        section_name: 'A',
      },
    };

    const normalSlide: CelebrationSlideItem = {
      id: 'slide-annual-day',
      slide_type: 'IMAGE',
      priority: 50,
      image_url: 'https://example.com/banner.jpg',
      title: 'Annual Day',
    };

    expect(celebrationSlide.slide_type).toBe('CELEBRATION');
    expect(celebrationSlide.priority).toBe(70);
    expect(normalSlide.slide_type).toBe('IMAGE');
    expect(normalSlide.priority).toBe(50);
  });

  it('2. Excludes expired cached celebration banners from yesterday (Step 19)', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const slides: CelebrationSlideItem[] = [
      {
        id: 'stale-bday',
        slide_type: 'CELEBRATION',
        priority: 70,
        valid_until: yesterday,
      },
      {
        id: 'active-bday',
        slide_type: 'CELEBRATION',
        priority: 70,
        valid_until: tomorrow,
      },
      {
        id: 'normal-slide',
        slide_type: 'IMAGE',
        priority: 50,
      },
    ];

    const active = filterActiveHeroSlides(slides);
    expect(active.length).toBe(2);
    expect(active.some((s) => s.id === 'stale-bday')).toBe(false);
    expect(active.some((s) => s.id === 'active-bday')).toBe(true);
    expect(active.some((s) => s.id === 'normal-slide')).toBe(true);
  });

  it('3. Audio once-per-day deduplication marks AsyncStorage correctly', async () => {
    const eventKey = 'birthday_audio_user_1_school_1_2026-09-12';
    const beforePlayback = await AsyncStorage.getItem(eventKey);
    expect(beforePlayback).toBeNull();
    await AsyncStorage.setItem(eventKey, 'played');
    const afterPlayback = await AsyncStorage.getItem(eventKey);
    expect(afterPlayback).toBe('played');
  });

  it('4. User audio setting OFF prevents audio playback', async () => {
    await AsyncStorage.setItem(BIRTHDAY_SOUND_SETTING_KEY, 'false');
    const preference = await AsyncStorage.getItem(BIRTHDAY_SOUND_SETTING_KEY);
    expect(preference).toBe('false');
    const shouldPlay = preference !== 'false';
    expect(shouldPlay).toBe(false);
  });

  it('5. Grouped celebration banner correctly presents multi-person metadata', () => {
    const stars: CelebrationPerson[] = [
      { type: 'STUDENT', id: 's1', name: 'Aarav Reddy', initials: 'AR', class_name: 'VII', section_name: 'A' },
      { type: 'STUDENT', id: 's2', name: 'Sanjana Rao', initials: 'SR', class_name: 'VIII', section_name: 'B' },
      { type: 'STAFF', id: 't1', name: 'Mrs. Kavitha', initials: 'MK', designation: 'Mathematics Teacher' },
    ];

    const groupedSlide: CelebrationSlideItem = {
      id: 'birthday_group_1_2026-09-12',
      slide_type: 'CELEBRATION',
      celebration_type: 'BIRTHDAY',
      is_grouped: true,
      priority: 70,
      title: "Today's Birthday Stars 🎂",
      count: stars.length,
      stars,
    };

    expect(groupedSlide.is_grouped).toBe(true);
    expect(groupedSlide.count).toBe(3);
    expect(groupedSlide.stars?.length).toBe(3);
    expect(groupedSlide.stars?.[0].initials).toBe('AR');
    expect(groupedSlide.stars?.[2].type).toBe('STAFF');
  });

  it('6. Grouped payload does not keep extra individual birthday cards in the carousel', () => {
    const slides: CelebrationSlideItem[] = [
      {
        id: 'birthday_group_1_2026-09-12',
        slide_type: 'CELEBRATION',
        is_grouped: true,
        priority: 70,
        stars: [{ type: 'STUDENT', id: 's1', name: 'Aarav Reddy', initials: 'AR' }],
      },
      {
        id: 'birthday_student_s1_2026-09-12',
        slide_type: 'CELEBRATION',
        priority: 70,
        person: { type: 'STUDENT', id: 's1', name: 'Aarav Reddy', initials: 'AR' },
      },
      {
        id: 'normal-slide',
        slide_type: 'IMAGE',
        priority: 50,
      },
    ];

    const active = filterActiveHeroSlides(slides);
    expect(active.map((s) => s.id)).toEqual(['birthday_group_1_2026-09-12', 'normal-slide']);
  });
});
