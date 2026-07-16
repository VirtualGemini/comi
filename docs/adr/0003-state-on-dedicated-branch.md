# 状态与卡片存放在专用分支

状态 JSON 与卡片 SVG 由 workflow 提交到 profile 仓库的专用分支(默认 `pet`),README 通过 raw URL 引用卡片;该分支历史可随时压缩。轮询节奏默认每小时一次,间隔可配置。
