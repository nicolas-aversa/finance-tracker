import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Credit-card statement PDFs are uploaded to a Server Action; the default
    // 1MB body limit is too small for a multi-page statement.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
