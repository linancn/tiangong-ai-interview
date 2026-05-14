"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

type DeleteSessionButtonProps = {
  sessionId: string;
  label: string;
};

export function DeleteSessionButton({
  sessionId,
  label,
}: DeleteSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const confirmed = window.confirm(
      `确认删除「${label}」？完整对话、评分和报告也会一起删除。`,
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/interviews", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "删除失败");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={loading}
      onClick={onDelete}
    >
      {loading ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <Trash2Icon className="size-3.5" />
      )}
      删除
    </Button>
  );
}
