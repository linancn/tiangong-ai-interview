import Link from "next/link";
import {
  AlertCircleIcon,
  BriefcaseBusinessIcon,
  ExternalLinkIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react";

import { DeleteSessionButton } from "@/components/admin/delete-session-button";
import { InterviewForm } from "@/components/admin/interview-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPageAuth } from "@/lib/server/admin-auth";
import { listAdminSessions } from "@/lib/server/interviews";

export const dynamic = "force-dynamic";

async function loadRows() {
  try {
    return { rows: await listAdminSessions(), error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "加载失败",
    };
  }
}

export default async function AdminPage() {
  await requireAdminPageAuth("/admin");
  const { rows, error } = await loadRows();
  const finishedCount = rows.filter(
    ({ session }) => session.status === "finished",
  ).length;
  const activeCount = rows.length - finishedCount;

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-muted-foreground text-sm">
              Tiangong Interview Console
            </p>
            <h1 className="font-semibold text-2xl tracking-tight">面试管理</h1>
          </div>
          <form action="/api/admin/logout" method="post">
            <Button type="submit" variant="outline">
              退出
            </Button>
          </form>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[430px_1fr]">
        <section className="lg:sticky lg:top-6 lg:self-start">
          <InterviewForm />
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="rounded-lg shadow-sm" size="sm">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BriefcaseBusinessIcon className="size-4 text-primary" />
                  总记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-2xl">{rows.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-sm" size="sm">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UsersIcon className="size-4 text-primary" />
                  进行中
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-2xl">{activeCount}</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg shadow-sm" size="sm">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileTextIcon className="size-4 text-primary" />
                  已结束
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-2xl">{finishedCount}</p>
              </CardContent>
            </Card>
          </div>

          {error ? (
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircleIcon className="size-4" />
                  数据库不可用
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {error}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">面试记录</CardTitle>
                <CardDescription>
                  查看候选人对话、结构化评分和最终 Markdown 报告。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60">
                        <TableHead>岗位</TableHead>
                        <TableHead>候选人</TableHead>
                        <TableHead>语言</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>进度</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length ? (
                        rows.map(({ session, interview }) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div className="font-medium">
                                {interview.roleName}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {[interview.companyName, interview.title]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </div>
                            </TableCell>
                            <TableCell>
                              {session.candidateName || "未填写"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {interview.language === "en"
                                  ? "English"
                                  : "中文"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  session.status === "finished"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {session.status === "finished"
                                  ? "已结束"
                                  : "进行中"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {session.turnCount} / {interview.maxTurns}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  nativeButton={false}
                                  render={<Link href={`/admin/sessions/${session.id}`} />}
                                >
                                  查看
                                  <ExternalLinkIcon className="size-3.5" />
                                </Button>
                                <DeleteSessionButton
                                  sessionId={session.id}
                                  label={`${interview.roleName} - ${
                                    session.candidateName || "未填写"
                                  }`}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="h-24 text-center text-muted-foreground"
                          >
                            暂无记录
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
