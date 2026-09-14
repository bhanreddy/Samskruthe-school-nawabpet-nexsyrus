import React, { useMemo, useState } from 'react';
import AppTextInput from '@/src/components/AppTextInput';
import { styles as ds } from '@/src/theme/styles';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Keyboard,
  Pressable,
  Platform,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_THEME } from '../constants/adminTheme';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../theme/themes';
import ClayPasswordToggle from './ClayPasswordToggle';
import LogoLoader from './LogoLoader';
import { Avatar } from './Avatar';
import * as Haptics from '../utils/haptics';

export const FORM = {
  brand: ADMIN_THEME.colors.primary,
  violet: '#7C6FFF',
  coral: ADMIN_THEME.colors.secondary,
  sage: '#4DB6A5',
  gold: '#E8C47A',
  surface: (isDark: boolean) => (isDark ? '#161320' : '#FFFFFF'),
  field: (isDark: boolean) => (isDark ? '#221F30' : '#F6F3FB'),
  border: (isDark: boolean) => (isDark ? 'rgba(124, 111, 255, 0.18)' : 'rgba(102, 89, 144, 0.12)'),
  label: (isDark: boolean) => (isDark ? '#A89EC4' : '#6B6280'),
  text: (isDark: boolean) => (isDark ? '#EDE8F5' : '#2D2640'),
  muted: (isDark: boolean) => (isDark ? '#7A718F' : '#8E86A4'),
  canvas: (isDark: boolean) => (isDark ? '#0E0C14' : '#F3EFF8'),
};

export function clayField(isDark: boolean) {
  if (Platform.OS === 'web') {
    const drop = isDark ? 'rgba(45, 30, 70, 0.55)' : 'rgba(102, 89, 144, 0.14)';
    const light = isDark ? 'rgba(124, 111, 255, 0.07)' : 'rgba(255, 255, 255, 0.92)';
    const innerHi = isDark ? 'rgba(124, 111, 255, 0.10)' : 'rgba(255, 255, 255, 0.80)';
    const innerLo = isDark ? 'rgba(20, 15, 35, 0.35)' : 'rgba(102, 89, 144, 0.10)';
    return {
      boxShadow:
        `4px 4px 12px ${drop}, -3px -3px 10px ${light}, ` +
        `inset 1.5px 1.5px 2px ${innerHi}, inset -1.5px -1.5px 2px ${innerLo}`,
    } as any;
  }
  return {
    shadowColor: isDark ? '#3D2858' : '#665990',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.38 : 0.12,
    shadowRadius: 10,
    elevation: 3,
  } as any;
}

export function clayCard(isDark: boolean) {
  if (Platform.OS === 'web') {
    const drop = isDark ? 'rgba(35, 22, 55, 0.58)' : 'rgba(88, 70, 130, 0.14)';
    const light = isDark ? 'rgba(124, 111, 255, 0.06)' : 'rgba(255, 255, 255, 0.96)';
    return { boxShadow: `8px 12px 28px ${drop}, -4px -4px 16px ${light}` } as any;
  }
  return {
    shadowColor: isDark ? '#3D2858' : '#5A4A82',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.42 : 0.12,
    shadowRadius: 18,
    elevation: 6,
  } as any;
}

type AutofillMode = 'off' | 'password' | 'tel';

export function fieldAutofill(fieldKey: string, mode: AutofillMode = 'off') {
  const base: Record<string, unknown> = {
    autoComplete: mode === 'password' ? 'new-password' : 'off',
    textContentType: mode === 'password' ? 'newPassword' : 'none',
    autoCorrect: false,
  };
  if (Platform.OS !== 'web') return base;
  return {
    ...base,
    nativeID: fieldKey,
    id: fieldKey,
    name: fieldKey,
    'data-1p-ignore': 'true',
    'data-lpignore': 'true',
    'data-form-type': 'other',
  };
}

export const SECTION_COLORS = {
  personal: { accent: '#665990', light: '#EDE9F6', dark: '#2A2438' },
  academic: { accent: '#4DB6A5', light: '#E6F7F3', dark: '#1A2E28' },
  parents: { accent: '#F57964', light: '#FFF0ED', dark: '#3D2220' },
  additional: { accent: '#9B7EDE', light: '#F3EEFF', dark: '#2A1F40' },
  credentials: { accent: '#7C6FFF', light: '#EEEAFF', dark: '#252040' },
};

const AVATAR_GRADS: Record<number, [string, string]> = {
  1: ['#5C4A96', '#7C6FFF'],
  2: ['#E8927C', '#F57964'],
  3: ['#4DB6A5', '#7C6FFF'],
};

const STATUS_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Active', color: '#34D399' },
  2: { label: 'Graduated', color: '#FBBF24' },
  3: { label: 'Withdrawn', color: '#FB7185' },
};

export const STEPS = [
  { key: 'personal', label: 'Personal' },
  { key: 'academic', label: 'Academic' },
  { key: 'parents', label: 'Parents' },
  { key: 'details', label: 'Details' },
  { key: 'login', label: 'Login' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];

function FieldIcon({
  name,
  color,
  tint,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
}) {
  return (
    <View style={[fieldIconStyles.wrap, { backgroundColor: tint }]}>
      <Ionicons name={name} size={16} color={color} />
    </View>
  );
}

const fieldIconStyles = StyleSheet.create({
  wrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});

export function InputField({
  label, placeholder, value, onChangeText,
  keyboardType = 'default', icon, required = false,
  secureTextEntry = false, editable = true, accentColor = FORM.brand,
  fieldKey, autofillMode = 'off', error, hint, ...rest
}: any) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getAdmissionStyles(theme, isDark), [theme, isDark]);

  const focused = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && String(value).length > 0;
  const [showPassword, setShowPassword] = useState(false);
  const [webReadOnly, setWebReadOnly] = useState(Platform.OS === 'web');
  const isPassword = !!secureTextEntry;
  const autofill = fieldKey ? fieldAutofill(fieldKey, autofillMode) : fieldAutofill('ims-stu-field', autofillMode);
  const hasError = !!error;
  const idleBorderColor = FORM.border(isDark);

  const borderAnim = useAnimatedStyle(() => ({
    borderColor: hasError
      ? '#EF4444'
      : focused.value === 1
        ? accentColor
        : idleBorderColor,
    borderWidth: focused.value === 1 || hasError ? 1.5 : 1,
  }));

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, (hasValue || isFocused) && { color: isFocused ? accentColor : FORM.label(isDark) }]}>
        {label}{required && <Text style={{ color: FORM.coral }}> *</Text>}
      </Text>
      <Animated.View style={[
        styles.inputWrapper,
        clayField(isDark),
        borderAnim,
        !editable && styles.inputWrapperDisabled,
        hasError && styles.inputWrapperError,
      ]}>
        <FieldIcon
          name={icon}
          color={hasError ? '#EF4444' : isFocused ? accentColor : FORM.muted(isDark)}
          tint={hasError ? 'rgba(239,68,68,0.12)' : `${accentColor}18`}
        />
        <AppTextInput
          style={[styles.input, !editable && styles.inputDisabled]}
          placeholder={placeholder}
          placeholderTextColor={FORM.muted(isDark)}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType as any}
          secureTextEntry={isPassword && !showPassword}
          editable={editable}
          readOnly={editable ? webReadOnly : undefined}
          onFocus={() => {
            if (webReadOnly) setWebReadOnly(false);
            setIsFocused(true);
            focused.value = withTiming(1, { duration: 180 });
          }}
          onBlur={() => {
            setIsFocused(false);
            focused.value = withTiming(0, { duration: 200 });
          }}
          {...autofill}
          {...rest}
        />
        {isPassword && editable && (
          <ClayPasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword(v => !v)}
            isDark={isDark}
            accentColor={accentColor}
          />
        )}
        {!editable && (
          <Ionicons name="lock-closed-outline" size={14} color={isDark ? '#374151' : '#CBD5E1'} />
        )}
      </Animated.View>
      {hasError ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function SelectField({
  label, value, options, onSelect, placeholder,
  icon, required = false, loading = false, accentColor = FORM.brand, error,
}: any) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getAdmissionStyles(theme, isDark), [theme, isDark]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt: any) => opt.id.toString() === value?.toString());
  const filtered = searchQuery.trim()
    ? options.filter((o: any) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;
  const hasError = !!error;

  const chevron = useSharedValue(0);
  const chevronAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevron.value, [0, 1], [0, 180])}deg` }],
  }));

  const open = () => {
    Keyboard.dismiss();
    if (loading) return;
    setModalVisible(true);
    chevron.value = withTiming(1, { duration: 180 });
  };

  const close = () => {
    setModalVisible(false);
    setSearchQuery('');
    chevron.value = withTiming(0, { duration: 180 });
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={{ color: FORM.coral }}> *</Text>}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.inputWrapper,
          clayField(isDark),
          {
            borderColor: hasError ? '#EF4444' : selectedOption ? accentColor : FORM.border(isDark),
            borderWidth: selectedOption || hasError ? 1.5 : 1,
          },
          hasError && styles.inputWrapperError,
          pressed && { opacity: 0.88 },
        ]}
        onPress={open}
        disabled={loading}
      >
        <FieldIcon
          name={icon}
          color={hasError ? '#EF4444' : selectedOption ? accentColor : FORM.muted(isDark)}
          tint={hasError ? 'rgba(239,68,68,0.12)' : `${accentColor}18`}
        />
        <Text style={[styles.input, !selectedOption && { color: FORM.muted(isDark) }, { paddingTop: 0 }]}>
          {loading ? 'Loading…' : selectedOption ? selectedOption.name : placeholder}
        </Text>
        {selectedOption ? (
          <View style={[styles.selectedBadge, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="checkmark" size={12} color={accentColor} />
          </View>
        ) : (
          <Animated.View style={chevronAnim}>
            <Ionicons name="chevron-down" size={16} color={FORM.muted(isDark)} />
          </Animated.View>
        )}
      </Pressable>
      {hasError ? <Text style={styles.fieldError}>{error}</Text> : null}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.modalOverlay} onPress={close}>
          <Pressable style={styles.modalContent} onPress={() => { }}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select {label}</Text>
                <Text style={styles.modalSubtitle}>{options.length} options available</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={close}>
                <Ionicons name="close" size={18} color={FORM.muted(isDark)} />
              </Pressable>
            </View>

            {options.length > 5 && (
              <View style={[styles.modalSearchWrap, ds.searchBarWrapper]}>
                <Ionicons name="search-outline" size={16} color={FORM.muted(isDark)} style={{ marginRight: 8 }} />
                <AppTextInput
                  style={[ds.inputInChrome, styles.modalSearch]}
                  placeholder={`Search ${label}...`}
                  placeholderTextColor={FORM.muted(isDark)}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  {...fieldAutofill(`ims-stu-select-${label.replace(/\s/g, '-').toLowerCase()}`, 'off')}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={FORM.muted(isDark)} />
                  </Pressable>
                )}
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = value?.toString() === item.id.toString();
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionItem,
                      isSelected && [styles.selectedOption, { backgroundColor: accentColor + '12' }],
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => { onSelect(item.id); close(); }}
                  >
                    {isSelected && (
                      <View style={[styles.optionAccentBar, { backgroundColor: accentColor }]} />
                    )}
                    <Text style={[styles.optionText, isSelected && { color: accentColor, fontWeight: '700' }]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.optionCheck, { backgroundColor: accentColor }]}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Ionicons name="search-outline" size={28} color={FORM.muted(isDark)} />
                  <Text style={styles.modalEmptyText}>{`No results for "${searchQuery}"`}</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function SectionCard({
  title, icon, colorKey, delay, complete, meta, stepNumber, onLayout, children,
}: {
  title: string;
  icon: string;
  colorKey: keyof typeof SECTION_COLORS;
  delay: number;
  complete?: boolean;
  meta?: string;
  stepNumber?: number;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getAdmissionStyles(theme, isDark), [theme, isDark]);
  const col = SECTION_COLORS[colorKey];

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
      onLayout={onLayout}
      style={[
        styles.sectionCard,
        clayCard(isDark),
        complete && { borderColor: `${col.accent}44` },
      ]}
    >
      <LinearGradient
        colors={isDark
          ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']
          : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.55)']}
        style={styles.sectionSheen}
        pointerEvents="none"
      />
      <View style={[styles.sectionAccentBar, { backgroundColor: col.accent }]} />
      <View style={styles.sectionInner}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionIconWrap, { backgroundColor: isDark ? col.dark : col.light }]}>
            {typeof stepNumber === 'number' ? (
              <Text style={[styles.sectionStepNum, { color: col.accent }]}>{stepNumber}</Text>
            ) : (
              <Ionicons name={icon as any} size={16} color={col.accent} />
            )}
          </View>
          <View style={styles.sectionTitles}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
          </View>
          {complete ? (
            <Animated.View entering={FadeIn.duration(200)} style={[styles.sectionDonePill, { backgroundColor: `${col.accent}18` }]}>
              <Ionicons name="checkmark-circle" size={14} color={col.accent} />
              <Text style={[styles.sectionDoneText, { color: col.accent }]}>Done</Text>
            </Animated.View>
          ) : (
            <View style={[styles.sectionIconGhost, { backgroundColor: isDark ? col.dark : col.light }]}>
              <Ionicons name={icon as any} size={14} color={col.accent} />
            </View>
          )}
        </View>
        <View style={[styles.sectionRule, { backgroundColor: FORM.border(isDark) }]} />
        {children}
      </View>
    </Animated.View>
  );
}

export function ProgressRail({
  activeStep,
  completedSteps,
  percent,
  isDark,
  onStepPress,
}: {
  activeStep: number;
  completedSteps: boolean[];
  percent: number;
  isDark: boolean;
  onStepPress?: (index: number) => void;
}) {
  const nextLabel = percent >= 100 ? null : STEPS[activeStep]?.label;

  return (
    <View style={[progressStyles.wrap, { backgroundColor: FORM.surface(isDark), borderColor: FORM.border(isDark) }, clayCard(isDark)]}>
      <View style={progressStyles.topRow}>
        <View>
          <Text style={[progressStyles.caption, { color: FORM.muted(isDark) }]}>Enrollment progress</Text>
          {nextLabel ? (
            <Text style={[progressStyles.nextHint, { color: FORM.text(isDark) }]}>Next · {nextLabel}</Text>
          ) : (
            <Text style={[progressStyles.nextHint, { color: FORM.sage }]}>All sections complete</Text>
          )}
        </View>
        <View style={[progressStyles.percentPill, { backgroundColor: isDark ? 'rgba(124,111,255,0.16)' : 'rgba(102,89,144,0.10)' }]}>
          <Text style={[progressStyles.percent, { color: FORM.brand }]}>{Math.round(percent)}%</Text>
        </View>
      </View>
      <View style={[progressStyles.track, { backgroundColor: isDark ? '#2A2438' : '#EDE9F6' }]}>
        <View style={[progressStyles.fill, { width: `${Math.max(6, Math.min(100, percent))}%` }]}>
          <LinearGradient
            colors={['#4DB6A5', '#665990', '#7C6FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
      <View style={progressStyles.row}>
        {STEPS.map((step, i) => {
          const done = completedSteps[i];
          const active = i === activeStep;
          return (
            <Pressable
              key={step.key}
              style={progressStyles.stepWrap}
              onPress={() => {
                Haptics.selectionAsync();
                onStepPress?.(i);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${step.label} section`}
            >
              <View style={[
                progressStyles.dot,
                done && progressStyles.dotDone,
                active && !done && progressStyles.dotActive,
                !done && !active && { backgroundColor: isDark ? '#221F30' : '#F3EFF8', borderColor: isDark ? '#2A2438' : '#E4DDF0' },
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={11} color="#fff" />
                  : <Text style={[progressStyles.dotNum, active && { color: '#fff' }, !active && { color: FORM.muted(isDark) }]}>{i + 1}</Text>
                }
              </View>
              <Text style={[
                progressStyles.label,
                active && progressStyles.labelActive,
                done && progressStyles.labelDone,
                !done && !active && { color: FORM.muted(isDark) },
              ]}>{step.label}</Text>
              {i < STEPS.length - 1 && (
                <View style={[progressStyles.connector, (done || completedSteps[i + 1]) && progressStyles.connectorDone]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function LiveAvatar({
  firstName,
  lastName,
  genderId,
  photoUrl,
  size = 96,
}: {
  firstName?: string;
  lastName?: string;
  genderId?: number;
  photoUrl?: string | null;
  size?: number;
}) {
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Student';
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const grad = AVATAR_GRADS[genderId || 1] || AVATAR_GRADS[1];
  const ring = size + 12;
  const inner = size;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={[avatarStyles.wrap, { width: ring, height: ring }]}>
      <LinearGradient
        colors={['rgba(232,196,122,0.95)', 'rgba(255,255,255,0.55)', 'rgba(232,196,122,0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[avatarStyles.ring, { width: ring, height: ring, borderRadius: ring / 2 }]}
      >
        <View style={[avatarStyles.inner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          {photoUrl ? (
            <Avatar photoUrl={photoUrl} name={name} size={inner} borderRadius={inner / 2} />
          ) : (
            <LinearGradient colors={grad} style={{ width: inner, height: inner, borderRadius: inner / 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: inner / 2 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
              <Text style={[avatarStyles.initials, { fontSize: inner * 0.32 }]}>{initials}</Text>
            </LinearGradient>
          )}
        </View>
      </LinearGradient>
      <View style={avatarStyles.statusDot} />
    </Animated.View>
  );
}

export function SubSectionLabel({ label, accentColor }: { label: string; accentColor: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 4 }}>
      <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accentColor }} />
      <Text style={{ fontSize: 12, fontWeight: '800', color: accentColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

export function ParentBlock({
  title,
  icon,
  accentColor,
  filled,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  filled?: boolean;
  children: React.ReactNode;
}) {
  const { isDark } = useTheme();
  return (
    <View style={[
      parentStyles.card,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(102,89,144,0.04)',
        borderColor: filled ? `${accentColor}40` : FORM.border(isDark),
      },
    ]}>
      <View style={parentStyles.header}>
        <View style={[parentStyles.icon, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons name={icon} size={15} color={accentColor} />
        </View>
        <Text style={[parentStyles.title, { color: FORM.text(isDark) }]}>{title}</Text>
        {filled ? (
          <View style={[parentStyles.filled, { backgroundColor: `${accentColor}16` }]}>
            <Ionicons name="checkmark" size={11} color={accentColor} />
            <Text style={[parentStyles.filledText, { color: accentColor }]}>Added</Text>
          </View>
        ) : (
          <Text style={[parentStyles.optional, { color: FORM.muted(isDark) }]}>Optional</Text>
        )}
      </View>
      {children}
    </View>
  );
}

export function FormCanvas({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <View style={[canvasStyles.root, { backgroundColor: FORM.canvas(isDark) }]}>
      <View pointerEvents="none" style={canvasStyles.orbLayer}>
        <View
          style={[canvasStyles.orb, canvasStyles.orbA, { backgroundColor: isDark ? 'rgba(124,111,255,0.10)' : 'rgba(124,111,255,0.13)' }]}
        />
        <View
          style={[canvasStyles.orb, canvasStyles.orbB, { backgroundColor: isDark ? 'rgba(77,182,165,0.08)' : 'rgba(77,182,165,0.12)' }]}
        />
        <View
          style={[canvasStyles.orb, canvasStyles.orbC, { backgroundColor: isDark ? 'rgba(245,121,100,0.06)' : 'rgba(245,121,100,0.08)' }]}
        />
      </View>
      {children}
    </View>
  );
}

export function StickySaveBar({
  loading,
  isEditMode,
  statusId,
  missingCount,
  missingLabels,
  onPress,
  isDark,
}: {
  loading: boolean;
  isEditMode: boolean;
  statusId?: number;
  missingCount: number;
  missingLabels?: string[];
  onPress: () => void;
  isDark: boolean;
}) {
  const insets = useSafeAreaInsets();
  const label = isEditMode
    ? statusId === 2
      ? 'Mark as Passed Out'
      : statusId === 3
        ? 'Mark as Withdrawn'
        : 'Save Changes'
    : 'Enroll Student';

  const chips = (missingLabels || []).slice(0, 3);
  const extra = Math.max(0, missingCount - chips.length);
  const useBlur = Platform.OS === 'ios' || Platform.OS === 'web';

  const inner = (
    <>
      {missingCount > 0 ? (
        <View style={stickyStyles.hintRow}>
          <Text style={[stickyStyles.hint, { color: FORM.muted(isDark) }]}>
            {missingCount} required field{missingCount === 1 ? '' : 's'} remaining
          </Text>
          {chips.length > 0 ? (
            <View style={stickyStyles.chipRow}>
              {chips.map((item) => (
                <View key={item} style={[stickyStyles.missChip, { backgroundColor: isDark ? 'rgba(245,121,100,0.16)' : 'rgba(245,121,100,0.10)' }]}>
                  <Text style={stickyStyles.missChipText}>{item}</Text>
                </View>
              ))}
              {extra > 0 ? (
                <Text style={[stickyStyles.hint, { color: FORM.muted(isDark) }]}>+{extra}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={stickyStyles.readyRow}>
          <Ionicons name="sparkles" size={13} color={FORM.sage} />
          <Text style={[stickyStyles.hint, { color: FORM.sage }]}>Ready to {isEditMode ? 'save' : 'enroll'}</Text>
        </View>
      )}
      <Pressable
        style={({ pressed }) => [stickyStyles.btnWrap, pressed && { opacity: 0.92 }, loading && { opacity: 0.75 }]}
        onPress={onPress}
        disabled={loading}
      >
        <LinearGradient
          colors={isEditMode ? ['#3F336E', '#6B5BFF'] : ['#4A3F6B', '#E07A68']}
          style={stickyStyles.btn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            style={stickyStyles.gloss}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {loading ? (
            <LogoLoader color="#fff" size={22} />
          ) : (
            <>
              <Ionicons name={isEditMode ? 'save-outline' : 'person-add-outline'} size={18} color="#fff" />
              <Text style={stickyStyles.btnText}>{label}</Text>
              <View style={stickyStyles.arrow}>
                <Ionicons name="arrow-forward" size={13} color="rgba(255,255,255,0.85)" />
              </View>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </>
  );

  const barStyle = [
    stickyStyles.bar,
    {
      paddingBottom: Math.max(Platform.OS === 'ios' ? 18 : 12, insets.bottom || 12),
      borderTopColor: FORM.border(isDark),
      backgroundColor: useBlur
        ? (isDark ? 'rgba(16, 13, 24, 0.55)' : 'rgba(255, 255, 255, 0.55)')
        : (isDark ? 'rgba(16, 13, 24, 0.96)' : 'rgba(255, 255, 255, 0.96)'),
    },
  ];

  if (useBlur) {
    return (
      <BlurView intensity={38} tint={isDark ? 'dark' : 'light'} style={barStyle}>
        {inner}
      </BlurView>
    );
  }

  return <View style={barStyle}>{inner}</View>;
}

export function HeroMetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={heroChipStyles.chip}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.92)" />
      <Text style={heroChipStyles.text}>{label}</Text>
    </View>
  );
}

export function AdmissionHero({
  isEditMode,
  firstName,
  lastName,
  admissionNo,
  classLabel,
  sectionLabel,
  photoUrl,
  statusId,
  genderId,
  rollNumber,
}: {
  isEditMode: boolean;
  firstName?: string;
  lastName?: string;
  admissionNo?: string;
  classLabel?: string;
  sectionLabel?: string;
  photoUrl?: string | null;
  statusId?: number;
  genderId?: number;
  rollNumber?: string | number | null;
}) {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getAdmissionStyles(theme, isDark), [theme, isDark]);
  const wide = width >= 720;
  const displayName = [firstName, lastName].filter(Boolean).join(' ')
    || (isEditMode ? 'Student profile' : 'New student');
  const classLine = [classLabel, sectionLabel].filter(Boolean).join(' · ');
  const status = STATUS_META[statusId || 1] || STATUS_META[1];
  const gradColors: [string, string, string] = isEditMode
    ? ['#241B4A', '#4A3A86', '#6E5BFF']
    : ['#2A2048', '#4F4278', '#C46B5A'];

  return (
    <Animated.View entering={FadeInDown.duration(500)}>
      <LinearGradient
        colors={gradColors}
        style={[styles.heroCard, wide && styles.heroCardWide]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
      >
        <View style={styles.heroBlob1} />
        <View style={styles.heroBlob2} />
        <View style={styles.heroBlob3} />
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
          style={styles.heroGloss}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={[styles.heroBody, wide && styles.heroBodyWide]}>
          <LiveAvatar
            firstName={firstName}
            lastName={lastName}
            genderId={genderId}
            photoUrl={photoUrl}
            size={wide ? 108 : 96}
          />

          <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
            <View style={styles.heroEyebrow}>
              <Ionicons name="diamond-outline" size={11} color={FORM.gold} />
              <Text style={styles.heroEyebrowText}>
                {isEditMode ? 'Student record' : 'New enrollment'}
              </Text>
            </View>
            <Text style={[styles.heroName, wide && { textAlign: 'left' }]} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={[styles.heroSub, wide && { textAlign: 'left' }]}>
              {isEditMode
                ? (classLine || `Adm# ${admissionNo || '—'}`)
                : 'A calm, complete enrollment for every new student'}
            </Text>

            <View style={[styles.heroChips, wide && { justifyContent: 'flex-start' }]}>
              {admissionNo ? <HeroMetaChip icon="card-outline" label={`Adm ${admissionNo}`} /> : null}
              {classLabel ? <HeroMetaChip icon="school-outline" label={classLabel} /> : null}
              {sectionLabel ? <HeroMetaChip icon="grid-outline" label={sectionLabel} /> : null}
              {rollNumber ? <HeroMetaChip icon="list-outline" label={`Roll ${rollNumber}`} /> : null}
            </View>

            <View style={[styles.heroPills, wide && { justifyContent: 'flex-start' }]}>
              {isEditMode ? (
                <View style={[styles.statusPill, { backgroundColor: `${status.color}22`, borderColor: `${status.color}55` }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              ) : null}
              <View style={styles.modePill}>
                <Ionicons name={isEditMode ? 'create-outline' : 'sparkles-outline'} size={12} color="#fff" />
                <Text style={styles.modePillText}>{isEditMode ? 'Editing' : 'Enrolling'}</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const progressStyles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  caption: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  nextHint: { fontSize: 13, fontWeight: '700', marginTop: 3, letterSpacing: -0.2 },
  percentPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  percent: { fontSize: 13, fontWeight: '900', letterSpacing: -0.2 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  fill: { height: '100%', borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepWrap: { alignItems: 'center', flex: 1, position: 'relative', paddingVertical: 2 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dotActive: { borderColor: '#665990', backgroundColor: '#665990' },
  dotDone: { backgroundColor: '#4DB6A5', borderColor: '#4DB6A5' },
  dotNum: { fontSize: 10, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '700', marginTop: 6, letterSpacing: 0.15, textAlign: 'center' },
  labelActive: { color: '#665990', fontWeight: '800' },
  labelDone: { color: '#4DB6A5' },
  connector: { position: 'absolute', top: 14, left: '55%', right: '-55%', height: 2, backgroundColor: '#E8E2F0', zIndex: 0 },
  connectorDone: { backgroundColor: '#4DB6A5' },
});

const avatarStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { alignItems: 'center', justifyContent: 'center' },
  inner: { overflow: 'hidden', backgroundColor: 'rgba(20,14,40,0.35)' },
  initials: { fontWeight: '900', color: '#fff', letterSpacing: -1 },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34D399',
    borderWidth: 3,
    borderColor: '#241B4A',
  },
});

const stickyStyles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  hintRow: { gap: 6 },
  readyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hint: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  missChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  missChipText: { fontSize: 11, fontWeight: '700', color: '#E07A68' },
  btnWrap: {
    borderRadius: 18,
    shadowColor: '#665990',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  btn: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 28, borderRadius: 18 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  arrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const heroChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  text: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
});

const parentStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  icon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  optional: { fontSize: 11, fontWeight: '600' },
  filled: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  filledText: { fontSize: 11, fontWeight: '800' },
});

const canvasStyles = StyleSheet.create({
  root: { flex: 1 },
  orbLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 280, height: 280, top: -80, right: -90 },
  orbB: { width: 220, height: 220, bottom: 120, left: -80 },
  orbC: { width: 160, height: 160, top: 280, left: '40%' },
});

export const getAdmissionStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: FORM.canvas(isDark), gap: 10 },
  loadingTitle: { fontSize: 17, fontWeight: '800', color: FORM.text(isDark), marginTop: 8 },
  loadingSubtitle: { fontSize: 13, color: FORM.muted(isDark), fontWeight: '500' },

  scrollContent: { padding: 18, paddingBottom: 28 },

  heroCard: {
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    alignItems: 'stretch',
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#1A1238',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 16,
  },
  heroCardWide: { paddingHorizontal: 28, paddingVertical: 28 },
  heroBlob1: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(232,196,122,0.12)' },
  heroBlob2: { position: 'absolute', bottom: -40, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroBlob3: { position: 'absolute', top: 40, left: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(124,111,255,0.18)' },
  heroGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 90, borderRadius: 30 },
  heroBody: { alignItems: 'center', gap: 16 },
  heroBodyWide: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  heroCopy: { alignItems: 'center', width: '100%' },
  heroCopyWide: { flex: 1, alignItems: 'flex-start' },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heroEyebrowText: { fontSize: 10, fontWeight: '800', color: FORM.gold, letterSpacing: 1.4, textTransform: 'uppercase' },
  heroName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.7, textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 5, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  modePillText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },

  sectionCard: {
    flexDirection: 'row',
    backgroundColor: FORM.surface(isDark),
    borderRadius: 26,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FORM.border(isDark),
  },
  sectionSheen: { ...StyleSheet.absoluteFillObject },
  sectionAccentBar: { width: 5, borderRadius: 0 },
  sectionInner: { flex: 1, padding: 18 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionIconWrap: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  sectionStepNum: { fontSize: 15, fontWeight: '900', letterSpacing: -0.4 },
  sectionIconGhost: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitles: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: FORM.text(isDark), letterSpacing: -0.3 },
  sectionMeta: { fontSize: 12, fontWeight: '600', color: FORM.muted(isDark), marginTop: 2 },
  sectionDonePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
  },
  sectionDoneText: { fontSize: 11, fontWeight: '800' },
  sectionRule: { height: StyleSheet.hairlineWidth, marginBottom: 16, opacity: 0.9 },

  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: FORM.label(isDark), marginBottom: 7, letterSpacing: 0.15 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: FORM.field(isDark),
    borderRadius: 16, paddingHorizontal: 10, height: 52,
    borderWidth: 1, borderColor: FORM.border(isDark),
  },
  inputWrapperDisabled: { opacity: 0.6 },
  inputWrapperError: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
  },
  input: { flex: 1, fontSize: 15, color: FORM.text(isDark), fontWeight: '500' },
  inputDisabled: { color: FORM.muted(isDark) },
  fieldError: { marginTop: 6, fontSize: 11.5, fontWeight: '600', color: '#EF4444' },
  fieldHint: { marginTop: 6, fontSize: 11, fontWeight: '500', color: FORM.muted(isDark) },
  selectedBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  statusNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 16,
    backgroundColor: isDark ? 'rgba(154, 52, 18, 0.18)' : '#FFF7ED',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(251, 146, 60, 0.35)' : '#FED7AA',
    marginTop: 4,
  },
  statusNoticeText: {
    flex: 1, color: isDark ? '#FDBA74' : '#9A3412',
    fontSize: 12, lineHeight: 18, fontWeight: '600',
  },

  row: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(12,8,24,0.58)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: FORM.surface(isDark),
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20,
    maxHeight: '82%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? '#3D3650' : '#E8E2F0', alignSelf: 'center', marginBottom: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: FORM.text(isDark), letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 12, color: FORM.muted(isDark), marginTop: 2, fontWeight: '500' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: FORM.field(isDark),
    justifyContent: 'center', alignItems: 'center',
  },
  modalSearchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: FORM.field(isDark),
    borderRadius: 14, paddingHorizontal: 12, height: 44,
    marginBottom: 12,
    borderWidth: 1, borderColor: FORM.border(isDark),
  },
  modalSearch: { flex: 1, fontSize: 14, color: FORM.text(isDark), fontWeight: '500' },
  modalEmpty: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  modalEmptyText: { fontSize: 14, color: FORM.muted(isDark), fontWeight: '500' },
  optionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: FORM.border(isDark),
    paddingLeft: 4,
  },
  selectedOption: { borderRadius: 12, paddingHorizontal: 8 },
  optionAccentBar: { width: 3, height: 18, borderRadius: 2 },
  optionText: { flex: 1, fontSize: 15, color: FORM.label(isDark), fontWeight: '500' },
  optionCheck: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
