import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { GooeyLoader } from "@/components/ui/loader-10";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: { retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 180,
    defaultPendingMinMs: 450,
    defaultPendingComponent: () => (
      <div className="grid min-h-[70svh] place-items-center bg-background">
        <GooeyLoader label="Bnoy Study khul raha hai" />
      </div>
    ),
  });

  return router;
};
