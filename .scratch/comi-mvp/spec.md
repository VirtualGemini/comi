# comi MVP — PRD

一只住在 GitHub profile README 里的像素猫:主人的开发活动喂养它,由 GitHub Actions 驱动,无服务器、完全免费、数据全在主人自己的仓库里。

术语见根目录 `CONTEXT.md`;架构决策见 `docs/adr/`。本文所有数值均为默认值,实现为可调参数。

## 1. 概述

- **产品**:comi,开源 GitHub Action。任何 GitHub 用户在自己的 profile 仓库(`<username>/<username>`)接入后,README 里出现一只由其活动喂养的像素猫。
- **目标用户**:所有拥有 GitHub 账号、愿意装点 profile 的开发者。
- **卖点**:完全免费(跑在用户自己的公开仓库 Actions 上)、无服务器依赖、状态数据归用户所有、5 分钟接入。

## 2. 核心场景

**S1 接入**:新用户复制一个 workflow 文件到 profile 仓库、README 加一行图片引用、手动触发一次 workflow,即看到自己的猫。全程 ≤ 5 分钟、零 token 配置。

**S2 日常喂养**:主人上午 push 了 3 个 commit。下一次整点轮询时,猫入账 9 点喂食,心情从「平静」升到「开心」,卡片上的猫开始摇尾巴,累计喂食量同步增长。

**S3 离开与回归**:主人休假两周,心情随时间衰减到底,猫睡着(zzz 动画)。回归后的第一次活动在下次轮询入账,猫立刻醒来(心情至少回到「平静」),等级与累计喂食量保持原值。

## 3. 玩法规则

### 3.1 心情(即时层)

- 取值 0–100,新猫初始 60。
- 五档,直接对应卡片动画:

| 档位 | 区间 | 卡片表现 |
|------|------|----------|
| 兴奋 | 80–100 | 星星眼、原地小跳 |
| 开心 | 60–79 | 摇尾巴 |
| 平静 | 40–59 | 呼吸 idle、偶尔舔毛 |
| 无聊 | 20–39 | 打哈欠、趴下 |
| 睡着 | 0–19 | 蜷成一团,zzz 气泡 |

- **衰减**:每小时 −0.5,按两次运行的时间差折算,下限 0。
- **喂食入账**:心情 += 当次入账份量,上限 100。
- **唤醒**:结算前处于「睡着」且本次有任意喂食入账时,结算后心情取 `max(结算值, 40)`。

### 3.2 等级(成长层)

- 累计喂食量:所有入账份量(封顶后的实际值)的终身累加,只增不减。
- 升级门槛:达到等级 N 需要累计喂食量 ≥ `50 × (N−1) × N`。关键节点:L2=100,L3=300,L5=1000,L10=4500,L15=10500。
- **阶段**:等级映射体型——幼年(L1–4)、成长(L5–9)、成年(L10–14)、成熟(L15+)。

### 3.3 食谱

| 档位 | 计入的活动(Events API) | 单份 | 每日封顶 |
|------|------------------------|------|----------|
| 日常粮 | PushEvent 中的 distinct commit,每条一份 | +3 | 15 |
| 加餐 | IssuesEvent(opened)、PullRequestEvent(opened)、PullRequestReviewEvent、IssueCommentEvent(created),每次一份 | +8 | 24 |
| 盛宴 | PullRequestEvent(closed 且 merged,主人为合并执行者)、ReleaseEvent(published),每次一份 | +20 | 40 |

- 封顶按日历日结算,时区默认 UTC、可配置。
- **守卫规则**:只统计主人本人为执行者(actor)的事件;profile 仓库自身的事件不计;bot 身份的事件不计。

## 4. 卡片规格

- 一张 SVG,默认 495×195,左侧猫、右侧状态区:猫名、等级(Lv.N 与阶段体型)、心情条(五档色阶)、当前状态文案(如「comi 正在打盹…」)。
- 像素画风;动画用 CSS `steps()` 帧动画,每档心情一组 2–4 帧循环。
- v1 美术资产:一套猫 sprite × 5 档心情动画;阶段用尺寸与配饰区分(幼年 0.7×,成长 0.85×,成年 1×,成熟 1× + 围巾)。
- 暗色适配:SVG 内嵌 `prefers-color-scheme` media query,亮/暗两套背景与文字色,v1 必备。
- 卡片文案国际化:v1 支持简体中文(zh-CN)、繁体中文(zh-TW)、日语(ja)、英语(en)四种语言,部署时通过 `lang` 配置;文案按语言各一个资源文件维护(`locales/<lang>.json`),新增语言即新增一个资源文件。

## 5. 接入流程

1. 在 `<username>/<username>` 仓库创建 `.github/workflows/comi.yml`(从 README 模板复制,核心一行 `uses: <org>/comi@v1`)。
2. README 加 `![comi](https://raw.githubusercontent.com/<username>/<username>/pet/comi.svg)`。
3. Actions 页手动触发一次(workflow_dispatch),首次运行生成 `pet` 分支与卡片。

workflow 权限:`contents: write`,GITHUB_TOKEN 默认能力即可,无需任何自建 token。

## 6. 技术架构

- **发布形态**:GitHub Action(marketplace),用户仓库里只有一个薄 workflow 引用 `@v1`,升级随 tag 自动生效。
- **触发**:`schedule`(每小时一次,cron 分钟取非整点值,如 `23 * * * *`)+ `workflow_dispatch`。
- **单次运行流程**:checkout `pet` 分支 → 带 ETag 调 `GET /users/{username}/events` → 守卫规则过滤 → 按 `last_event_id` 去重、按食谱与每日封顶结算 → 按时间差结算心情衰减 → 更新状态 JSON → 重绘 SVG → commit 并 push 到 `pet` 分支。
- **状态文件** `pet/state.json`(schema v1):

```json
{
  "schema_version": 1,
  "cat_name": "comi",
  "mood": 62.5,
  "total_feeding": 1180,
  "level": 5,
  "last_event_id": "34567890123",
  "daily_intake": { "date": "2026-07-16", "kibble": 9, "snack": 8, "feast": 0 },
  "updated_at": "2026-07-16T09:23:11Z"
}
```

- **保活**:心情衰减保证每次运行状态必有变化、必有 commit,scheduled workflow 持续满足 GitHub 的仓库活跃要求。
- **平台约束(设计输入)**:Events API 仅保留最近 30 天/约 300 条,事件到达延迟 30 秒–6 小时;猫的反应节奏以此为准,卡片与文档按小时级更新预期来表达。

## 7. 配置项(v1 最小集)

| 配置 | 默认 | 说明 |
|------|------|------|
| `cat_name` | comi | 卡片显示的猫名 |
| `lang` | en | 卡片语言:en / zh-CN / zh-TW / ja |
| `branch` | pet | 状态与卡片所在分支 |
| `timezone` | UTC | 每日封顶的日切时区 |
| 轮询间隔 | 每小时 | 用户直接改自己 workflow 的 cron |

## 8. 路线图(v1.x,按优先级排序)

1. PAT 私有活动增强(fine-grained,Events 读权限)
2. 皮肤/主题系统(社区投稿)
3. 路人交互(访客对猫的动作)
4. 里程碑彩蛋(纪念日、第 100 次盛宴等)
5. 多宠物

## 9. 成功指标

- 仓库 star 数
- 接入仓库数(GitHub code search `uses: <org>/comi`)
- v1.x 后:社区皮肤投稿数
