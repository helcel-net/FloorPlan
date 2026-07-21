import nextConfig from 'eslint-config-next';

const config = [
  ...nextConfig,
  {
    ignores: ['blender/**', 'artifact.html']
  }
];

export default config;
