import path from "node:path";
import type { NextConfig } from "next";

const asyncStorageStub = path.join(
  process.cwd(),
  "src/stubs/async-storage.js"
);

const nextConfig: NextConfig = {
  transpilePackages: ["@rainbow-me/rainbowkit"],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": asyncStorageStub,
    };
    return config;
  },
};

export default nextConfig;
