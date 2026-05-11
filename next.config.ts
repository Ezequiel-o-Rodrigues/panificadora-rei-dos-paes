import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_TARGET === "desktop" ? "standalone" : undefined,
  outputFileTracingRoot: path.join(__dirname),
  // ws e o caminho neon-serverless ficam EXTERNOS no bundle — sem isso,
  // os modulos sao bundlados e um timer interno do ws dispara durante
  // "Generating static pages" com "b.mask is not a function". O Pool
  // so eh instanciado no Electron standalone (ELECTRON_RUN_AS_NODE=1).
  serverExternalPackages: ["ws", "@neondatabase/serverless"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-three/drei"],
  },
  transpilePackages: ["three"],
};

export default nextConfig;
