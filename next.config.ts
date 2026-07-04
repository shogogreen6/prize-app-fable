import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親ディレクトリに別の package-lock.json があるため、ワークスペースルートを明示する
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
