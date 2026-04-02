import type { MetadataRoute } from "next";

const siteUrl = "https://hacktime.githubsrmist.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/participant"];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
