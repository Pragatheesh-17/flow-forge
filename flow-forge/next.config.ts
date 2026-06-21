import type { NextConfig } from "next";

function toHost(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

const allowedDevOrigins = Array.from(
  new Set(
    [
      toHost(process.env.NEXT_PUBLIC_APP_URL),
      toHost(process.env.NEXT_PUBLIC_BASE_URL),
      "localhost",
      "127.0.0.1",
    ].filter((value): value is string => Boolean(value))
  )
);

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
