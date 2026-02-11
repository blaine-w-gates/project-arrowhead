import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataHealth } from "@/hooks/useDataHealth";
import { useQueryClient } from "@tanstack/react-query";
import { getDataHealth } from "@/services/adminApi";

interface Props {
  adminKey: string;
}

export default function DataHealthCard({ adminKey }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useDataHealth(adminKey);

  const driftBadge = useMemo(() => {
    if (!data) return null;
    return data.drift_ok ? (
      <Badge className="bg-green-600">Drift OK</Badge>
    ) : (
      <Badge className="bg-red-600">Drift NOK</Badge>
    );
  }, [data]);

  const handleForceRefresh = async () => {
    if (!adminKey) return;
    const fresh = await getDataHealth(adminKey, { noCache: true });
    queryClient.setQueryData(["/api", "admin", "data-health", adminKey || "_"], fresh);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Data Health</CardTitle>
        <div className="flex items-center gap-2">
          {data && driftBadge}
          {data?.stale && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-800">Stale</Badge>}
          {data?.cached && !data?.stale && <Badge variant="secondary">Cached</Badge>}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleForceRefresh} disabled={isFetching}>
            Force Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!adminKey && (
          <p className="text-sm text-muted-foreground">Enter Admin Key to view Data Health.</p>
        )}

        {adminKey && isLoading && (
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {adminKey && error && (
          <p className="text-sm text-red-600">{error.message}</p>
        )}

        {adminKey && data && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Filesystem count</div>
                <div className="text-lg font-semibold">{data.counts?.fs ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Database count</div>
                <div className="text-lg font-semibold">{data.counts?.db ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Only in FS</div>
                <div className="text-lg font-semibold">{data.drift?.only_fs?.length ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Only in DB</div>
                <div className="text-lg font-semibold">{data.drift?.only_db?.length ?? 0}</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Last updated: {data.fetched_at ?? data.timestamp ?? "-"}
              {data.cached ? " (cached)" : ""}
            </div>

            {data.run?.url && (
              <a
                href={data.run.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 underline"
              >
                View run in GitHub
              </a>
            )}

            <div>
              <a
                href="https://github.com/blaine-w-gates/project-arrowhead/blob/main/docs/data-health-runbook.md"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground underline"
              >
                Incident runbook
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
