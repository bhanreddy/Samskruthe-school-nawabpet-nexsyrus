import React from 'react';
import { Text, TouchableOpacity, FlatList } from 'react-native';
import FeeRecoveryView from './FeeRecoveryView';
import { FeeRecoveryService } from '../services/feeRecoveryService';
import { alertCompat } from '../utils/crossPlatformAlert';

// jest-expo includes the renderer but not its standalone TypeScript declarations.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { create, act } = require('react-test-renderer');

let mockManage = true;
let mockEnabled = true;
jest.mock('../hooks/usePermissions', () => ({ usePermissions: () => ({ hasPermission: (key: string) => key !== 'fees.manage' || mockManage }) }));
jest.mock('../hooks/useFeatures', () => ({ useFeatures: () => ({ isEnabled: () => mockEnabled, loading: false }) }));
jest.mock('../services/feeRecoveryService', () => ({ FeeRecoveryService: { getOverview: jest.fn(), getDefaulters: jest.fn(), getRules: jest.fn(), sendReminders: jest.fn(), getReminderHistory: jest.fn() } }));
jest.mock('../utils/crossPlatformAlert', () => ({ alertCompat: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon', Feather: 'Icon' }));
jest.mock('./AppTextInput', () => 'Input');
const api = FeeRecoveryService as jest.Mocked<typeof FeeRecoveryService>;
let tree: any;
const row = { student_id: 'student-1', student_name: 'Alice', total_outstanding: 500, days_overdue: 7, segmentation: 'new', class_name: '1', section_name: 'A' };
const response = (rows = [row], page = 1) => ({ data: rows, pagination: {page,limit:50,total:100,total_pages:2} });
const text = () => tree.root.findAllByType(Text).map((node: any) => React.Children.toArray(node.props.children).filter((child: any) => typeof child === 'string' || typeof child === 'number').join('')).join(' ');
const button = (label: string) => tree.root.findAllByType(TouchableOpacity).find((node: any) => node.findAllByType(Text).some((t: any) => t.props.children === label));
async function mount() { await act(async () => { tree = create(<FeeRecoveryView />); }); await act(async () => { jest.advanceTimersByTime(300); }); }
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); mockManage=true; mockEnabled=true;
  api.getOverview.mockResolvedValue({summary:{total_expected:1000,total_collected:500,total_outstanding:500,collection_efficiency:50},ageing_buckets:{}} as any);
  api.getDefaulters.mockResolvedValue(response() as any);
  api.getRules.mockResolvedValue({is_enabled:false,trigger_config:{days_before_due:3,overdue_stages:[7],cooldown_days:2}} as any);
});
afterEach(async () => { if(tree) await act(async () => tree.unmount()); tree=null; jest.useRealTimers(); });

test('network failure shows retry, not zero balances or all-clear', async () => {
  api.getOverview.mockRejectedValueOnce(new Error('Network unavailable'));await mount();
  expect(text()).toContain('Network unavailable');expect(text()).not.toContain('No Defaulters');expect(text()).not.toContain('Total Expected');
});
test('pagination requests next page and removes earlier selection', async () => {
  await mount();await act(async()=>button('Select All').props.onPress());
  expect(text()).toContain('Send Reminders');
  await act(async()=>button('Next').props.onPress());await act(async()=>jest.advanceTimersByTime(300));
  expect(api.getDefaulters).toHaveBeenLastCalledWith(expect.objectContaining({page:2}));
  expect(text()).not.toContain('Send Reminders');
});
test('read-only and disabled-school views cannot send or configure', async () => {
  mockManage=false;await mount();expect(api.getRules).not.toHaveBeenCalled();expect(button('Remind')).toBeUndefined();
  await act(async()=>tree.unmount());tree=null;mockEnabled=false;api.getOverview.mockClear();await mount();
  expect(api.getOverview).not.toHaveBeenCalled();expect(text()).toContain('unavailable');
});
test('double confirmation invokes sender once and exposes partial errors', async () => {
  let resolve: any;api.sendReminders.mockImplementation(()=>new Promise(r=>{resolve=r;}));
  await mount();await act(async()=>button('Select All').props.onPress());await act(async()=>button('Send Reminders').props.onPress());
  const confirm=button('Send Now');await act(async()=>{void confirm.props.onPress();void confirm.props.onPress();});
  expect(api.sendReminders).toHaveBeenCalledTimes(1);
  await act(async()=>resolve({dispatched_count:0,skipped_count:0,error_count:1}));
  expect(alertCompat).toHaveBeenCalledWith('Reminder Results',expect.stringContaining('Failed or uncertain: 1'));
});
test('late response from old page cannot replace the current page', async () => {
  await mount();let resolveOld: any;
  api.getDefaulters.mockImplementationOnce(()=>new Promise(r=>{resolveOld=r;}));
  // Start an old-page refresh, then change page before it completes.
  const list=tree.root.findByType(FlatList);
  await act(async()=>{void list.props.onRefresh();});
  await act(async()=>button('Next').props.onPress());
  api.getDefaulters.mockResolvedValueOnce(response([{...row,student_id:'new',student_name:'New Page'}],2) as any);
  await act(async()=>jest.advanceTimersByTime(300));
  await act(async()=>resolveOld(response([{...row,student_name:'Stale Page'}])));
  expect(text()).toContain('New Page');expect(text()).not.toContain('Stale Page');
});
