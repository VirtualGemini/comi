# 05 — 卡片多语言

**What to build:** 部署者在 workflow 里配置 `lang` 后,卡片全部文案以所选语言渲染;v1 支持 en / zh-CN / zh-TW / ja 四种语言,新增语言只需新增一个资源文件。

**Blocked by:** 04 — 像素猫卡片 v1

**Status:** ready-for-agent

- [ ] 文案按语言各一个资源文件维护(`locales/<lang>.json` 形态,PRD §4);覆盖五档心情状态文案与四个阶段名
- [ ] `lang` input 贯通到渲染,默认 en;非法值报错并列出可选值(PRD §7)
- [ ] 键集一致性测试:四语言资源文件的键集合完全一致
- [ ] 四语言样张各一张,用户过目文案(此条由用户验收)
