import { useLocalSearchParams } from 'expo-router';
import AdminApplicationDetailScreen from '../admin/admissions/[id]';

export default function StaffAdmissionDetailScreen() {
  useLocalSearchParams();
  return <AdminApplicationDetailScreen />;
}
