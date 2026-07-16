# 开发指南

本文是 comi 开发、测试、提交、CI 与发布的单一事实来源。改动开发流程的 PR 必须同步更新本文。

## 1. 工具链

- Node 24(`.nvmrc`);Action 运行时 `node24`。
- TypeScript 5.7.2,严格模式。
- 包管理:pnpm 9.15.4,由 `package.json` 的 `packageManager` 字段钉死,经 corepack 提供;`pnpm-lock.yaml` 提交,CI 使用 `--frozen-lockfile`。
- Biome 1.9.4:唯一的 formatter 与 linter。
- vitest 2.1.8:唯一测试框架。
- @vercel/ncc:把 `src/main.ts` 打包为 `dist/index.js`。
- 依赖一律精确版本(不用 `^`/`~`);依赖升级使用独立 PR,不与功能改动混合。

## 2. 项目结构

```text
src/main.ts        Action 入口(当前为脚手架桩)
tests/             vitest 单元测试
dist/              ncc 打包产物,随源码提交,CI 以 check-dist 防漂移
```

实现模块按 `CONTEXT.md` 术语组织在 `src/` 下:`collect`(采集)、`feed`(喂食)、`state`(状态)、`render`(渲染)、`locales`(卡片文案)。

## 3. 语言

- 代码标识符、注释、commit message、`action.yml` 描述:英文。
- README:英文为主文件(`README.md`),简体中文版为 `README.zh-CN.md`,两者头部互链切换。
- 工程文档、PRD、ADR、`CONTEXT.md`:中文。
- 卡片文案:`src/locales/` 四语言资源文件(en / zh-CN / zh-TW / ja),键集合各语言保持一致。

## 4. 编码标准

- Biome 是唯一 formatter/linter,规则集 `recommended`;CI 只校验、不改写;开发者显式执行 `make format`。
- tsc `strict` + `noUncheckedIndexedAccess`;`any` 与非空断言不进主干。
- `src/`、`tests/`、`scripts/`、`.githooks/`、`Makefile`、workflow、`action.yml` 头部携带 `SPDX-License-Identifier: MIT`,`make check-spdx` 校验。
- 外部 Action 引用固定到完整 commit SHA。

## 5. 测试标准

- 测试文件位于 `tests/**/*.test.ts`。
- 单元测试纯净:不访问真实网络与文件系统;Events API 交互经接口注入假实现。
- 玩法数值(食谱、封顶、等级、心情档位)与 PRD 数值表一一对应断言。
- bug 修复从失败的回归测试开始。

## 6. 开发命令

```sh
make bootstrap       启用 corepack 并安装钉死版本的依赖
make hooks-install   安装仓库内版本化的 Git hooks
make format          格式化源码
make format-check    校验格式
make lint            Biome lint
make lint-scripts    ShellCheck 检查 shell 脚本与 hooks
make lint-actions    actionlint 检查 workflow
make typecheck       tsc --noEmit
make build           ncc 打包到 dist/
make test            运行单元测试
make check-spdx      校验 SPDX 许可头
make check-dist      重新打包并校验 dist 与源码一致
make check           运行全部本地质量门
make ci              运行 CI 等价门禁
make clean           清理 dist 与 coverage
```

## 7. Git hooks 与质量门

```sh
make hooks-install
```

该命令把 `core.hooksPath` 指向 `.githooks`;克隆仓库不会自动修改 Git 配置。

- **pre-commit**:format-check、lint、typecheck、check-spdx。
- **commit-msg**:提交信息校验(§8)。
- **pre-push**:test、build。

CI 重复所有可强制的检查;本地 hooks 是便利,永远不是唯一门禁。

创建提交后立即校验该条提交:

```sh
./scripts/check-commits.sh "$(git rev-parse HEAD^)" HEAD
```

推送、开 PR 或宣布分支就绪前,校验完整范围:

```sh
BASE_SHA="$(git merge-base origin/main HEAD)"
./scripts/check-commits.sh "$BASE_SHA" HEAD
```

## 8. Commit 规范

允许的类型:

```text
feat fix build refactor style chore test docs perf ci revert
```

scope 可选,空括号非法:

```text
feat: add diet settlement
feat(feed): add diet settlement
feat(): invalid
```

每个 commit 携带 DCO 尾部(`git commit -s`):

```text
Signed-off-by: Name <email>
```

破坏性变更使用 `type!:` 或 `type(scope)!:`,并携带迁移说明尾部:

```text
BREAKING-CHANGE: Describe the user-visible break and migration.
```

### Agent 与提交

**Agent 禁止参与提交。** Agent 不执行 `git commit`、`git push` 或任何改写仓库历史的操作。当变更达到需要提交的状态时,Agent 停下、汇报变更清单,等待用户反馈,由用户执行提交。

## 9. 分支与 PR

- `main` 是唯一长期分支,保持可发布。
- 一个分支对应一个工单,分支名 `type/工单号-kebab-case`,例如 `feat/01-events-collector`。
- PR 标题遵循 Conventional Commits;使用 squash 合并,每个工单在 `main` 上产生一条提交。
- 合并后删除分支。

## 10. CI

`ci.yml` 在 PR 与 `main` push 时运行:安装钉死依赖、逐条校验 PR 提交信息(§8)、执行 `make ci`(格式、lint、类型、shell/workflow 检查、SPDX、测试、构建与 dist 一致性)。

## 11. 版本与发布

- SemVer,签名标签 `vX.Y.Z`。
- 发布后维护大版本别名标签(如 `v1`)供用户 `uses: <org>/comi@v1` 跟随补丁。
- `CHANGELOG.md` 面向用户手写维护(Keep a Changelog)。
