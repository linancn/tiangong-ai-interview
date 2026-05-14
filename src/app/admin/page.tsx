import Link from "next/link";
import { AlertCircleIcon, ExternalLinkIcon } from "lucide-react";

import { InterviewForm } from "@/components/admin/interview-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[420px_1fr]">
        <section>
          <InterviewForm />
        </section>

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-semibold text-2xl tracking-tight">
                面试记录
              </h1>
              <p className="text-muted-foreground text-sm">
                查看候选人对话、结构化评分和最终 Markdown 报告。
              </p>
            </div>
            <form action="/api/admin/logout" method="post">
              <Button type="submit" variant="outline">
                退出
              </Button>
            </form>
          </div>

          {error ? (
            <Card>
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>岗位</TableHead>
                      <TableHead>候选人</TableHead>
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
                              {interview.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.candidateName || "未填写"}
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
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              nativeButton={false}
                              render={<Link href={`/admin/sessions/${session.id}`} />}
                            >
                              查看
                              <ExternalLinkIcon className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          暂无记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
