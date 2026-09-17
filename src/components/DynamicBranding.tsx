import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchAppSettings } from "@/lib/study";

/**
 * Applies the admin-controlled favicon at runtime so branding can change
 * without a redeploy. Renders nothing.
 */
export function DynamicBranding() {
  const settings = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const favicon = settings.data?.favicon_url;

  useEffect(() => {
    if (!favicon) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, [favicon]);

  return null;
}
