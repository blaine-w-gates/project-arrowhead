import { useQuery } from "@tanstack/react-query";
import { getDataHealth } from "@/services/adminApi";
import type { DataHealth } from "@/types/admin";

export function useDataHealth(adminKey: string) {
  return useQuery<DataHealth, Error>({
    queryKey: ["/api", "admin", "data-health", adminKey || "_"],
    queryFn: () => getDataHealth(adminKey),
    enabled: Boolean(adminKey),
    refetchInterval: 20_000,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}
