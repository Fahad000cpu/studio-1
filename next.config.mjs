
import serwist from "@serwist/next";

const withSerwist = serwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Your Next.js config
};

export default withSerwist(nextConfig);
