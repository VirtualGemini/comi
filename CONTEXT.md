# comi — GitHub Profile 电子猫

一只住在 GitHub profile README 里的电子猫:主人的开发活动喂养它,由 GitHub Actions 驱动,无服务器、完全免费。

## Language

**猫 (Cat)**:
住在主人 profile README 里的电子宠物,其状态由主人的 GitHub 活动驱动。
_Avoid_: 宠物、电子鸡

**主人 (Owner)**:
养猫的 GitHub 用户,即 profile 仓库的所有者;其活动是猫的唯一食物来源。
_Avoid_: 用户

**活动 (Activity)**:
主人在 GitHub 上产生、可被 Events API 采集到的行为(push、PR、issue、merge 等)。
_Avoid_: 贡献

**喂食 (Feeding)**:
活动按食谱换算成份量、作用于心情与等级的过程。

**食谱 (Diet)**:
活动类型到喂食份量的换算表,分三档:日常粮 (Kibble)、加餐 (Snack)、盛宴 (Feast),每档每日封顶。

**心情 (Mood)**:
即时层状态:由近期活动驱动、随时间衰减,决定猫当下的表现。
_Avoid_: 活跃度、精神值

**卡片 (Card)**:
README 中引用的那张 SVG:像素猫动画 + 心情/等级状态 UI,由 workflow 定时重绘。
_Avoid_: 图片、徽章

**等级 (Level)**:
成长层状态:由累计活动驱动、只增不减,体现这只猫被养了多久、养得多好。
_Avoid_: 经验值

**阶段 (Stage)**:
等级映射的体型档:幼年(L1–4)、成长(L5–9)、成年(L10–14)、成熟(L15+)。
_Avoid_: 进化、形态
