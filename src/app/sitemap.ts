import type { MetadataRoute } from "next";
import { APPS, SITE_URL } from "@/lib/site";

// Every app in the workspace is reachable at its own deep-link path
// (derived in components/Workspace.tsx). List them so crawlers and agents
// can discover each tool.
export default function sitemap(): MetadataRoute.Sitemap {
  return APPS.map((app) => ({
    url: `${SITE_URL}${app.path}`,
    changeFrequency: "monthly",
    priority: app.path === "/" ? 1 : 0.8,
  }));
}
