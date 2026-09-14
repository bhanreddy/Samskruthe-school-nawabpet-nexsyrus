import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClassInfo } from '../../services/classService';

export interface FeeFilterState {
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  fee_status: string; // 'All', 'Pending', 'Partial', 'Paid', 'Overdue'
  min_due?: string;
  max_due?: string;
  due_date_before?: string;
  overdue_days_min?: string;
  search?: string;
}

export type ClassWithSections = ClassInfo & {
  sections?: Array<{ id: string; name: string }>;
};

interface StudentFilterPanelProps {
  filters: FeeFilterState;
  onFilterChange: (updated: Partial<FeeFilterState>) => void;
  onReset: () => void;
  classes: ClassWithSections[];
  academicYears: Array<{ id: string; code: string; name?: string }>;
  isDark?: boolean;
}

const FEE_STATUSES = [
  { id: 'Pending', label: 'Pending Dues' },
  { id: 'Overdue', label: 'Only Overdue' },
  { id: 'Partial', label: 'Partially Paid' },
  { id: 'Paid', label: 'Fully Paid' },
  { id: 'All', label: 'All Students' },
];

export const StudentFilterPanel: React.FC<StudentFilterPanelProps> = ({
  filters,
  onFilterChange,
  onReset,
  classes = [],
  academicYears = [],
  isDark = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#4B5563';
  const inputBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#CBD5E1';
  const pillActiveBg = '#3B82F6';
  const pillActiveText = '#FFFFFF';
  const pillInactiveBg = isDark ? '#374151' : '#F1F5F9';
  const pillInactiveText = isDark ? '#D1D5DB' : '#374151';

  const selectedClass = classes.find((c) => c.id === filters.class_id);
  const sections: Array<{ id: string; name: string }> = selectedClass?.sections || [];

  const activeFilterCount = [
    filters.class_id,
    filters.section_id,
    filters.fee_status !== 'Pending',
    filters.min_due,
    filters.max_due,
    filters.due_date_before,
    filters.overdue_days_min,
    filters.search,
  ].filter(Boolean).length;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#18202F' : '#FFFFFF', borderColor }]}>
      {/* Search and Primary Row */}
      <View style={styles.primaryRow}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor }]}>
          <Ionicons name="search" size={17} color={subtextColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search student name, admission no, father's name..."
            placeholderTextColor={subtextColor}
            value={filters.search || ''}
            onChangeText={(text) => onFilterChange({ search: text })}
          />
          {Boolean(filters.search) && (
            <TouchableOpacity onPress={() => onFilterChange({ search: '' })}>
              <Ionicons name="close-circle" size={17} color={subtextColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Class Dropdown */}
        <View style={styles.selectWrap}>
          <select
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              backgroundColor: inputBg,
              color: textColor,
              fontSize: 13,
              fontWeight: 500,
              minWidth: 140,
              outline: 'none',
              cursor: 'pointer',
            }}
            value={filters.class_id || ''}
            onChange={(e) => onFilterChange({ class_id: e.target.value || undefined, section_id: undefined })}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Class {cls.name}
              </option>
            ))}
          </select>
        </View>

        {/* Section Dropdown */}
        <View style={styles.selectWrap}>
          <select
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              backgroundColor: inputBg,
              color: textColor,
              fontSize: 13,
              fontWeight: 500,
              minWidth: 130,
              outline: 'none',
              cursor: 'pointer',
            }}
            value={filters.section_id || ''}
            onChange={(e) => onFilterChange({ section_id: e.target.value || undefined })}
            disabled={!filters.class_id || sections.length === 0}
          >
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                Section {sec.name}
              </option>
            ))}
          </select>
        </View>

        {/* Academic Year Selector */}
        {academicYears.length > 0 && (
          <View style={styles.selectWrap}>
            <select
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                backgroundColor: inputBg,
                color: textColor,
                fontSize: 13,
                fontWeight: 500,
                minWidth: 140,
                outline: 'none',
                cursor: 'pointer',
              }}
              value={filters.academic_year_id || ''}
              onChange={(e) => onFilterChange({ academic_year_id: e.target.value || undefined })}
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.code} {ay.name ? `(${ay.name})` : ''}
                </option>
              ))}
            </select>
          </View>
        )}

        {/* Advanced Filters Toggle */}
        <TouchableOpacity
          style={[styles.toggleBtn, showAdvanced && { backgroundColor: isDark ? '#374151' : '#E2E8F0' }]}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Ionicons name="options-outline" size={16} color={textColor} />
          <Text style={[styles.toggleBtnText, { color: textColor }]}>
            {showAdvanced ? 'Fewer Filters' : 'More Filters'}
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {activeFilterCount > 0 && (
          <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
            <Ionicons name="refresh-outline" size={15} color="#EF4444" />
            <Text style={styles.resetBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Fee Status Quick Pills */}
      <View style={styles.pillsRow}>
        <Text style={[styles.pillLabel, { color: subtextColor }]}>Fee Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {FEE_STATUSES.map((status) => {
            const isActive = filters.fee_status === status.id;
            return (
              <TouchableOpacity
                key={status.id}
                style={[
                  styles.pill,
                  { backgroundColor: isActive ? pillActiveBg : pillInactiveBg },
                ]}
                onPress={() => onFilterChange({ fee_status: status.id })}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? pillActiveText : pillInactiveText },
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Advanced Filters Drawer */}
      {showAdvanced && (
        <View style={[styles.advancedBox, { borderTopColor: isDark ? '#374151' : '#E2E8F0' }]}>
          <View style={styles.advancedGrid}>
            <View style={styles.advField}>
              <Text style={[styles.advLabel, { color: subtextColor }]}>Min Due Amount (₹)</Text>
              <TextInput
                style={[styles.advInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                placeholder="e.g. 5000"
                placeholderTextColor={subtextColor}
                keyboardType="numeric"
                value={filters.min_due || ''}
                onChangeText={(val) => onFilterChange({ min_due: val })}
              />
            </View>

            <View style={styles.advField}>
              <Text style={[styles.advLabel, { color: subtextColor }]}>Max Due Amount (₹)</Text>
              <TextInput
                style={[styles.advInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                placeholder="e.g. 25000"
                placeholderTextColor={subtextColor}
                keyboardType="numeric"
                value={filters.max_due || ''}
                onChangeText={(val) => onFilterChange({ max_due: val })}
              />
            </View>

            <View style={styles.advField}>
              <Text style={[styles.advLabel, { color: subtextColor }]}>Due Date Before</Text>
              <input
                type="date"
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  backgroundColor: inputBg,
                  color: textColor,
                  fontSize: 13,
                  outline: 'none',
                }}
                value={filters.due_date_before || ''}
                onChange={(e) => onFilterChange({ due_date_before: e.target.value || undefined })}
              />
            </View>

            <View style={styles.advField}>
              <Text style={[styles.advLabel, { color: subtextColor }]}>Min Overdue Days</Text>
              <TextInput
                style={[styles.advInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                placeholder="e.g. 30"
                placeholderTextColor={subtextColor}
                keyboardType="numeric"
                value={filters.overdue_days_min || ''}
                onChangeText={(val) => onFilterChange({ overdue_days_min: val })}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    minWidth: 240,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
      default: {},
    }),
  },
  selectWrap: {
    justifyContent: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 38,
  },
  resetBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillsScroll: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  advancedBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  advancedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  advField: {
    gap: 4,
    minWidth: 160,
  },
  advLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  advInput: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
});
