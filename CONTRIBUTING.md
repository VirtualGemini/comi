# Contributing

感谢为 comi 做贡献。

开始前请通读[开发指南](docs/development.md)——它是工具链、编码规则、测试、提交、CI 与发布的单一事实来源。

## 快速开始

```sh
make bootstrap
make hooks-install
make check
```

推送或宣布分支就绪前,校验完整提交范围:

```sh
BASE_SHA="$(git merge-base origin/main HEAD)"
./scripts/check-commits.sh "$BASE_SHA" HEAD
```

工单以本地 markdown 形式存放在 `.scratch/<feature>/issues/`,一个分支对应一个工单。

**Agent 注意**:Agent 禁止参与提交;需要提交时停下,等待用户执行。详见开发指南 §8。
