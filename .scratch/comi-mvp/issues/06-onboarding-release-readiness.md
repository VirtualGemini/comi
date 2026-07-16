# 06 — 接入体验与发布就绪

**What to build:** 新用户照 README 完成 S1:复制一个 workflow 文件、README 加一行图片引用、手动触发一次,≤5 分钟看到自己的猫,零 token 配置;维护者照文档即可完成 marketplace 发布。

**Blocked by:** 03 — 喂食结算引擎;05 — 卡片多语言

**Status:** ready-for-agent

- [ ] README(en 与 zh-CN)使用章节:可复制的 comi.yml 模板(`uses: <org>/comi@v1`、`schedule` 非整点 cron、`workflow_dispatch`、`permissions: contents: write`)与 README 图片引用行(PRD §5)
- [ ] action.yml marketplace 元数据核对:name / description / branding / inputs 与 PRD §7 一致
- [ ] 发布步骤落成可操作清单(签名 tag `vX.Y.Z`、维护 `v1` 大版本别名),入开发指南 §11
- [ ] CHANGELOG 首个版本条目就绪
- [ ] 用户在真实 profile 仓库按 README 实测 S1 ≤5 分钟(此条由用户验证)
