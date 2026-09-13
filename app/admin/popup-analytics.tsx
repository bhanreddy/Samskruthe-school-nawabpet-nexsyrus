import React from 'react';
import { View } from 'react-native';
import AdminHeader from '../../src/components/AdminHeader';
import { useTheme } from '../../src/hooks/useTheme';
import PopupAnalyticsScreen from '../../src/features/popups/admin/PopupAnalyticsScreen';

export default function AdminPopupAnalyticsRoute() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AdminHeader title="Popup Analytics" showBackButton />
      <PopupAnalyticsScreen />
    </View>
  );
}
