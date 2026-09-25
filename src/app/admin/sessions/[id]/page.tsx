import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  getReportAssessment,
  renderMarkdownReport,
} from "@/lib/interview/report";
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

function SummaryList({
  title,
  items,
  empty,
  more,
}: {
  title: string;
  items: string[];
  empty: string;
  more: string;
}) {
  return (
    <div>
      <h2 className="mb-2 font-medium">{title}</h2>
      {items.length ? (
        <>
          <ul className="list-disc space-y-1 pl-5">
            {items.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {items.length > 3 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">
                {more}（{items.length - 3}）
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {items.slice(3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireAdminPageAuth(`/admin/sessions/${id}`);
  const bundle = await getSessionBundleById(id).catch(() => null);

  if (!bundle) notFound();

  const messages = await listSessionMessages(bundle.session.id);
  const candidateUrl = candidateInterviewUrl(bundle.session.token);
  const assessment = getReportAssessment(
    bundle.reportState,
    bundle.interview.rubric,
    bundle.interview.language,
  );
  const isEnglish = bundle.interview.language === "en";
  const copy = isEnglish
    ? {
        title: "Report summary",
        coverage: "Scored dimensions",
        average: "Average score",
        partial: " (scored dimensions only)",
        risks: "Key risks",
        noRisks: "No clear risks yet.",
        moreRisks: "Show remaining risks",
        followups: "Follow-up questions",
        noFollowups: "No follow-up questions yet.",
        moreFollowups: "Show remaining questions",
        fullReport: "Full Markdown report",
        conversation: "Original conversation",
      }
    : {
        title: "报告摘要",
        coverage: "已评分维度",
        average: "平均分",
        partial: "（仅已评分维度）",
        risks: "主要风险",
        noRisks: "暂无明确风险点。",
        moreRisks: "展开其余风险",
        followups: "建议追问",
        noFollowups: "暂无建议复试问题。",
        moreFollowups: "展开其余追问",
        fullReport: "完整 Markdown 报告",
        conversation: "原始对话",
      };
  const markdown = renderMarkdownReport({
    roleName: bundle.interview.roleName,
    language: bundle.interview.language,
    companyName: bundle.interview.companyName,
    candidateName: bundle.session.candidateName,
    rubric: bundle.interview.rubric,
    reportState: bundle.reportState,
    transcript: messages,
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">Interview Record</p>
            <h1 className="truncate font-semibold text-2xl tracking-tight">
              {bundle.interview.roleName}
            </h1>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href="/admin" />}>
            返回管理页
          </Button>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <Card className="rounded-lg shadow-sm">
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
                <p className="text-muted-foreground">界面语言</p>
                <Badge variant="outline">
                  {bundle.interview.language === "en" ? "English" : "中文"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">公司或团队</p>
                <p className="font-medium">
                  {bundle.interview.companyName || "未填写"}
                </p>
              </div>
              <div>
                <details>
                  <summary className="cursor-pointer text-muted-foreground">
                    背景
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">
                    {bundle.interview.companyContext || "未填写"}
                  </p>
                </details>
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

          <Card className="rounded-lg shadow-sm">
            <CardContent>
              <details>
                <summary className="cursor-pointer font-medium text-base">
                  评分明细（{assessment.scoredDimensions} / {assessment.totalDimensions}）
                </summary>
                <div className="mt-4 space-y-4">
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
                </div>
              </details>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{copy.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <p className="font-medium leading-6">{assessment.conclusion}</p>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <Badge variant={assessment.complete ? "outline" : "secondary"}>
                  {copy.coverage}：{assessment.scoredDimensions} / {assessment.totalDimensions}
                </Badge>
                <span>
                  {copy.average}{assessment.complete ? "" : copy.partial}：
                  {assessment.average === null ? "N/A" : assessment.average.toFixed(1)}
                </span>
              </div>
              <SummaryList
                title={copy.risks}
                items={bundle.reportState.riskFlags}
                empty={copy.noRisks}
                more={copy.moreRisks}
              />
              <SummaryList
                title={copy.followups}
                items={bundle.reportState.recommendedFollowups}
                empty={copy.noFollowups}
                more={copy.moreFollowups}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardContent>
              <details>
                <summary className="cursor-pointer font-medium text-base">
                  {copy.fullReport}
                </summary>
                <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-6">
                  {markdown}
                </pre>
              </details>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardContent>
              <details>
                <summary className="cursor-pointer font-medium text-base">
                  {copy.conversation}（{messages.length}）
                </summary>
                <ScrollArea className="mt-4 h-[420px] rounded-lg border bg-card p-4">
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
              </details>
            </CardContent>
          </Card>

          <Separator />
        </section>
      </div>
    </main>
  );
}
