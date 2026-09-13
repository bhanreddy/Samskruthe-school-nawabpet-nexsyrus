const { spawnSync } = require('node:child_process');

// Keep runner-specific tests in their own runner, forwarding CLI flags to Jest.
const jest = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), ...process.argv.slice(2)], {
  stdio: 'inherit', env: process.env,
});
if (jest.status !== 0) process.exit(jest.status || 1);
const nodeTests = spawnSync(process.execPath, ['--test',
  'src/services/driverLocationMath.test.ts',
  'src/services/transportLiveSimulation.test.ts',
], { stdio: 'inherit', env: process.env });
process.exit(nodeTests.status || (nodeTests.error ? 1 : 0));
