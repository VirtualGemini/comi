# 02 — 活动采集与守卫

**What to build:** 每次运行时,comi 轮询主人的公开事件流,把守卫规则过滤后的新事件识别为喂食并映射到食谱档位;运行日志列出本次入账清单,`last_event_id` 推进保证同一事件不会重复入账。主人产生真实活动后手动触发,即可在日志里看到这次「吃了什么」。

**Blocked by:** 01 — 状态管道 tracer

**Status:** ready-for-human

- [x] 调用 `GET /users/{username}/events`,带 ETag、支持翻页,读到 `last_event_id` 或流末尾为止(ADR 0001、PRD §6)
- [x] 守卫规则三条各有测试(PRD §3.3):仅主人本人为 actor 的事件;profile 仓库自身的事件不计;bot 身份的事件不计
- [x] 事件按 PRD §3.3 食谱表映射档位:PushEvent distinct commit → 日常粮;IssuesEvent(opened)/PullRequestEvent(opened)/PullRequestReviewEvent/IssueCommentEvent(created) → 加餐;PullRequestEvent(closed 且 merged 且主人为合并执行者)/ReleaseEvent(published) → 盛宴
- [x] `last_event_id` 持久化推进;同一事件跨两次运行不重复入账(测试)
- [x] 运行日志输出本次入账清单(档位 + 数量);Events API 交互经接口注入假实现测试

## Comments

- 2026-07-18:实现落在 `feat/02-activity-collection-guards` 工作区(按 Agent 禁止提交约定,等用户审阅后提交)。新增 `src/collect/`(EventsClient port、三条守卫、食谱映射、collector、octokit 适配器),`run.ts` 接入采集并输出入账日志,`state.json` 新增可空字段 `events_etag` 持久化轮询 ETag(旧状态文件解析为 null,schema 仍为 v1;PRD §6 示例待在 main 上补记)。测试 30 → 70 例全绿。设计要点:守卫过滤掉的事件仍推进 `last_event_id`(猫自身的 pet 分支提交不会被反复扫描);首次采集(`last_event_id` 为 null)按规格读到流末尾,整个可见事件窗口入账。待用户:提交本分支;真实活动后 workflow_dispatch 实测日志出现「吃了什么」清单后置为 resolved。
