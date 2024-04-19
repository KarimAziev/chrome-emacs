module.exports = {
  preset: 'ts-jest',
  testEnvironment: './jest.environment.ts',

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
