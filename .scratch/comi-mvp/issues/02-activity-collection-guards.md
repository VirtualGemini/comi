# 02 — 活动采集与守卫

**What to build:** 每次运行时,comi 轮询主人的公开事件流,把守卫规则过滤后的新事件识别为喂食并映射到食谱档位;运行日志列出本次入账清单,`last_event_id` 推进保证同一事件不会重复入账。主人产生真实活动后手动触发,即可在日志里看到这次「吃了什么」。

**Blocked by:** 01 — 状态管道 tracer

**Status:** ready-for-agent

- [ ] 调用 `GET /users/{username}/events`,带 ETag、支持翻页,读到 `last_event_id` 或流末尾为止(ADR 0001、PRD §6)
- [ ] 守卫规则三条各有测试(PRD §3.3):仅主人本人为 actor 的事件;profile 仓库自身的事件不计;bot 身份的事件不计
- [ ] 事件按 PRD §3.3 食谱表映射档位:PushEvent distinct commit → 日常粮;IssuesEvent(opened)/PullRequestEvent(opened)/PullRequestReviewEvent/IssueCommentEvent(created) → 加餐;PullRequestEvent(closed 且 merged 且主人为合并执行者)/ReleaseEvent(published) → 盛宴
- [ ] `last_event_id` 持久化推进;同一事件跨两次运行不重复入账(测试)
- [ ] 运行日志输出本次入账清单(档位 + 数量);Events API 交互经接口注入假实现测试
