import React from 'react';
import { View } from 'react-native';
import AdminHeader from '../../src/components/AdminHeader';
import { useTheme } from '../../src/hooks/useTheme';
import PopupManagerScreen from '../../src/features/popups/admin/PopupManagerScreen';

export default function AdminPopupManagerRoute() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AdminHeader title="Popup Manager" showBackButton />
      <PopupManagerScreen />
    </View>
  );
}
