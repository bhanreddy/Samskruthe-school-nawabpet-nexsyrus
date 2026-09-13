import React from 'react';
import { View } from 'react-native';
import AdminHeader from '../../src/components/AdminHeader';
import { useTheme } from '../../src/hooks/useTheme';
import PopupEditorScreen from '../../src/features/popups/admin/PopupEditorScreen';

export default function AdminPopupEditorRoute() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AdminHeader title="Create Popup" showBackButton />
      <PopupEditorScreen />
    </View>
  );
}
