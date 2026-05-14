"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, Loader2Icon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CreateResult = {
  candidateUrl: string;
  session: { id: string };
};

export function InterviewForm() {
  const router = useRouter();
  const [result, setResult] = useState<CreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/admin/interviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "创建失败");

      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">创建面试</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">面试名称</Label>
            <Input id="title" name="title" required placeholder="后端工程师一面" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="roleName">岗位名称</Label>
            <Input id="roleName" name="roleName" required placeholder="高级后端工程师" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="jd">JD</Label>
            <Textarea id="jd" name="jd" rows={5} placeholder="岗位职责、技术栈、业务背景" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="goalsText">考核目标</Label>
            <Textarea
              id="goalsText"
              name="goalsText"
              rows={4}
              placeholder={"每行一个目标\n验证系统设计能力\n验证线上问题复盘能力"}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rubricText">评分维度</Label>
            <Textarea
              id="rubricText"
              name="rubricText"
              rows={5}
              placeholder={"每行一个维度，可用冒号补充说明\n技术深度：关键技术、边界条件、故障处理\n沟通表达：事实、取舍、结果"}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <div className="grid gap-2">
              <Label htmlFor="maxTurns">最大轮数</Label>
              <Input
                id="maxTurns"
                name="maxTurns"
                type="number"
                min={1}
                max={30}
                defaultValue={10}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidateName">候选人</Label>
              <Input id="candidateName" name="candidateName" placeholder="姓名" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="candidateResume">简历摘要</Label>
            <Textarea
              id="candidateResume"
              name="candidateResume"
              rows={4}
              placeholder="可选，粘贴候选人简历重点"
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <Button type="submit" disabled={loading} className="w-fit">
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <PlusIcon className="size-4" />
            )}
            创建并生成链接
          </Button>
        </form>

        {result ? (
          <div className="mt-5 rounded-md border bg-muted/40 p-3">
            <p className="mb-2 font-medium text-sm">候选人链接</p>
            <div className="flex gap-2">
              <Input readOnly value={result.candidateUrl} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigator.clipboard.writeText(result.candidateUrl)}
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
