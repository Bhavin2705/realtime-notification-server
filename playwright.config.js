module.exports = {
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.test.js',
  timeout: 30000,
  reporter: [['list']],
  use: {
    headless: true,
  },
};
