/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs and its zip stack are server-only and reach for optional cloud
  // SDKs behind lazy requires the bundler cannot resolve. Loading them from
  // node_modules at runtime keeps code paths we never call out of the build.
  serverExternalPackages: ['exceljs', 'unzipper', 'archiver'],
};

module.exports = nextConfig;
