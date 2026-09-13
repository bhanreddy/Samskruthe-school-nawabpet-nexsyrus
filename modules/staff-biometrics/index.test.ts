/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('expo-modules-core', () => ({ requireNativeModule: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
const { requireNativeModule } = require('expo-modules-core');
const { Platform } = require('react-native');
const native = {
  checkBiometricCapability: jest.fn(async () => ({ isAvailable: true, hasStrongBiometrics: true, enrolled: true, reason: null })),
  generateAttendanceKey: jest.fn(async () => ({ success: true, publicKey: 'pem', keyAlias: 'schoolims_att_v2_alias' })),
  signWithBiometric: jest.fn(async () => ({ success: true, signature: 'der-signature' })),
};
beforeEach(() => { jest.clearAllMocks(); requireNativeModule.mockReturnValue(native); });
function load(os: string) {
  Platform.OS = os;
  let bridge: any;
  jest.isolateModules(() => { bridge = require('./index').StaffBiometrics; });
  return bridge;
}
it.each(['android', 'ios'])('loads the exact %s Expo module and forwards signing bytes/alias', async os => {
  const bridge = load(os);
  expect(requireNativeModule).toHaveBeenCalledWith('StaffBiometricsModule');
  expect((await bridge.checkBiometricCapability()).hasStrongBiometrics).toBe(true);
  await bridge.generateAttendanceKey('alias');
  await bridge.signWithBiometric('alias', '{"action":"check_in"}', 'Title', 'Subtitle');
  expect(native.generateAttendanceKey).toHaveBeenCalledWith('alias');
  expect(native.signWithBiometric).toHaveBeenCalledWith('alias', '{"action":"check_in"}', 'Title', 'Subtitle');
});
it('fails closed in an old native build without the module', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    requireNativeModule.mockImplementationOnce(() => { throw new Error('missing'); });
    const bridge = load('ios');
    expect(await bridge.checkBiometricCapability()).toMatchObject({ isAvailable: false, reason: 'MODULE_NOT_LOADED' });
    await expect(bridge.signWithBiometric('alias', '{}')).rejects.toThrow('not available');
  } finally { warn.mockRestore(); }
});
it('does not load native code on web/desktop', async () => {
  const bridge = load('web');
  expect(requireNativeModule).not.toHaveBeenCalled();
  expect(await bridge.checkBiometricCapability()).toMatchObject({ isAvailable: false, reason: 'UNSUPPORTED_PLATFORM' });
  await expect(bridge.generateAttendanceKey('alias')).rejects.toThrow('not available');
});
