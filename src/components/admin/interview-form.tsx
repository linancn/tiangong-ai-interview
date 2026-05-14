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
            <Input
              id="title"
              name="title"
              required
              placeholder="销售经理二面 / 财务 BP 初面 / 校招生综合面"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="companyName">公司或团队</Label>
            <Input
              id="companyName"
              name="companyName"
              placeholder="公司名称、事业部或团队名称"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="companyContext">公司和岗位背景</Label>
            <Textarea
              id="companyContext"
              name="companyContext"
              rows={4}
              placeholder="行业、产品、客户类型、团队阶段、文化要求、该岗位面对的业务场景"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="roleName">岗位名称</Label>
            <Input
              id="roleName"
              name="roleName"
              required
              placeholder="客户成功经理 / 财务分析师 / 产品运营 / 护士长"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="jd">JD</Label>
            <Textarea
              id="jd"
              name="jd"
              rows={5}
              placeholder="岗位职责、任职要求、关键产出、协作对象、业务约束"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="goalsText">考核目标</Label>
            <Textarea
              id="goalsText"
              name="goalsText"
              rows={4}
              placeholder={"每行一个目标\n验证候选人是否做过相似业务场景\n验证关键职责的判断和推进能力\n验证与公司文化和团队阶段的匹配"}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rubricText">评分维度</Label>
            <Textarea
              id="rubricText"
              name="rubricText"
              rows={5}
              placeholder={"每行一个维度，可用冒号补充说明\n岗位匹配度：经历、职责范围、成果证据\n专业判断：场景分析、取舍、风险意识\n执行与负责：推进方式、结果指标、复盘\n沟通表达：事实、对象、影响"}
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
              placeholder="可选，粘贴候选人简历、作品集、业绩、证书或过往职责重点"
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
