/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js configuration can go here.
  // We have removed the withSerwist wrapper as it was causing server start issues.
  // A new, manual service worker has been created in `public/sw.js` for PWA and push notifications.
};

export default nextConfig;
