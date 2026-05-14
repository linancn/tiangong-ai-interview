import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { renderMarkdownReport } from "@/lib/interview/report";
import { requireAdminPageAuth } from "@/lib/server/admin-auth";
import {
  getSessionBundleById,
  listSessionMessages,
} from "@/lib/server/interviews";
import { candidateInterviewUrl } from "@/lib/server/request-url";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdminPageAuth(`/admin/sessions/${id}`);
  const bundle = await getSessionBundleById(id).catch(() => null);

  if (!bundle) notFound();

  const messages = await listSessionMessages(bundle.session.id);
  const candidateUrl = candidateInterviewUrl(bundle.session.token);
  const markdown =
    bundle.report.finalMarkdown ??
    renderMarkdownReport({
      roleName: bundle.interview.roleName,
      companyName: bundle.interview.companyName,
      candidateName: bundle.session.candidateName,
      rubric: bundle.interview.rubric,
      reportState: bundle.reportState,
      transcript: messages,
    });

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <Button variant="outline" nativeButton={false} render={<Link href="/admin" />}>
            返回管理页
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {bundle.interview.roleName}
                </CardTitle>
                <Badge
                  variant={
                    bundle.session.status === "finished"
                      ? "default"
                      : "secondary"
                  }
                >
                  {bundle.session.status === "finished" ? "已结束" : "进行中"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">公司或团队</p>
                <p className="font-medium">
                  {bundle.interview.companyName || "未填写"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">背景</p>
                <p className="whitespace-pre-wrap">
                  {bundle.interview.companyContext || "未填写"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">候选人</p>
                <p className="font-medium">
                  {bundle.session.candidateName || "未填写"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">候选人链接</p>
                <a
                  className="break-all font-mono text-xs underline-offset-4 hover:underline"
                  href={candidateUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {candidateUrl}
                </a>
              </div>
              <div>
                <p className="text-muted-foreground">进度</p>
                <div className="mt-2 space-y-2">
                  <Progress
                    value={
                      (bundle.session.turnCount / bundle.interview.maxTurns) *
                      100
                    }
                  />
                  <p>
                    {bundle.session.turnCount} / {bundle.interview.maxTurns} 轮
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<a href={`/api/report/${bundle.session.id}`} />}
              >
                <DownloadIcon className="size-4" />
                导出 Markdown
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">评分</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bundle.interview.rubric.map((dimension) => {
                const score = bundle.reportState.scores[dimension.id];
                return (
                  <div key={dimension.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{dimension.name}</p>
                      <Badge variant="outline">{score?.score ?? "N/A"}</Badge>
                    </div>
                    <Progress value={(score?.score ?? 0) * 10} />
                    <div className="text-muted-foreground text-xs">
                      {(score?.evidence ?? []).slice(0, 2).map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">完整对话</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] rounded-md border p-4">
                <div className="space-y-4">
                  {messages.length ? (
                    messages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <Badge variant={message.role === "user" ? "secondary" : "outline"}>
                          {message.role === "user" ? "候选人" : "面试官"}
                        </Badge>
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">暂无对话</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Markdown 报告预览</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-4 text-sm leading-6">
                {markdown}
              </pre>
            </CardContent>
          </Card>

          <Separator />
        </section>
      </div>
    </main>
  );
}
