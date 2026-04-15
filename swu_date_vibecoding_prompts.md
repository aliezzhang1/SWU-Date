# SWU Date — Vibecoding 提示词清单 (已确认版)

## 使用原则

- 一次只做一个明确任务，不要一口气让模型生成整个项目
- 每次都要求"只改相关文件"
- 每次都要求"先给实现，再给自测方式"
- 优先做小闭环：每个 Prompt 结束都能运行验证
- 所有提示词默认基于以下约束：
  - 这是面向西南大学学生的校园匹配交友网站 "SWU Date"
  - 技术栈: Vite + React 18 + TypeScript + Zustand + 当前默认后端为 Supabase 免费层
  - 后端策略: 优先便宜或免费，服务层保持可替换，后续可迁移到 Cloudflare Workers/D1 等方案
  - 样式使用原生 CSS + CSS Variables
  - 登录方式: 学号 + 密码
  - 问卷: 控制在 15~20 题，当前默认 18 题，分 4 个模块
  - 双向同意后才能聊天
  - MVP 仅支持纯文本消息
  - 部署: Cloudflare Pages + Git push (电脑已安装 Git)

---

## Phase 0: 项目初始化

### Prompt 01：初始化项目骨架

```text
请帮我初始化一个 H5 网页项目，用 Vite + React 18 + TypeScript 搭建，项目名称叫 "SWU Date"。
这是一个面向西南大学学生的校园匹配交友网站。

要求：
1. 使用 Vite 最新版 + React 18 + TypeScript。
2. 安装以下依赖：react-router-dom@6、zustand、@supabase/supabase-js、lucide-react。
3. 搭建最小可运行骨架，包含以下目录结构：
   - src/components/   (通用组件)
   - src/pages/        (页面组件)
   - src/store/        (Zustand 状态管理)
   - src/services/     (Supabase 服务封装)
   - src/utils/        (工具函数)
   - src/types/        (TypeScript 类型定义)
   - src/hooks/        (自定义 Hooks)
   - src/data/         (静态数据：问卷题目、学院列表等)
   - src/assets/       (静态资源)
4. 在 src/services/supabase.ts 中初始化当前默认后端 Supabase 客户端（用环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY），并保证 src/services 下的接口封装不要直接耦合页面层，方便后续切换到 Cloudflare Workers/D1 等低成本方案。
5. 创建 .env.example 文件，列出所需环境变量。
6. 在 src/App.tsx 中配置 React Router，先放 placeholder 路由。
7. 输出时请说明你创建了哪些文件，以及下一步最适合做什么。

请直接给出代码，不要只给解释。
```

### Prompt 02：建立全局设计系统

```text
请为 SWU Date 项目建立一套全局设计变量和基础样式。

风格要求：
1. 调性：温暖、干净、低压力，像和朋友日常聊天一样轻松。
2. 不要做成 Tinder 那种荷尔蒙风格，也不要太严肃。
3. 配色方案：
   - 主色渐变: 珊瑚粉 (#FF6B6B) → 柔橙 (#FFA07A)
   - 背景: 暖白 #FAFAF8 / 卡片白 #FFFFFF
   - 文字: 深灰 #2D2D2D / 次要灰 #8E8E93
   - 成功绿: #34C759 / 警告红: #FF3B30
   - 标签/徽章背景: #FFF0ED
4. 大圆角 (16px)，营造友好感。
5. 字体:
   - 中文: 'Noto Sans SC', sans-serif (引入 Google Fonts)
   - 英文: 'Inter', sans-serif
6. 阴影: 柔和投影，不要硬边。
7. 用 CSS Variables 定义所有 token。
8. 手机端优先 (max-width: 430px 为主要视口)。
9. 给出以下基础组件样式:
   - 按钮 (主要/次要/幽灵/危险)
   - 输入框
   - 卡片容器
   - 底部导航栏
   - 页面容器布局
   - 标签/徽章

请直接修改 index.css 和必要的样式文件。
```

---

## Phase 1: 认证系统

### Prompt 03：实现注册页面 (学号登录，后续可加验证问题)

```text
请实现 SWU Date 的注册页面 (路由: /register)。

页面内容：
1. 顶部 Logo 和产品名 "SWU Date"
2. 标语: "在西大，遇见对的人"
3. 表单字段:
   - 学号 (必填，格式校验: 纯数字，8~12位)
   - 密码 (≥8位，含字母和数字)
   - 确认密码
   - 昵称 (2~12字)
   - 性别 (单选: 男 / 女 / 其他 / 不愿透露)
4. 隐私政策和免责声明勾选框 (必须勾选才能注册)
5. 注册按钮
6. "已有账号？去登录" 链接

技术要求：
1. 当前默认使用 Supabase Auth 注册。登录邮箱用学号拼接虚拟域名: `{student_id}@swudate.local`，实际认证靠学号。
2. 注册成功后将 student_id、nickname、gender、is_verified(默认 false) 存入 Supabase users 表；首版先完成学号 + 密码流程，后续再补 2~3 个简单验证问题。
3. 表单做前端校验 (学号格式、密码强度、昵称长度、确认密码一致)。
4. 有 loading 状态和错误提示 (学号已注册等)。
5. 注册成功后跳转 /onboarding。
6. 手机端优先。

请给出页面组件代码和必要的 service 函数。
```

### Prompt 04：实现登录页面

```text
请实现 SWU Date 的登录页面 (路由: /login)。

页面内容：
1. 顶部 Logo 和产品名
2. 学号输入框
3. 密码输入框
4. 登录按钮
5. "忘记密码" 链接 (先做 UI，弹 toast 提示"请联系管理员重置密码")
6. "还没有账号？去注册" 链接

技术要求：
1. 当前默认使用 Supabase Auth 登录，邮箱用 `{student_id}@swudate.local`。
2. 登录成功后检查:
   - 用户是否被封禁 (is_banned) → 弹窗提示 "账号已被封禁"
   - 是否完成问卷 → 未完成跳 /onboarding，已完成跳 /home
3. 有 loading 状态和错误提示。
4. 支持回车提交。

请给出页面组件代码。
```

### Prompt 05：实现 Auth 状态管理与路由守卫

```text
请实现认证状态管理和路由保护。

要求：
1. 用 Zustand 创建 authStore (src/store/authStore.ts)，管理:
   - user: 当前用户对象 | null (含 student_id, nickname, role, is_verified 等)
   - session: Supabase Session | null
   - isLoading: boolean
   - isOnboarded: boolean (是否完成问卷)
2. 初始化时监听 Supabase auth 状态变化 (onAuthStateChange)。
3. 登录成功时从 users 表获取完整用户信息。
4. 实现 ProtectedRoute 组件:
   - 未登录 → 重定向 /login
   - 已登录未完成问卷 → 重定向 /onboarding
   - 已登录已问卷 → 放行
5. 实现 AdminRoute 组件:
   - 非 admin 角色 → 重定向 /home
6. 实现 PublicRoute 组件:
   - 已登录 → 重定向 /home
7. 更新 App.tsx 完整路由配置。

请给出完整代码。
```

---

## Phase 2: 画像与问卷

### Prompt 06：定义问卷数据模型与类型

```text
请为 SWU Date 的问卷系统设计完整的数据模型。

要求：
1. 在 src/types/question.ts 定义:
   - QuestionType = 'single' | 'multi' | 'text' | 'dropdown'
   - Question: { id, module, title, type, options?, maxSelect?, maxLength?, required }
   - Answer: { questionId, value: string | string[] }
   - UserProfile: 整合 users 表和 profile_answers

2. 在 src/data/questions.ts 定义 15~20 题，当前默认 18 题，分 4 个模块:
   模块一 基本信息 (3题): 年级、学院、MBTI
   模块二 性格与生活方式 (6题): 周末偏好、作息、内外向、运动、放松方式、宠物态度
   模块三 价值观与恋爱观 (5题): 恋爱看重、节奏、异地、规划、互补相似
   模块四 偏好与表达 (4题): 约会方式、饮食、emoji、一句话

3. 在 src/data/colleges.ts 定义西南大学所有学院列表 (请尽可能完整)。

4. 在 src/services/profile.ts 封装:
   - saveAnswers(userId, answers[]) → 批量写入 Supabase
   - getProfile(userId) → 读取完整画像
   - updateProfile(userId, partial) → 更新画像
   - hasCompletedOnboarding(userId) → boolean

请给出完整的类型定义、数据文件和 service 函数。
```

### Prompt 07：实现问卷页面

```text
请实现 SWU Date 的画像问卷页面 (路由: /onboarding)。
用户注册后首次使用的引导页，问题总数控制在 15~20 题，当前默认 18 题，分 4 个模块。

页面交互：
1. 每个模块一个"步骤"，显示模块名称 (如 "🌟 了解你的性格")。
2. 模块内一题一屏，有上一题/下一题按钮。
3. 顶部显示整体进度条 (1/18, 2/18...)。
4. 每题有轻微淡入动画。
5. 单选题: 点选后自动跳下一题 (0.3s 延迟)。
6. 多选题: 选满上限后提示，点"下一题"继续。
7. 文本题: 实时字数统计。
8. 必填题未答不能下一步，有轻抖提示。
9. 最后一题提交后:
   - 存入 Supabase
   - 同时更新 users 表的 grade 和 college
   - 跳转 /home 并显示欢迎 toast

组件拆分:
- OnboardingPage (主容器)
- QuestionCard (单题卡片)
- OptionButton (单选/多选按钮)
- ProgressBar (进度条)
- ModuleHeader (模块标题)

问卷数据从 src/data/questions.ts 读取。

请给出页面实现代码和所有子组件。
```

---

## Phase 3: 匹配引擎

### Prompt 08：实现匹配算法核心

```text
请在 src/utils/matching.ts 中实现 SWU Date 的匹配算法核心逻辑。

算法要求：
1. 输入: 当前用户画像 + 候选用户画像列表
2. 输出: 按匹配分降序排列的候选人列表 (含分数)

评分规则 (总分 100):
- 同学院: +5
- 同年级: +5
- MBTI 兼容: +8 (基于 MBTI 兼容矩阵，如 INFP-ENFJ 高分)
- 生活方式单选题 (5题: Q4~Q7,Q9): 选项相同各 +5 = 满分 25
- 放松方式多选 (Q8): Jaccard 系数 × 10
- 恋爱看重多选 (Q10): Jaccard 系数 × 15
- 恋爱节奏 (Q11): 相同 +5
- 异地态度 (Q12): 相同 +4 / "看缘分" 兼容 +2
- 约会方式多选 (Q15): Jaccard 系数 × 8
- 饮食兼容 (Q16): 相同 +5 / 相近 +3
- 互补偏好 (Q14): 对照匹配 +5
- 随机扰动: ±5

过滤规则:
- 排除自己
- 排除已互动 (已 ❤️ 或 ✕)
- 排除黑名单用户
- 排除被封禁用户

MBTI 兼容矩阵: 请基于 MBTI 理论给出一个简化的兼容评分表 (不需要精确到16×16，用认知功能分组即可)。

要求：
1. 算法是纯函数，不依赖任何外部服务。
2. TypeScript 强类型。
3. 补充 Vitest 单元测试 (至少 8 个用例，覆盖各评分维度和过滤规则)。
4. 代码注释解释每个评分维度的设计意图。

请给出算法实现、类型定义和测试代码。
```

### Prompt 09：实现匹配服务层

```text
请实现 SWU Date 匹配系统的服务层 (src/services/matching.ts)，当前默认后端为 Supabase。

接口需求：
1. getDailyRecommendations(userId, limit=5)
   - 从 Supabase 获取候选用户 + 画像数据
   - 调用匹配算法计算分数
   - 返回 Top N
   - 缓存: 同一天多次调用返回相同结果 (用 localStorage 存日期 key)
2. recordInteraction(userId, targetId, action: 'like' | 'skip')
   - 记录互动到 interactions 表
   - 检查对方是否也 like 了自己
   - 如果双向 like → 创建 match 记录，返回 { matched: true, matchId }
3. getMatches(userId)
   - 查询 status='matched' 的匹配，关联对方用户信息
4. unmatch(matchId, userId)
   - 取消匹配 (status='unmatched')

Supabase 查询要过滤:
- blocklist 中的用户
- is_banned=true 的用户
- 已有 interaction 记录的用户

请给出 service 代码和 Supabase SQL (建表 + 索引 + RLS)。
```

### Prompt 10：实现匹配状态管理

```text
请用 Zustand 实现匹配状态管理 (src/store/matchStore.ts)。

状态:
- recommendations: UserProfile[] (今日推荐)
- currentIndex: number
- matches: MatchWithProfile[] (已匹配列表，含对方信息)
- isLoading: boolean
- hasNewMatch: boolean (新匹配红点)
- todayExhausted: boolean (今日推荐已看完)

Actions:
- fetchRecommendations()
- likeUser(targetId) → 处理匹配成功 (设 hasNewMatch)
- skipUser(targetId) → 下一个
- fetchMatches()
- clearNewMatchFlag()

请给出完整 store 实现。
```

---

## Phase 4: 推荐首页

### Prompt 11：实现首页推荐卡片

```text
请实现 SWU Date 首页 (路由: /home)，核心推荐页面。

页面结构：
1. 顶部: "SWU Date" logo 文字 + 右侧通知小铃铛
2. 主体: 推荐用户卡片 (一次一张，居中展示)
3. 底部: 固定底部导航栏 (首页/消息/我的)

推荐卡片内容：
- 用户头像 (大圆角图片，有默认头像 placeholder)
- 昵称 + 性别图标
- 年级 + 学院
- 一句话简介
- "想对 ta 说的话" (问卷 Q18)
- 匹配度显示: "87% 契合" (渐变色数字)
- 3~5 个画像标签 (从问卷提取，如 "E人"、"宅家派"、"猫猫控")
- 底部两个大按钮: ✕ 跳过 (灰色圆形) / ❤️ 喜欢 (粉色渐变圆形)

交互:
1. 点 ❤️ → 卡片右飞出 → 如果匹配成功弹庆祝弹窗 → 否则加载下一个
2. 点 ✕ → 卡片左淡出 → 加载下一个
3. 今日推荐看完 → 友好空状态: "今天的缘分发完啦，明天再来看看吧 ☺️" + 插画
4. 加载中显示骨架屏

组件拆分:
- HomePage → RecommendationCard + BottomNav + SkeletonCard + EmptyState
- BottomNav 带消息红点 (来自 chatStore)

请给出全部代码。
```

### Prompt 12：实现匹配成功弹窗

```text
请实现匹配成功弹窗组件 (MatchSuccessModal)。

触发条件: 双方互相 ❤️ 后弹出。

弹窗内容:
1. 毛玻璃遮罩背景 (backdrop-filter: blur)
2. 居中卡片，弹入动画 (scale 0.8→1 + opacity)
3. 庆祝标题: "你们匹配啦! 🎉"
4. 两人头像并排 + 中间爱心连线
5. 匹配度: "92% 契合"
6. 撒花/星星粒子动画 (纯 CSS @keyframes，15~20 个粒子)
7. "去打个招呼 💬" 主按钮 → 跳转 /chat/:matchId
8. "继续逛逛" 次要按钮 → 关闭弹窗

视觉:
- 色调温暖喜庆但不俗气
- 粒子用主色系 (粉、橙、金)
- 纯 CSS，不引入库

请给出组件代码和完整动效 CSS。
```

### Prompt 13：实现用户资料卡详情页

```text
请实现用户资料卡详情页 (路由: /profile/:id)。

进入方式: 从推荐卡点击头像、从消息列表点击头像。

页面内容:
1. 顶部大图区: 头像 + 渐变遮罩 + 返回按钮
2. 基本信息: 昵称、性别、年级、学院
3. 一句话简介
4. 画像标签网格 (从问卷生成，带小图标)
5. "想对 ta 说的话" 引用框
6. 问卷亮点 (选取 3~4 个有趣答案展示，如 "约会方式: 密室剧本杀"、"MBTI: INFP")
7. 操作区:
   - 未互动: ❤️ 喜欢 + ✕ 跳过
   - 已匹配: "💬 发消息" 按钮
   - 举报按钮 (右上角 ... 菜单里)

隐私:
- 不展示学号
- 已匹配的显示 "已匹配 💌" 标识

请给出页面代码和必要的 service 调用。
```

---

## Phase 5: 聊天系统

### Prompt 14：实现消息列表页

```text
请实现消息列表页 (路由: /messages)。

页面内容:
1. 顶部标题 "消息"
2. 匹配用户列表，每项:
   - 对方头像 (圆形)
   - 对方昵称
   - 最后一条消息预览 (单行截断，≤20字)
   - 最后消息时间 (今天显示 "HH:mm"，昨天显示 "昨天"，更早显示 "MM/DD")
   - 未读消息数红色圆点 (数字 ≤99+)
3. 空状态: "还没有匹配，去首页看看吧 💫" + 跳转按钮
4. 底部导航栏

技术:
1. matchStore.matches 获取匹配列表
2. 每个 match 查最新一条 message
3. 按最后消息时间降序
4. 新匹配但无消息的显示 "还没有消息，快去打个招呼吧"
5. 点击跳转 /chat/:matchId

请给出页面代码。
```

### Prompt 15：实现聊天状态管理

```text
请用 Zustand 实现聊天状态管理 (src/store/chatStore.ts)。

状态:
- currentMatchId: string | null
- currentPartner: UserProfile | null
- messages: Message[]
- isLoading: boolean
- isSending: boolean
- unreadCounts: Record<string, number>
- totalUnread: number (底部导航红点用)

Actions:
- openChat(matchId) → 加载历史消息 + 订阅 Supabase Realtime + 标记已读
- sendMessage(content) → 发送 (先过敏感词检查) → 乐观更新
- closeChat() → 取消 Realtime 订阅
- fetchUnreadCounts() → 批量查所有 match 的未读数

Service 函数 (src/services/chat.ts):
- getMessages(matchId, limit=50) → 分页加载
- sendMessage(matchId, senderId, content)
- markAsRead(matchId, userId)
- subscribeToMessages(matchId, callback) → Supabase Realtime 订阅，返回 unsubscribe 函数

请给出 store 和 service 完整代码。
```

### Prompt 16：实现聊天详情页

```text
请实现聊天详情页 (路由: /chat/:matchId)。

页面结构:
1. 顶部栏: 返回按钮 + 对方头像(可点进资料卡) + 昵称 + 右侧 ... 菜单
2. 消息区域:
   - 自己的消息: 右侧，珊瑚粉渐变背景，白字
   - 对方消息: 左侧，浅灰背景，深色字
   - 时间分割线: 每隔 5 分钟以上的消息间显示时间
   - 首条引导: 无消息时显示 "就从一句 hi 开始吧 👋"
3. 底部输入区: 输入框 + 发送按钮 (有内容时变为主色)
4. ... 菜单选项: 举报 / 取消匹配 (二次确认)

交互:
1. 进入页面自动滚到底部
2. 新消息到来自动滚到底部 (如果用户在底部)
3. 回车发送，Shift+回车换行
4. 发送前过敏感词:
   - 命中硬拦截 → 提示 "消息包含不当内容，无法发送"
   - 检测到手机号格式 → 温馨弹窗 "为了保护隐私，建议不要分享个人联系方式哦" + 仍可选择发送
5. 消息 ≤500 字，超出提示
6. 加载中: 骨架屏
7. 乐观发送: 消息先显示，发送失败标红

请给出页面代码、消息气泡组件和 Realtime 集成逻辑。
```

---

## Phase 6: 安全与风控

### Prompt 17：实现敏感词过滤模块

```text
请实现敏感词过滤模块 (src/utils/contentFilter.ts)。

过滤范围:
1. 脏话和侮辱性语言
2. 色情/低俗词汇
3. 广告推销 (加微信、加QQ、转账、优惠、代购等)
4. 诈骗关键词 (刷单、兼职日结、贷款、裸贷等)
5. 个人信息检测 (手机号格式: 1[3-9]\\d{9})

输出:
```typescript
interface FilterResult {
  isBlocked: boolean;       // 是否硬拦截
  isWarning: boolean;       // 是否软提醒 (如手机号)
  reason: string;           // 原因描述
  matchedKeywords: string[]; // 命中的词
}
```

要求:
1. 词库放在 src/data/sensitiveWords.ts，按类别分组。
2. 支持变体绕过检测 (如 "微*信"、"wei xin"、中间加空格)。
3. 手机号检测不拦截，返回 isWarning + 提醒文案。
4. 纯函数，不依赖 UI。
5. Vitest 测试 ≥12 个用例:
   - 正常消息通过
   - 各类别拦截
   - 变体绕过检测
   - 手机号软提醒
   - 边界情况 (空字符串、超长字符串)

请给出实现代码、词库和测试。
```

### Prompt 18：实现举报系统

```text
请实现举报功能。

触发场景:
1. 聊天页 ... 菜单 → "举报"
2. 资料卡页 ... 菜单 → "举报"

举报弹窗 (ReportModal):
1. 标题: "举报用户"
2. 举报原因 (单选):
   - 骚扰 / 不当言论
   - 虚假信息 / 冒充他人
   - 广告 / 诈骗
   - 色情 / 低俗内容
   - 其他
3. 补充说明 (选填, ≤200字)
4. 提交按钮

技术:
1. 写入 Supabase reports 表 (status='pending')。
2. 提交后自动拉黑对方 (调用 blocklist service)。
3. 同一举报人对同一人不能重复举报 (前端 + DB 约束)。
4. 成功提示: "感谢反馈，我们会尽快处理 🙏"

请给出弹窗组件和 service 函数。
```

### Prompt 19：实现黑名单系统

```text
请实现黑名单/屏蔽功能。

功能:
1. 屏蔽后: 双方推荐/消息/搜索中互不可见
2. 如果已匹配 → 自动取消匹配
3. 设置页可查看和管理黑名单列表
4. 支持解除屏蔽

Service (src/services/blocklist.ts):
- blockUser(userId, targetId) → 写入 blocklist + 取消匹配
- unblockUser(userId, targetId)
- getBlocklist(userId) → 返回被屏蔽用户列表 (含昵称、头像)
- isBlocked(userId, targetId) → boolean

黑名单管理页 (/me/blocklist):
- 列表: 头像 + 昵称 + 屏蔽时间
- 操作: 解除屏蔽 (二次确认)
- 空状态: "没有屏蔽的用户"

请给出 service 代码和页面组件。
```

### Prompt 20：实现免责声明与隐私政策

```text
请实现免责声明和隐私政策页面。

页面:
1. 免责声明 (/legal/disclaimer)
2. 隐私政策 (/legal/privacy)

免责声明要点:
- SWU Date 仅提供匹配和交流平台
- 用户对自身线上和线下行为负全责
- 平台不保证匹配效果
- 遇到不当行为请立即举报
- 建议线下见面选择公共场所并告知朋友

隐私政策要点:
- 收集: 学号(认证用)、昵称、问卷答案、聊天消息
- 用途: 仅用于匹配推荐和聊天功能
- 存储: 当前默认使用 Supabase 云端加密存储；如果后续切换后端，文案需同步更新
- 不会: 向第三方出售数据、展示学号给其他用户
- 用户权利: 随时查看/修改/删除个人数据，一键注销

风格:
- 清晰易读，不做成密密麻麻的法律文书
- 分段标题 + 简洁段落
- 顶部有返回按钮
- 可从注册页和设置页进入

请给出两个页面代码和完整文案。
```

---

## Phase 7: 个人中心

### Prompt 21：实现"我的"页面

```text
请实现"我的"页面 (路由: /me)。

页面内容:
1. 头部区域 (有主色渐变背景):
   - 大头像 (圆形)
   - 昵称
   - 学院 + 年级
   - emoji 标签 (问卷 Q17)
2. 统计条: "已匹配 X 人"
3. 功能列表 (图标 + 文字 + 右箭头):
   - ✏️ 编辑资料
   - 📝 修改问卷
   - ⚙️ 设置
   - 📄 关于 SWU Date
4. 底部导航栏

请给出页面代码。
```

### Prompt 22：实现编辑资料页

```text
请实现编辑资料页 (路由: /me/edit)。

可编辑项:
1. 头像 (点击弹出选择，上传到 Supabase Storage)
2. 昵称 (2~12字)
3. 一句话简介 (bio, ≤100字, 实时字数统计)

头像上传技术:
1. 前端用 canvas 压缩到 ≤200KB、最大 400×400px
2. 上传到 Supabase Storage 的 avatars/{userId}.webp
3. 更新 users.avatar_url
4. 有上传进度和错误处理

"修改问卷" 入口:
- 跳转到问卷页 /onboarding?mode=edit
- 预填当前答案
- 提交后返回"我的"页面

保存后 toast 成功提示。

请给出页面代码和文件上传 service。
```

### Prompt 23：实现设置页

```text
请实现设置页 (路由: /me/settings)。

设置项:
1. 账号安全:
   - 修改密码 (弹窗: 旧密码 + 新密码 + 确认)
   - 学号 (只读显示，已脱敏: 前3后2，中间*号)
2. 隐私安全:
   - 黑名单管理 → /me/blocklist
3. 关于:
   - 隐私政策 → /legal/privacy
   - 免责声明 → /legal/disclaimer
   - 版本: v1.0.0
4. 危险操作 (红色区域):
   - 退出登录 (二次确认弹窗)
   - 注销账号 (二次确认 + 输入 "确认注销" 文字验证)

注销逻辑:
1. 删除 users + profile_answers + interactions + matches(相关) + messages(相关) + reports(相关) + blocklist(相关)
2. 删除 Storage 头像
3. 调用 Supabase Auth 删除账号
4. 清除本地状态
5. 跳转欢迎页

请给出设置页代码、密码修改弹窗和注销 service。
```

---

## Phase 8: 管理后台

### Prompt 24：实现管理后台框架

```text
请实现 SWU Date 管理后台的框架页面。

路由: /admin (仅 role='admin' 的用户可访问)

页面结构:
1. 顶部栏: "SWU Date 管理后台" + 当前管理员昵称 + 退出
2. 侧边导航 (桌面端) / 底部导航 (移动端):
   - 📊 仪表盘
   - 🚨 举报审核
   - 👥 用户管理
3. 仪表盘内容:
   - 总用户数
   - 今日新增用户
   - 总匹配数
   - 待处理举报数 (红色高亮)
   - 最近 7 天注册趋势 (简单柱状图，纯 CSS/canvas)

风格:
- 管理后台不追求花哨，清晰高效
- 使用表格和列表为主
- 响应式: 桌面端侧边栏，移动端底部栏

请给出框架布局、仪表盘页面和必要的 service。
```

### Prompt 25：实现举报审核页

```text
请实现管理后台的举报审核页 (路由: /admin/reports)。

页面内容:
1. 筛选栏: 全部 / 待处理 / 已处理 / 已驳回
2. 举报列表 (表格/卡片):
   - 举报人 (昵称)
   - 被举报人 (昵称)
   - 举报原因
   - 补充说明
   - 举报时间
   - 状态标签 (待处理/已处理/已驳回)
   - 操作按钮
3. 操作:
   - "查看对话" → 弹窗展示该 match 最近 50 条消息
   - "查看资料" → 跳转被举报者资料
   - "封禁用户" → 二次确认 → is_banned=true + 强制登出
   - "警告" → 标记已处理 + 管理员备注
   - "驳回" → 标记已驳回 + 管理员备注
4. 分页: 每页 20 条

Service (src/services/admin.ts):
- getReports(filter, page) → 分页获取举报列表
- resolveReport(reportId, action, adminNote)
- banUser(userId)
- getChatHistory(matchId, limit)

请给出页面代码和 service。
```

### Prompt 26：实现用户管理页

```text
请实现管理后台的用户管理页 (路由: /admin/users)。

页面内容:
1. 搜索栏: 按学号或昵称搜索
2. 筛选: 全部 / 正常 / 已封禁
3. 用户列表 (表格):
   - 头像
   - 昵称
   - 学号 (完整显示，仅管理员可见)
   - 学院
   - 注册时间
   - 匹配数
   - 被举报数
   - 状态 (正常/封禁)
   - 操作
4. 操作:
   - "查看详情" → 侧边抽屉: 完整资料 + 问卷画像 + 举报记录
   - "封禁" (正常用户) → 二次确认
   - "解封" (封禁用户) → 二次确认
5. 分页: 每页 20 条

Service:
- getUsers(search, filter, page)
- getUserDetail(userId) → 含画像 + 举报记录
- toggleBan(userId, banned: boolean)

请给出页面和 service 代码。
```

---

## Phase 9: 打磨与部署

### Prompt 27：实现欢迎页/Landing Page

```text
请实现 SWU Date 的欢迎页 (路由: /)。
未登录用户看到的第一个页面，要有吸引力。

页面内容:
1. 全屏渐变背景 (珊瑚粉 → 柔橙，带微妙的浮动圆形光斑动画)
2. Logo + "SWU Date" 大标题 (渐入)
3. 标语: "在西大，遇见对的人" (延迟渐入)
4. 三个特点卡片 (交错滑入):
   - 🔒 隐私至上: "双向同意才能聊天，你的信息只有 ta 能看到"
   - 🎯 智能匹配: "15~20 道问卷画像，找到最契合的人"
   - 💬 轻松交流: "没有压力，按你的节奏来"
5. "立即加入" 大按钮 (微呼吸动画) → /register
6. "已有账号？登录" 链接 → /login
7. 底部: "仅面向西南大学在校生" 小字

视觉:
- WOW 感，不能平淡
- 纯 CSS animation，不引入库
- 手机端全屏铺满
- 所有动画 prefers-reduced-motion 友好

请给出页面代码和完整动效 CSS。
```

### Prompt 28：优化移动端体验

```text
请检查并优化 SWU Date 全站的移动端体验。

检查清单:
1. 推荐卡片: 触摸操作是否流畅
2. 聊天页: 键盘弹起时输入框不被遮挡 (iOS + Android)
3. 底部导航: 所有主页面一致，安全区域适配 (env(safe-area-inset-bottom))
4. 表单: 输入框聚焦时自动滚动到可视区
5. 问卷: 一题一屏的滑动体验
6. 消息列表: 长列表滚动流畅
7. 所有可点击区域 ≥ 44px
8. 字体层级清晰 (标题/正文/辅助文字)
9. 留白合理，不拥挤

修复后输出你发现的问题和对应修改。
```

### Prompt 29：补充微交互动效

```text
请为 SWU Date 补充微交互，提升产品质感。

增强:
1. 页面切换: 淡入淡出过渡 (不用左右滑，太重)
2. 推荐卡片: ❤️ 时飞出右侧带旋转 / ✕ 时淡出缩小
3. 匹配成功: 撒花粒子 20 个，散落消失
4. 消息气泡: 新消息从下方弹入 (translateY + opacity)
5. 按钮: active 缩放 0.95 + 300ms 回弹
6. 标签: hover 轻微上浮
7. Toast: 从顶部滑入，3s 后滑出
8. 骨架屏: 灰色块 shimmer 动画
9. 加载按钮: 文字替换为三点跳动 (...) 动画
10. 顶部进度条 (问卷): 丝滑过渡 width transition

要求:
1. 全部用 CSS animation + transition
2. 尊重 prefers-reduced-motion
3. 性能不受影响 (避免触发 layout thrashing)

请给出代码。
```

### Prompt 30：当前默认 Supabase 数据库 Migration

```text
请整理 SWU Date 完整的 Supabase 数据库 schema，输出为可直接执行的 SQL。

表:
1. users (扩展 auth.users)
2. profile_answers
3. interactions
4. matches
5. messages
6. reports
7. blocklist

要求:
1. 完整列定义 + 类型 + 约束 + 默认值
2. 索引: 查询性能相关 (如 messages 按 match_id + created_at)
3. RLS 策略:
   - users: 自己可读写全部字段，他人只能读 (id, nickname, avatar_url, gender, grade, college, bio)
   - profile_answers: 自己可读写，匹配算法查询需 service_role
   - messages: 只有匹配双方可读写
   - matches: 只有参与者可见
   - interactions: 自己可创建和读取
   - reports: 自己可创建，admin 可读写
   - blocklist: 自己可管理
4. 触发器:
   - 新用户注册时自动创建 users 行
   - 举报创建时自动插入 blocklist
5. 函数:
   - get_daily_recommendations(user_uuid, N) → 返回候选用户 (可选，也可前端算)

请给出完整 SQL，按执行顺序排列。
```

### Prompt 31：部署到 Cloudflare Pages

```text
请帮我准备 SWU Date 部署到 Cloudflare Pages 的完整流程。

要求:
1. 确认 package.json 的 build 脚本正确。
2. 创建 _redirects 或 _headers 文件 (SPA 路由支持)。
3. 确认环境变量:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. 如果本地还没建仓，则初始化 Git 仓库并配置 .gitignore (排除 node_modules, .env, dist)；电脑已安装 Git，可直接走 Git push 流程。
5. 输出 Cloudflare Pages 配置:
   - 构建命令
   - 输出目录
   - Node.js 版本
6. SPA 路由兜底 (所有路径 → index.html)。
7. 安全 headers: X-Frame-Options, Content-Security-Policy 等。

请给出所有配置文件和部署步骤说明。
```

### Prompt 32：上线前全面检查

```text
请从上线前检查的角度审视 SWU Date，按以下维度逐项检查:

1. 安全:
   - Supabase RLS 是否全覆盖
   - 敏感词过滤覆盖度
   - 用户信息泄露风险
   - 举报→封禁→登出链路
   - 注销是否彻底清除数据
2. 隐私:
   - 资料卡是否暴露学号
   - 聊天记录是否只有双方可见
   - 管理后台权限是否严格
3. 体验:
   - 异常状态 (网络错误/空数据/超时) 友好提示
   - 加载状态完善
   - 表单校验完整
   - 手机端主流机型 (iPhone SE/14/15, 小米/华为) 适配
4. 性能:
   - 图片懒加载
   - 头像压缩
   - Supabase 查询效率
5. 合规:
   - 免责声明充分性
   - 未成年人保护提示
   - 注销流程合规

输出格式: "发现的问题 → 风险等级(高/中/低) → 修复代码"
```

---

## 通用约束附加段

每次提示词结尾可附:

```text
补充约束：
1. 只修改完成这个任务所必需的文件。
2. 如果需要新增文件，请说明原因。
3. 技术栈: Vite + React 18 + TypeScript + Zustand。后端优先便宜或免费，当前默认 Supabase 免费层；不引入其他重型依赖。
4. 当前如果使用 Supabase，查询必须有 RLS 保护；如果切换其他后端，也要提供等价的权限控制。
5. 双向同意后才能聊天。
6. 资料卡不暴露学号和手机号。
7. 完成后请列出你修改的文件，并说明如何手动验证。
```

---

## 推荐执行顺序

```
Phase 0: 基础设施
  1.  Prompt 01 → 项目骨架
  2.  Prompt 02 → 设计系统
  3.  Prompt 30 → 数据库 Schema

Phase 1: 认证
  4.  Prompt 03 → 注册页 (学号)
  5.  Prompt 04 → 登录页
  6.  Prompt 05 → Auth 状态管理

Phase 2: 画像
  7.  Prompt 06 → 数据模型
  8.  Prompt 07 → 问卷页面

Phase 3: 匹配
  9.  Prompt 08 → 匹配算法
  10. Prompt 09 → 匹配服务
  11. Prompt 10 → 匹配状态

Phase 4: 首页
  12. Prompt 11 → 推荐卡片
  13. Prompt 12 → 匹配弹窗
  14. Prompt 13 → 资料详情

Phase 5: 聊天
  15. Prompt 15 → 聊天状态
  16. Prompt 14 → 消息列表
  17. Prompt 16 → 聊天详情

Phase 6: 安全
  18. Prompt 17 → 敏感词
  19. Prompt 18 → 举报
  20. Prompt 19 → 黑名单
  21. Prompt 20 → 免责声明

Phase 7: 个人中心
  22. Prompt 21 → 我的页面
  23. Prompt 22 → 编辑资料
  24. Prompt 23 → 设置页

Phase 8: 管理后台
  25. Prompt 24 → 后台框架
  26. Prompt 25 → 举报审核
  27. Prompt 26 → 用户管理

Phase 9: 打磨
  28. Prompt 27 → 欢迎页
  29. Prompt 28 → 移动端优化
  30. Prompt 29 → 微交互
  31. Prompt 31 → 部署配置
  32. Prompt 32 → 上线检查
```

## 工时估算

| Phase | 内容 | Vibecoding 预估 |
|-------|------|-----------------|
| 0 | 初始化 + 设计 + DB | 1~2h |
| 1 | 认证系统 | 2~3h |
| 2 | 问卷系统 | 2~3h |
| 3 | 匹配引擎 | 2~3h |
| 4 | 推荐首页 | 2~3h |
| 5 | 聊天系统 | 3~4h |
| 6 | 安全风控 | 2~3h |
| 7 | 个人中心 | 1~2h |
| 8 | 管理后台 | 2~3h |
| 9 | 打磨部署 | 2~3h |
| **合计** | | **~19~29h** |

