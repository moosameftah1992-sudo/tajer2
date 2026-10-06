import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "exceljs", "pdf-lib", "@pdf-lib/fontkit", "qrcode", "sharp"],
  poweredByHeader: false,
};

export default nextConfig;
