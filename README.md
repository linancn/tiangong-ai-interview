# Tiangong Interview

结构化 AI 面试 MVP。

## 功能

- 管理员创建面试配置、候选人资料和候选人链接
- 候选人通过 `/i/[token]` 使用 assistant-ui Thread 聊天
- `/api/chat` 每轮执行隐藏评估并流式返回下一题
- Drizzle + Postgres 保存面试、会话、消息和报告状态
- 管理页查看完整对话、评分、报告并导出 Markdown

## 本地运行

```bash
pnpm install
pnpm dev
```

当前服务会自动选择可用端口。管理页入口：

```text
http://localhost:3001/admin
```

## 配置

模型配置从项目根目录 `config.toml` 读取，也可用环境变量覆盖：

```toml
model = "gpt-5.4-mini"
base_url = "https://api.openai.com/v1"
api_key = "..."
```

数据库使用 Neon/Postgres：

```bash
export DATABASE_URL="postgres://..."
pnpm db:migrate
```

`config.toml` 已加入 `.gitignore`，不要提交真实密钥。

## Docker 本机生产环境

Docker Compose 会启动：

- `postgres:18-alpine`
- Next.js 应用容器

应用容器启动时会先执行 Drizzle migration，再运行 `next start`。

```bash
pnpm docker:up
```

访问：

```text
http://localhost:3001/admin
```

查看日志：

```bash
pnpm docker:logs
```

停止应用和数据库：

```bash
pnpm docker:down
```

只启动本机 PostgreSQL，给本机 Node/PM2 使用：

```bash
pnpm docker:db
export DATABASE_URL="postgres://tiangong:tiangong_password@localhost:5433/tiangong_interview"
pnpm db:migrate
```

## PM2 驻留

PM2 适合不把 Next.js 应用放进 Docker、只用 Docker 跑数据库的本机生产方式。

```bash
pnpm install
pnpm docker:db
export DATABASE_URL="postgres://tiangong:tiangong_password@localhost:5433/tiangong_interview"
pnpm db:migrate
pnpm build
pnpm pm2:start
pnpm pm2:save
```

常用操作：

```bash
pnpm pm2:logs
pnpm pm2:restart
pnpm pm2:stop
pnpm pm2:delete
```

需要开机自启时运行：

```bash
pnpm pm2:startup
```

## 常用命令

```bash
pnpm lint
pnpm build
pnpm docker:up
pnpm docker:down
pnpm pm2:start
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```
