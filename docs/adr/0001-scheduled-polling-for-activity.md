# 通过定时轮询 Events API 采集主人活动

猫的活动来源是 profile 仓库内的 scheduled workflow,定时调用 GitHub Events API(`GET /users/{username}/events`)。默认用仓库自带的 GITHUB_TOKEN 采集公开活动,零配置;可选配置 fine-grained PAT(Events 读权限)以覆盖私有活动。
