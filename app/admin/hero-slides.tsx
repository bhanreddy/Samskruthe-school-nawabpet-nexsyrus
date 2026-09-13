import React from 'react';
import { View } from 'react-native';
import AdminHeader from '../../src/components/AdminHeader';
import { useTheme } from '../../src/hooks/useTheme';
import HeroSlidesManager from '../../src/features/hero-slides/HeroSlidesManager';

export default function AdminHeroSlidesScreen() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AdminHeader title="Slide Manager" showBackButton />
      <HeroSlidesManager />
    </View>
  );
}
