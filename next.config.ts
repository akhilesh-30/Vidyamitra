import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // NOTE: do NOT add "three" / "@react-three/fiber" / "framer-motion" to
  // experimental.optimizePackageImports - forcing barrel optimization on them
  // dramatically slows compilation. lucide-react is already optimized by default.
};

export default nextConfig;
