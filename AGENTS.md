# AGENTS.md

## 项目目标

这是一个结构化 AI 面试 MVP。核心原则是：

- 聊天可以流式，报告必须结构化。
- 面试官负责提问，隐藏评估器负责打分，Markdown 只在结束时生成。
- 第一版不做语音、视频、复杂 RAG、多人协作、长期记忆。
- 候选人页面不能显示评分、风险点、rubric、追问建议、报告进度等会诱导回答的信息。
- 面试逻辑必须适配不同岗位和公司场景，不要默认生成前端、后端、架构、系统设计、线上故障类问题。

## 技术栈

- Next.js App Router，端口固定为 `3001`
- React 19
- assistant-ui 负责候选人聊天 Thread
- shadcn/ui 风格组件负责后台、表单、表格、报告预览
- Vercel AI SDK v6，`generateObject` 做隐藏评估，`streamText` 做下一题
- OpenAI-compatible provider：`@ai-sdk/openai`
- Drizzle ORM + PostgreSQL
- Docker Compose 本地跑 Postgres；PM2 可驻留 Next.js production server
- 包管理器：`pnpm@11.1.1`

添加或升级依赖时，先看 `package.json` 和现有约定。外部库/API/版本问题优先用 Context7 MCP 查最新官方文档；涉及 UI 动态渲染和交互验证优先用 Playwright MCP。

## 配置与密钥

运行配置来自项目根目录 `config.toml`，也支持环境变量覆盖。不要提交、打印或暴露真实值。

需要的配置项：

```toml
model = "..."
base_url = "..."
api_key = "..."
admin_password = "..."
deployment_url = "..."
```

代码入口：

- `src/lib/server/config.ts`
  - `getRuntimeConfig()` 读取模型、base URL、API key
  - `getAdminPassword()` 读取后台登录密码
  - `getDeploymentUrl()` 读取用于拼候选人完整链接的部署 URL
- `src/lib/server/model.ts` 用 `createOpenAI()` 创建模型
- `src/lib/server/request-url.ts` 统一拼 `candidateInterviewUrl(token)`

不要把网络、TLS、反代配置写死进应用逻辑。应用自身只负责生成 URL 和在 `3001` 提供 Next.js 服务。

## 运行命令

常用命令：

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm db:migrate
pnpm db:generate
pnpm db:studio
```

Docker/数据库：

```bash
pnpm docker:db
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

PM2：

```bash
pnpm pm2:start
pnpm pm2:restart
pnpm pm2:logs
pnpm pm2:save
pnpm pm2:stop
pnpm pm2:delete
```

本地开发数据库默认：

```bash
DATABASE_URL="postgres://tiangong:tiangong_password@localhost:5433/tiangong_interview"
```

Docker Compose 的 Postgres 服务：

- image: `postgres:18-alpine`
- container: `tiangong-interview-postgres`
- host port: `5433`
- database: `tiangong_interview`
- user: `tiangong`

如果 `next dev` 因 Turbopack 报 `OS file watch limit reached`，这通常是系统 inotify/watch limit 不足。临时验证可先用 `pnpm build && pnpm start` 跑 production server；真正恢复 HMR 需要调高系统 watch limit 或调整 dev 方式。

## 路由边界

公开候选人路由：

- `/i/[token]`：候选人聊天页，不需要登录。
- `/api/chat?token=...`：候选人聊天流式接口，不需要登录。
- `/api/history?token=...`：公开但只返回精简信息，不能返回评分、风险点、报告、rubric、完整对话。

后台路由，需要管理员登录：

- `/admin`
- `/admin/sessions/[id]`
- `/api/admin/interviews`
- `/api/report/[id]`
- `/api/history?id=...`

登录相关：

- `/admin/login`
- `/api/admin/login`
- `/api/admin/logout`

后台认证在 `src/lib/server/admin-auth.ts`。目前是单密码登录，不做用户管理。密码从 `config.toml` 的 `admin_password` 或 `ADMIN_PASSWORD` 读取。Cookie 名是 `tiangong_admin_session`，`secure` 只在 `ADMIN_COOKIE_SECURE=true` 时启用，方便本机 HTTP 运行。

## 数据库结构

Drizzle schema 在 `src/db/schema.ts`，迁移目录是 `drizzle/`。

核心表：

- `interviews`
  - 面试配置：标题、公司/团队、公司和岗位背景、岗位、JD、目标、rubric、最大轮数。
- `interview_sessions`
  - 候选人会话：候选人姓名/简历、token、状态、轮次。
- `interview_messages`
  - 完整对话消息。`session_id + external_id` 有唯一索引，避免重复保存 assistant-ui 消息。
- `interview_reports`
  - `report_state` JSONB 和最终 `final_markdown`。

`report_state` 类型在 `src/lib/interview/types.ts`：

- `overallStatus`
- `currentDimension`
- `scores`
- `askedQuestions`
- `riskFlags`
- `recommendedFollowups`
- `reportNotes`

不要每轮重写整篇 Markdown。每轮只更新结构化 `report_state`，结束时再渲染 Markdown。

## 面试流程

核心接口是 `src/app/api/chat/route.ts`。

每轮流程：

1. 通过 token 加载 session、interview、report。
2. 保存候选人最新消息。
3. 用 `generateObject` 调隐藏评估器，输出符合 Zod schema 的 JSON。
4. 用 `mergeReportState()` 合并结构化状态。
5. 如果应结束或达到最大轮数，用 `renderMarkdownReport()` 生成最终 Markdown，调用 `finishSession()`。
6. 如果未结束，用 `streamText()` 流式生成下一题。
7. `onFinish` 保存面试官消息、追加 asked question、递增轮次。

相关文件：

- `src/lib/interview/prompts.ts`：评估器和面试官 prompt
- `src/lib/interview/report.ts`：合并 report state、追加问题、渲染 Markdown
- `src/lib/interview/messages.ts`：从 AI SDK UIMessage 中提取文本
- `src/lib/server/interviews.ts`：数据库读写 helper

面试官输出规则：

- 每轮只问一个问题。
- 先根据岗位名称、公司背景、JD、目标和评分维度判断岗位类型。
- 问题要具体、可回答、能产生可评分证据。
- 不暴露评分、rubric、内部判断或 `report_state`。
- 优先追问含糊、缺少证据、缺少细节的回答。
- 销售、运营、市场、财务、人力、法务、医疗、教育、设计、客服、制造、管理、咨询等岗位要围绕各自真实职责和业务指标提问；只有上下文明确要求技术能力时才问技术实现。

评估器输出规则：

- 只输出结构化 JSON。
- 证据必须来自候选人回答，不要脑补。
- 没有证据不要给高分。
- concerns 必须具体。
- 简历只能作为追问线索，不能当作候选人已经回答过的 evidence。

## 前端页面

候选人页：

- `src/app/i/[token]/page.tsx`
- `src/components/interview/candidate-interview-chat.tsx`
- `src/components/assistant-ui/thread.tsx`

候选人页当前只保留聊天主界面。不要恢复右侧报告进度面板、附件、复制/重载/分支切换等对面试场景无关或会泄露信息的控件。

后台页：

- `src/app/admin/page.tsx`：创建面试、查看记录列表、退出登录。
- `src/components/admin/interview-form.tsx`：创建面试表单，提交后显示完整候选人链接。
- `src/app/admin/sessions/[id]/page.tsx`：完整对话、评分、报告预览、导出 Markdown。

UI 改动后用 Playwright 看真实页面，不只靠静态代码判断。优先用可访问性角色、文本和 test id 定位。

## API 约定

`POST /api/admin/interviews`

- 需要管理员登录。
- 请求字段：`title`、`roleName`、`jd`、`goalsText`、`rubricText`、`maxTurns`、`candidateName`、`candidateResume`。
- 响应包含 `candidateUrl`，由 `candidateInterviewUrl()` 生成。

`POST /api/chat?token=...`

- 候选人公开接口。
- 请求体使用 AI SDK/assistant-ui 的 `{ messages }`。
- 返回 AI SDK UI Message Stream。

`GET /api/history?token=...`

- 候选人公开精简接口。
- 只能返回 `session.status`、`session.turnCount`、`interview.roleName`、`interview.maxTurns`。

`GET /api/history?id=...`

- 管理员接口。
- 可返回 session、interview、report、reportState、messages。

`GET /api/report/[id]`

- 管理员接口。
- 返回 Markdown 报告。

## 已有测试数据

本地数据库里已有一个用于测试的 AI Harness 前端工程师面试：

- role: `前端工程师 - AI Harness Engineering`
- session id: `d44ad13f-7d7c-4368-bbb3-603e96e1502e`
- candidate token: `77haLit5cJPIE3Jhd4zM4zIs-J62h_WD`
- candidate path: `/i/77haLit5cJPIE3Jhd4zM4zIs-J62h_WD`
- max turns: `8`

这个 token 不是管理员凭据。管理员密码仍只从 `config.toml`/环境变量读取。

## 开发守则

- 使用 `rg`/`rg --files` 查找文件和文本。
- 手工改文件用 `apply_patch`。
- 不要回滚用户或其他 agent 的改动。
- 不要把 `config.toml` 的真实密钥、模型 key、后台密码写进日志、提交或文档。
- 每次改服务端行为后至少跑：

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

- 每次改候选人或后台 UI 后，用 Playwright 实际打开页面检查。
- 候选人页面尤其要确认没有出现评分、rubric、风险点、建议追问、报告进度。
- 修改数据库 schema 后，用 Drizzle 生成/应用迁移，不要手写临时 SQL 留在代码外。
- 保持第一版 MVP 边界，不引入语音、视频、复杂 RAG、多人协作、长期记忆，除非用户明确改变范围。
