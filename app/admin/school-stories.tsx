import React from 'react';
import { View } from 'react-native';
import AdminHeader from '../../src/components/AdminHeader';
import { useTheme } from '../../src/hooks/useTheme';
import SchoolStoriesManager from '../../src/features/school-stories/SchoolStoriesManager';

export default function AdminSchoolStoriesScreen() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AdminHeader title="School Stories" showBackButton />
      <SchoolStoriesManager scopeAll />
    </View>
  );
}
