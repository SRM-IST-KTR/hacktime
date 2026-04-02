import type { MetadataRoute } from "next";

const siteUrl = "https://hacktime.githubsrmist.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/participant"],
        disallow: [
          "/api/",
          "/dashboard",
          "/flow",
          "/join",
          "/login",
          "/profile",
          "/room/",
          "/clock",
          "/stage",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
