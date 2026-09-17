import type { MetadataRoute } from "next";

/** Panel origin. Apex and custom hosts are answered by the edge worker. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
