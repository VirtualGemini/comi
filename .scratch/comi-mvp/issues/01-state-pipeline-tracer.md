# 01 — 状态管道 tracer

**What to build:** 主人在 profile 仓库的 workflow 里引用 comi 并手动触发一次后:Action 读取 inputs,在配置的状态分支(默认 `pet`)上初始化或读取状态文件(schema v1,新猫 mood 60、等级 1、累计喂食量 0),写出一张引用当前状态的**占位卡片** SVG,把两者提交回该分支;README 通过 raw URL 引用即可见猫位。重复运行读取已有状态并推进 `updated_at`,保证每次运行必有提交(保活,PRD §6)。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 首次运行:状态分支不存在时创建,生成符合 PRD §6 schema v1 的 state.json(新猫默认值:mood 60、level 1、total_feeding 0、daily_intake 当日归零)
- [ ] 再次运行:读取已有状态,`updated_at` 推进并产生一次提交
- [ ] 占位卡片 SVG 与 state.json 同步写入,显示 cat_name 与 Lv 数值
- [ ] `cat_name`、`branch` inputs 生效,未配置时用 PRD §7 默认值
- [ ] 状态读写与分支提交逻辑有单元测试,git/网络经接口注入假实现(docs/development.md §5)
- [ ] 用户在测试 profile 仓库 workflow_dispatch 实测:README 出现占位卡片(此条由用户验证)
