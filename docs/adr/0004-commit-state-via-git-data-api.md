# 状态提交走 REST Git Data API

Action 用 workflow 自带凭据(`github_token` input,默认 `${{ github.token }}`)调用 GitHub REST Git Data API,把状态 JSON 与卡片 SVG 作为单个提交写回状态分支:以分支头为 parent、经 base_tree 叠加两个文件后推进分支引用;分支尚不存在时创建 root commit 并建立分支。用户 workflow 保持单步 `uses:` 引用。
