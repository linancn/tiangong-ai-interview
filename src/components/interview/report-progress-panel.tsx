"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { ReportState, RubricDimension } from "@/lib/interview/types";

type HistoryPayload = {
  session: {
    status: string;
    turnCount: number;
  };
  interview: {
    roleName: string;
    maxTurns: number;
    rubric: RubricDimension[];
  };
  reportState: ReportState;
};

export function ReportProgressPanel({ token }: { token: string }) {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/history?token=${token}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "加载失败");
        if (active) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      }
    }

    void load();
    const timer = window.setInterval(load, 4000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token]);

  const progressValue = useMemo(() => {
    if (!data) return 0;
    return Math.min(
      100,
      Math.round((data.session.turnCount / data.interview.maxTurns) * 100),
    );
  }, [data]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircleIcon className="size-4" />
            状态不可用
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">报告状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-3 w-2/3 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{data.interview.roleName}</CardTitle>
            <Badge variant={data.session.status === "finished" ? "default" : "secondary"}>
              {data.session.status === "finished" ? "已结束" : "进行中"}
            </Badge>
          </div>
          <Progress value={progressValue} />
          <p className="text-muted-foreground text-xs">
            {data.session.turnCount} / {data.interview.maxTurns} 轮
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">维度评分</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.interview.rubric.map((dimension) => {
            const score = data.reportState.scores[dimension.id];
            return (
              <div key={dimension.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {dimension.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {score?.evidence.length ?? 0} 条证据
                    </p>
                  </div>
                  <Badge variant="outline">{score?.score ?? "N/A"}</Badge>
                </div>
                <Progress value={(score?.score ?? 0) * 10} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="size-4" />
            风险与追问
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="mb-2 font-medium">风险点</p>
            <div className="space-y-1 text-muted-foreground">
              {data.reportState.riskFlags.length ? (
                data.reportState.riskFlags.map((risk) => (
                  <p key={risk}>- {risk}</p>
                ))
              ) : (
                <p>暂无</p>
              )}
            </div>
          </div>
          <Separator />
          <div>
            <p className="mb-2 font-medium">建议复试问题</p>
            <div className="space-y-1 text-muted-foreground">
              {data.reportState.recommendedFollowups.length ? (
                data.reportState.recommendedFollowups.map((question) => (
                  <p key={question}>- {question}</p>
                ))
              ) : (
                <p>暂无</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
