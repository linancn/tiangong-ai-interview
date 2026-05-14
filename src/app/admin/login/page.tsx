import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/admin";

  if (await isAdminAuthenticated()) {
    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">管理员登录</CardTitle>
          <CardDescription>Tiangong Interview Console</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/admin/login" method="post" className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
              />
            </div>

            {params.error ? (
              <p className="text-destructive text-sm">密码不正确</p>
            ) : null}

            <Button type="submit" className="w-full">
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
