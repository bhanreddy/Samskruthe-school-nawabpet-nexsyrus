import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AdminHeader from '../../../src/components/AdminHeader';
import { useTheme } from '../../../src/hooks/useTheme';
import {
  contentService,
  ContentType,
  ContentPriority,
  ContentTargetPayload,
  ContentThoughtDetail,
  ContentNewsDetail,
  NewsSource,
} from '../../../src/services/contentService';
import { ThoughtCard } from '../../../src/components/content/ThoughtCard';
import { NewsCard } from '../../../src/components/content/NewsCard';
import { appendImagePart } from '../../../src/utils/multipartImage';
import * as Haptics from '../../../src/utils/haptics';

const THOUGHT_CATEGORIES = [
  'Education',
  'Discipline',
  'Leadership',
  'Kindness',
  'Success',
  'Learning',
  'Motivation',
  'Character',
];

const NEWS_CATEGORIES = [
  'Campus',
  'Education',
  'Science',
  'Technology',
  'Sports',
  'Environment',
  'Space',
  'Business',
  'Achievements',
  'National',
  'International',
];

const NEWS_SOURCES = [
  { name: 'SchoolIMS Editorial', url: '' },
];

export default function ContentEditorScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 840;

  const params = useLocalSearchParams<{ id?: string; type?: ContentType }>();
  const contentId = params.id;
  const initialType: ContentType = params.type === 'THOUGHT' ? 'THOUGHT' : 'NEWS';

  const [contentType, setContentType] = useState<ContentType>(initialType);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(Boolean(contentId));
  const [saving, setSaving] = useState<boolean>(false);

  // Core Fields
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [language, setLanguage] = useState('en');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [priority, setPriority] = useState<ContentPriority>('NORMAL');
  const [isFeatured, setIsFeatured] = useState(false);

  // Thought Specific
  const [quote, setQuote] = useState('');
  const [author, setAuthor] = useState('');
  const [authorDescription, setAuthorDescription] = useState('');
  const [thoughtCategory, setThoughtCategory] = useState(THOUGHT_CATEGORIES[0]);

  // News Specific
  const [headline, setHeadline] = useState('');
  const [newsCategory, setNewsCategory] = useState(NEWS_CATEGORIES[0]);
  const [sourceName, setSourceName] = useState(NEWS_SOURCES[0].name);
  const [sourceUrl, setSourceUrl] = useState(NEWS_SOURCES[0].url);
  const [newsSources, setNewsSources] = useState<NewsSource[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverStoragePath, setCoverStoragePath] = useState('');
  const [dirty, setDirty] = useState(false);
  const [location, setLocation] = useState('Campus');
  const [readingTime, setReadingTime] = useState('2');

  // Audience Targeting
  const [targetType, setTargetType] = useState<'SCHOOL' | 'ROLE' | 'CLASS'>('SCHOOL');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['student', 'parent', 'teacher']);
  const [selectedClass, setSelectedClass] = useState('8');

  // Scheduling
  const [publishMode, setPublishMode] = useState<'IMMEDIATE' | 'SCHEDULE'>('IMMEDIATE');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Existing item metadata
  const [existingStatus, setExistingStatus] = useState<string>('DRAFT');

  // Load existing content if editing
  useEffect(() => {
    if (!contentId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const item = await contentService.getContentItem(contentId);
        if (!mounted || !item) return;

        setContentType(item.type);
        setTitle(item.title || '');
        setSummary(item.summary || '');
        setBody(item.body || '');
        setLanguage(item.language || 'en');
        setCoverImageUrl(item.cover_image_url || '');
        setPriority(item.priority || 'NORMAL');
        setIsFeatured(Boolean(item.is_featured));
        setExistingStatus(item.status);

        if (item.thought || item.quote) {
          setQuote(item.thought?.quote || item.quote || '');
          setAuthor(item.thought?.author || item.author || '');
          setAuthorDescription(item.thought?.author_description || item.author_description || '');
          if (item.thought?.category || item.category || (item as any).thought_category) {
            setThoughtCategory(item.thought?.category || item.category || (item as any).thought_category || THOUGHT_CATEGORIES[0]);
          }
        }

        if (item.news || item.headline) {
          setHeadline(item.news?.headline || item.headline || item.title || '');
          if (item.news?.category || item.news_category) {
            setNewsCategory(item.news?.category || item.news_category || NEWS_CATEGORIES[0]);
          }
          setSourceName(item.news?.source_name || item.source_name || '');
          setSourceUrl(item.news?.source_url || item.source_url || '');
          setLocation(item.news?.location || item.location || 'Campus');
          setReadingTime(String(item.news?.reading_time || item.reading_time || 2));
        }

        if (item.scheduled_at) {
          setPublishMode('SCHEDULE');
          setScheduleDateTime(new Date(item.scheduled_at).toISOString().slice(0, 16));
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load content item');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [contentId]);

  // Dynamic estimate of reading time for news
  useEffect(() => {
    if (contentType === 'NEWS') {
      const words = (body + ' ' + summary).trim().split(/\s+/).filter(Boolean).length;
      const mins = Math.max(1, Math.round(words / 150));
      setReadingTime(String(mins));
    }
  }, [body, summary, contentType]);

  // Construct target array
  const buildTargets = (): ContentTargetPayload[] => {
    if (targetType === 'SCHOOL') {
      return [{ target_type: 'SCHOOL', target_id: 'all' }];
    }
    if (targetType === 'ROLE') {
      return selectedRoles.map((r) => ({ target_type: 'ROLE', target_id: r }));
    }
    return [{ target_type: 'CLASS', target_id: selectedClass }];
  };

  const markDirty = () => setDirty(true);
  const onDirtyText = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setDirty(true);
  };

  useEffect(() => {
    contentService.listSources().then((sources) => {
      if (sources?.length) setNewsSources(sources);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (!dirty || saving) return;
      e.preventDefault();
      Alert.alert('Unsaved changes', 'Leave without saving this draft?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsub;
  }, [dirty, saving, navigation]);

  const handlePickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a cover image.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    try {
      setUploadingCover(true);
      const asset = picked.assets[0];
      const form = new FormData();
      await appendImagePart(form, asset.uri, 'file', asset.fileName || 'cover.jpg', asset.mimeType || 'image/jpeg');
      const uploaded = await contentService.uploadMedia(form);
      setCoverImageUrl(uploaded.url);
      setCoverStoragePath(uploaded.storagePath);
      setDirty(true);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Could not optimize and store this image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async (targetStatus: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'SCHEDULED') => {
    // Validation
    if (contentType === 'THOUGHT') {
      if (!quote.trim()) {
        Alert.alert('Validation Error', 'Please enter a thought quote.');
        return;
      }
      if (!author.trim()) {
        Alert.alert('Validation Error', 'Please enter the quote author.');
        return;
      }
    } else {
      if (!headline.trim()) {
        Alert.alert('Validation Error', 'Please enter a news headline.');
        return;
      }
      if (!summary.trim()) {
        Alert.alert('Validation Error', 'Please enter a news summary.');
        return;
      }
    }

    if (publishMode === 'SCHEDULE' && targetStatus === 'SCHEDULED' && !scheduleDateTime) {
      Alert.alert('Validation Error', 'Please enter a future scheduled date & time.');
      return;
    }

    try {
      setSaving(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const targets = buildTargets();
      const contentPayload: any = {
        type: contentType,
        title: contentType === 'THOUGHT' ? `Thought by ${author}` : headline,
        summary: contentType === 'THOUGHT' ? quote.slice(0, 150) : summary,
        body: contentType === 'NEWS' ? body || summary : quote,
        language,
        priority,
        is_featured: isFeatured,
        cover_image_url: coverImageUrl || undefined,
        cover_storage_path: coverStoragePath || undefined,
        targets,
      };

      if (contentType === 'THOUGHT') {
        contentPayload.quote = quote.trim();
        contentPayload.author = author.trim();
        contentPayload.author_description = authorDescription.trim() || undefined;
        contentPayload.category = thoughtCategory;
      } else {
        contentPayload.headline = headline.trim();
        contentPayload.category = newsCategory;
        contentPayload.source_name = sourceName.trim();
        contentPayload.source_url = sourceUrl.trim() || undefined;
        contentPayload.location = location.trim();
        contentPayload.reading_time = parseInt(readingTime, 10) || 2;
      }

      let savedId = contentId;

      if (contentId) {
        await contentService.updateContent(contentId, contentPayload);
      } else {
        const created = await contentService.createContent({
          ...contentPayload,
          status: 'DRAFT',
        });
        savedId = created.id;
      }

      // Perform status workflow action if not staying draft
      if (savedId) {
        if (targetStatus === 'SUBMITTED') {
          await contentService.submitContent(savedId);
          Alert.alert('Submitted', 'Content has been submitted for editorial review.');
        } else if (targetStatus === 'PUBLISHED') {
          await contentService.publishContent(savedId);
          Alert.alert('Published', 'Content is now live in SchoolIMS Daily.');
        } else if (targetStatus === 'SCHEDULED' && scheduleDateTime) {
          await contentService.scheduleContent(savedId, new Date(scheduleDateTime).toISOString());
          Alert.alert('Scheduled', `Content scheduled for ${new Date(scheduleDateTime).toLocaleString()}.`);
        } else {
          Alert.alert('Draft Saved', 'Your changes have been saved.');
        }
      }

      router.replace('/admin/content' as any);
      setDirty(false);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Construct mock models for Live Preview
  const previewThought: ContentThoughtDetail = useMemo(
    () => ({
      id: contentId || 'preview-id',
      type: 'THOUGHT',
      title: `Thought by ${author || 'Author'}`,
      quote: quote || 'Kindness is a language which the deaf can hear and the blind can see.',
      author: author || 'Author Name',
      author_description: authorDescription || 'Author Description',
      category: thoughtCategory,
      language,
      cover_image_url: coverImageUrl || undefined,
      status: 'PUBLISHED',
      priority,
      is_featured: isFeatured,
      created_at: new Date().toISOString(),
    }),
    [contentId, quote, author, authorDescription, thoughtCategory, language, coverImageUrl, priority, isFeatured]
  );

  const previewNews: ContentNewsDetail = useMemo(
    () => ({
      id: contentId || 'preview-id',
      type: 'NEWS',
      title: headline || 'Headline of the Story',
      headline: headline || 'Lead Headline of the Story',
      summary: summary || 'A concise summary highlighting the most impactful details of the event.',
      body: body || summary || 'Full article text appears here...',
      source_name: sourceName || 'School Desk',
      source_url: sourceUrl || undefined,
      category: newsCategory,
      location: location || 'Campus',
      reading_time: parseInt(readingTime, 10) || 2,
      cover_image_url: coverImageUrl || undefined,
      status: 'PUBLISHED',
      priority,
      is_featured: isFeatured,
      created_at: new Date().toISOString(),
      views_count: 0,
      likes_count: 0,
      bookmarks_count: 0,
    }),
    [contentId, headline, summary, body, sourceName, sourceUrl, newsCategory, location, readingTime, coverImageUrl, priority, isFeatured]
  );

  if (loading) {
    return (
      <View style={[styles.root, isDark ? styles.rootDark : styles.rootLight]}>
        <AdminHeader title="Content Editor" showBackButton={true} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6D28D9" />
          <Text style={styles.loadingText}>Loading content details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, isDark ? styles.rootDark : styles.rootLight]}>
      <AdminHeader
        title={contentId ? 'Edit Content' : 'Create Content'}
        showBackButton={true}
        rightAction={
          contentId
            ? {
                icon: 'git-branch-outline',
                onPress: () => router.push(`/admin/content/versions?id=${contentId}` as any),
              }
            : undefined
        }
      />

      {/* Editor Sub-Header / Controls */}
      <View style={[styles.editorControls, isDark ? styles.controlsDark : styles.controlsLight]}>
        {/* Type Toggle (Disabled if editing existing item) */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            disabled={Boolean(contentId)}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setContentType('THOUGHT');
            }}
            style={[
              styles.typeButton,
              contentType === 'THOUGHT' && styles.activeTypeButton,
            ]}
          >
            <Ionicons
              name="bulb-outline"
              size={15}
              color={contentType === 'THOUGHT' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.typeButtonText,
                contentType === 'THOUGHT' && styles.activeTypeText,
              ]}
            >
              Daily Thought
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={Boolean(contentId)}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setContentType('NEWS');
            }}
            style={[
              styles.typeButton,
              contentType === 'NEWS' && styles.activeTypeButton,
            ]}
          >
            <Ionicons
              name="newspaper-outline"
              size={15}
              color={contentType === 'NEWS' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.typeButtonText,
                contentType === 'NEWS' && styles.activeTypeText,
              ]}
            >
              Daily News
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Preview Toggle Button */}
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsPreviewMode(!isPreviewMode);
          }}
          style={[styles.previewToggleBtn, isPreviewMode && styles.activePreviewToggle]}
        >
          <Ionicons
            name={isPreviewMode ? 'create-outline' : 'phone-portrait-outline'}
            size={16}
            color={isPreviewMode ? '#FFFFFF' : '#6D28D9'}
          />
          <Text
            style={[
              styles.previewToggleText,
              isPreviewMode && styles.activePreviewToggleText,
            ]}
          >
            {isPreviewMode ? 'Back to Editor' : 'Live Preview'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Container */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
      >
        {isPreviewMode ? (
          /* LIVE PREVIEW SCREEN */
          <View style={styles.previewContainer}>
            <View style={styles.previewBadge}>
              <Ionicons name="sparkles" size={14} color="#6D28D9" />
              <Text style={styles.previewBadgeText}>
                INTERACTIVE MOBILE PREVIEW (STUDENT VIEW)
              </Text>
            </View>

            <View style={styles.mobileFrame}>
              {contentType === 'THOUGHT' ? (
                <ThoughtCard thought={previewThought} />
              ) : (
                <View style={{ gap: 14 }}>
                  <NewsCard item={previewNews} variant="hero" />
                  <NewsCard item={previewNews} variant="standard" />
                </View>
              )}
            </View>
          </View>
        ) : (
          /* EDITING FORM */
          <View style={[styles.formContainer, isDesktop && styles.desktopGrid]}>
            {/* Left Column: Content Fields */}
            <View style={[styles.formColumn, isDesktop && { flex: 1.5 }]}>
              {contentType === 'THOUGHT' ? (
                /* THOUGHT SPECIFIC FIELDS */
                <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
                  <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                    Quote & Attribution
                  </Text>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldHeader}>
                      <Text style={styles.fieldLabel}>Quote Statement *</Text>
                      <Text style={styles.charCount}>{quote.length} / 400</Text>
                    </View>
                    <TextInput
                      style={[styles.textArea, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="e.g. You cannot change your future, but you can change your habits..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={4}
                      maxLength={400}
                      value={quote}
                      onChangeText={onDirtyText(setQuote)}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Author / Speaker *</Text>
                    <TextInput
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="e.g. Dr. A.P.J. Abdul Kalam"
                      placeholderTextColor="#94A3B8"
                      value={author}
                      onChangeText={onDirtyText(setAuthor)}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Author Description / Title</Text>
                    <TextInput
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="e.g. Aerospace Scientist & 11th President of India"
                      placeholderTextColor="#94A3B8"
                      value={authorDescription}
                      onChangeText={onDirtyText(setAuthorDescription)}
                    />
                  </View>

                  {/* Category Chips */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Core Theme / Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                      {THOUGHT_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => {
                            setThoughtCategory(cat);
                            markDirty();
                          }}
                          style={[
                            styles.chip,
                            thoughtCategory === cat && styles.activeChip,
                            thoughtCategory !== cat && (isDark ? styles.chipDark : styles.chipLight),
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              thoughtCategory === cat && styles.activeChipText,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Cover image</Text>
                    <TouchableOpacity
                      onPress={handlePickCover}
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight, { justifyContent: 'center' }]}
                    >
                      <Text style={{ color: coverImageUrl ? '#15803D' : '#64748B', fontWeight: '600' }}>
                        {uploadingCover ? 'Optimizing image…' : coverImageUrl ? 'Cover uploaded — tap to replace' : 'Choose photo from library'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* NEWS SPECIFIC FIELDS */
                <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
                  <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                    News Editorial
                  </Text>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldHeader}>
                      <Text style={styles.fieldLabel}>Headline *</Text>
                      <Text style={styles.charCount}>{headline.length} / 150</Text>
                    </View>
                    <TextInput
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="e.g. ISRO Launches Next-Gen Climate Observation Satellite"
                      placeholderTextColor="#94A3B8"
                      maxLength={150}
                      value={headline}
                      onChangeText={onDirtyText(setHeadline)}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldHeader}>
                      <Text style={styles.fieldLabel}>Executive Summary *</Text>
                      <Text style={styles.charCount}>{summary.length} / 350</Text>
                    </View>
                    <TextInput
                      style={[styles.textArea, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="A 2-3 sentence overview highlighting what happened and why it matters."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      maxLength={350}
                      value={summary}
                      onChangeText={onDirtyText(setSummary)}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Full Editorial Content</Text>
                    <TextInput
                      style={[
                        styles.textArea,
                        { minHeight: 140 },
                        isDark ? styles.inputDark : styles.inputLight,
                      ]}
                      placeholder="Full educational writeup or article body..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={8}
                      value={body}
                      onChangeText={onDirtyText(setBody)}
                    />
                  </View>

                  {/* News Category Chips */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                      {NEWS_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => {
                            setNewsCategory(cat);
                            markDirty();
                          }}
                          style={[
                            styles.chip,
                            newsCategory === cat && styles.activeChip,
                            newsCategory !== cat && (isDark ? styles.chipDark : styles.chipLight),
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              newsCategory === cat && styles.activeChipText,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Source Attribution */}
                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Verified Source</Text>
                      {newsSources.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                          {newsSources.map((source) => {
                            const selected = sourceName === source.name;
                            return (
                              <TouchableOpacity
                                key={source.id || source.name}
                                onPress={() => {
                                  setSourceName(source.name);
                                  setSourceUrl(source.source_url || '');
                                  markDirty();
                                }}
                                style={[
                                  styles.chip,
                                  selected && styles.activeChip,
                                  !selected && (isDark ? styles.chipDark : styles.chipLight),
                                ]}
                              >
                                <Text style={[styles.chipText, selected && styles.activeChipText]}>
                                  {source.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                      <TextInput
                        style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                        placeholder="e.g. School Desk, ISRO"
                        placeholderTextColor="#94A3B8"
                        value={sourceName}
                        onChangeText={onDirtyText(setSourceName)}
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Location</Text>
                      <TextInput
                        style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                        placeholder="e.g. Hyderabad, Global"
                        placeholderTextColor="#94A3B8"
                        value={location}
                        onChangeText={onDirtyText(setLocation)}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Original Source URL (Optional)</Text>
                    <TextInput
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="https://..."
                      placeholderTextColor="#94A3B8"
                      value={sourceUrl}
                      onChangeText={onDirtyText(setSourceUrl)}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Cover image</Text>
                    <TouchableOpacity
                      onPress={handlePickCover}
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight, { justifyContent: 'center' }]}
                    >
                      <Text style={{ color: coverImageUrl ? '#15803D' : '#64748B', fontWeight: '600' }}>
                        {uploadingCover ? 'Optimizing image…' : coverImageUrl ? 'Cover uploaded — tap to replace' : 'Choose photo from library'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Right Column: Targeting, Schedule & Publishing Actions */}
            <View style={[styles.formColumn, isDesktop && { flex: 1 }]}>
              {/* Audience Targeting Card */}
              <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
                <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                  Audience Targeting
                </Text>

                <View style={styles.targetingRow}>
                  {(['SCHOOL', 'ROLE', 'CLASS'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setTargetType(type)}
                      style={[
                        styles.targetBtn,
                        targetType === type && styles.activeTargetBtn,
                        targetType !== type && (isDark ? styles.chipDark : styles.chipLight),
                      ]}
                    >
                      <Text
                        style={[
                          styles.targetBtnText,
                          targetType === type && styles.activeTargetBtnText,
                        ]}
                      >
                        {type === 'SCHOOL' ? 'All Campus' : type === 'ROLE' ? 'By Role' : 'By Class'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {targetType === 'ROLE' && (
                  <View style={styles.roleSelectionRow}>
                    {['student', 'parent', 'teacher'].map((r) => {
                      const isSelected = selectedRoles.includes(r);
                      return (
                        <TouchableOpacity
                          key={r}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedRoles(selectedRoles.filter((x) => x !== r));
                            } else {
                              setSelectedRoles([...selectedRoles, r]);
                            }
                          }}
                          style={[
                            styles.roleChip,
                            isSelected && styles.activeRoleChip,
                            !isSelected && (isDark ? styles.chipDark : styles.chipLight),
                          ]}
                        >
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={14}
                            color={isSelected ? '#6D28D9' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.roleChipText,
                              isSelected && styles.activeRoleChipText,
                            ]}
                          >
                            {r.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {targetType === 'CLASS' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Target Class</Text>
                    <TextInput
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="e.g. 8, 9, 10"
                      placeholderTextColor="#94A3B8"
                      value={selectedClass}
                      onChangeText={setSelectedClass}
                    />
                  </View>
                )}
              </View>

              {/* Display & Priority Settings */}
              <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
                <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                  Display Options
                </Text>

                <View style={styles.switchRow}>
                  <View>
                    <Text style={[styles.switchLabel, isDark ? styles.textDark : styles.textLight]}>
                      Lead / Featured Story
                    </Text>
                    <Text style={styles.switchSubtitle}>
                      Showcase at the top of the daily edition
                    </Text>
                  </View>
                  <Switch
                    value={isFeatured}
                    onValueChange={setIsFeatured}
                    trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                    thumbColor={isFeatured ? '#6D28D9' : '#FFFFFF'}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Publication Priority</Text>
                  <View style={styles.priorityRow}>
                    {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPriority(p)}
                        style={[
                          styles.priorityBtn,
                          priority === p && styles.activePriorityBtn,
                          priority !== p && (isDark ? styles.chipDark : styles.chipLight),
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityBtnText,
                            priority === p && styles.activePriorityText,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Scheduling & Publish Actions Card */}
              <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
                <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                  Publishing Workflow
                </Text>

                <View style={styles.publishModeRow}>
                  <TouchableOpacity
                    onPress={() => setPublishMode('IMMEDIATE')}
                    style={[
                      styles.modeBtn,
                      publishMode === 'IMMEDIATE' && styles.activeModeBtn,
                      publishMode !== 'IMMEDIATE' && (isDark ? styles.chipDark : styles.chipLight),
                    ]}
                  >
                    <Ionicons
                      name="flash-outline"
                      size={14}
                      color={publishMode === 'IMMEDIATE' ? '#FFFFFF' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        publishMode === 'IMMEDIATE' && styles.activeModeText,
                      ]}
                    >
                      Publish Now
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPublishMode('SCHEDULE')}
                    style={[
                      styles.modeBtn,
                      publishMode === 'SCHEDULE' && styles.activeModeBtn,
                      publishMode !== 'SCHEDULE' && (isDark ? styles.chipDark : styles.chipLight),
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={publishMode === 'SCHEDULE' ? '#FFFFFF' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        publishMode === 'SCHEDULE' && styles.activeModeText,
                      ]}
                    >
                      Schedule
                    </Text>
                  </TouchableOpacity>
                </View>

                {publishMode === 'SCHEDULE' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Scheduled Date & Time (YYYY-MM-DDTHH:mm)</Text>
                    <TextInput
                      style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
                      placeholder="2026-09-15T08:00"
                      placeholderTextColor="#94A3B8"
                      value={scheduleDateTime}
                      onChangeText={setScheduleDateTime}
                    />
                  </View>
                )}

                {/* Primary Action Buttons */}
                <View style={styles.actionButtonsCol}>
                  {publishMode === 'IMMEDIATE' ? (
                    <TouchableOpacity
                      onPress={() => handleSave('PUBLISHED')}
                      disabled={saving}
                      style={[styles.primaryActionBtn, styles.publishBtn]}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                          <Text style={styles.primaryActionBtnText}>Publish Immediately</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleSave('SCHEDULED')}
                      disabled={saving}
                      style={[styles.primaryActionBtn, styles.scheduleBtn]}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="time" size={16} color="#FFFFFF" />
                          <Text style={styles.primaryActionBtnText}>Schedule Publication</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleSave('SUBMITTED')}
                    disabled={saving}
                    style={styles.secondaryActionBtn}
                  >
                    <Text style={styles.secondaryActionText}>Submit for Editorial Review</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSave('DRAFT')}
                    disabled={saving}
                    style={styles.tertiaryActionBtn}
                  >
                    <Text style={styles.tertiaryActionText}>Save as Draft</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootLight: {
    backgroundColor: '#F8FAFC',
  },
  rootDark: {
    backgroundColor: '#0A0F1D',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
  },
  editorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  controlsLight: {
    backgroundColor: '#FFFFFF',
  },
  controlsDark: {
    backgroundColor: '#151D30',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  activeTypeButton: {
    backgroundColor: '#6D28D9',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTypeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6D28D9',
    gap: 6,
  },
  activePreviewToggle: {
    backgroundColor: '#6D28D9',
  },
  previewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  activePreviewToggleText: {
    color: '#FFFFFF',
  },
  mainScroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 20,
    paddingBottom: 60,
  },
  desktopGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  formContainer: {
    gap: 16,
  },
  formColumn: {
    gap: 16,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardDark: {
    backgroundColor: '#151D30',
    borderColor: '#1E293B',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  inputLight: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  inputDark: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  activeChip: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  chipLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  chipDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  targetingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  activeTargetBtn: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  targetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTargetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  roleSelectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  activeRoleChip: {
    borderColor: '#6D28D9',
    backgroundColor: '#EDE9FE',
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  activeRoleChipText: {
    color: '#6D28D9',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  activePriorityBtn: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  priorityBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  activePriorityText: {
    color: '#FFFFFF',
  },
  publishModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  activeModeBtn: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeModeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionButtonsCol: {
    gap: 8,
    marginTop: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  publishBtn: {
    backgroundColor: '#15803D',
  },
  scheduleBtn: {
    backgroundColor: '#B45309',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
  },
  secondaryActionText: {
    color: '#6D28D9',
    fontWeight: '700',
    fontSize: 13,
  },
  tertiaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tertiaryActionText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 12,
  },
  // Preview
  previewContainer: {
    alignItems: 'center',
    gap: 14,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.5,
  },
  mobileFrame: {
    width: '100%',
    maxWidth: 420,
  },
  textLight: {
    color: '#0F172A',
  },
  textDark: {
    color: '#F8FAFC',
  },
});
