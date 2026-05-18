---
url: 'https://mp.weixin.qq.com/s/_Auqq-vqwNQfKMYJMu8TTA'
title: 开源GPT-Image-2 Skill + Hermes多Agent，才是画图的神～
description: 我发现GPT-image-2+Codex现在是前端的神，一个出UI设计，一个代码实现，绝了。
author: 袋鼠帝
coverImage: imgs/img-001-0.jpg
captured_at: '2026-05-18T01:53:52.104Z'
processed_at: '2026-05-18T02:08:57.349Z'
---

# 开源GPT-Image-2 Skill + Hermes多Agent，才是画图的神～

原创 袋鼠帝 *2026年4月24日 23:52*

大家好，我是袋鼠帝。

最近AI圈最火的生图模型，就是 GPT-Image-2。

这个热度，真的有点像当年 Nano Banana pro 刚出来的时候。时间线还没捋明白，玩法已经先铺天盖地地飞出来了。

![图片](imgs/img-002-640.webp)

先来看我用 GPT-Image-2+codex开发的一款小游戏

<video src="https://mpvideo.qpic.cn/0bc3pubsuaadniaa25hipfuvg7odfj6qgkqa.f10002.mp4?dis_k=051a85ec6a6db708fe81460ec4f3fdec&amp;dis_t=1779069225&amp;play_scene=10120&amp;auth_info=LNzs7owGYyURwoSbmHEOQjwWMmY0TzA1QWMHXHdlClYKdDleIGsJTGUMKCNoURw=&amp;auth_key=fe54762a73055ddc16752862d89e0878&amp;vid=wxv_4486670084567465986&amp;format_id=10002&amp;support_redirect=0&amp;mmversion=false">您的浏览器不支持 video 标签</video>

现在很多人以为，模型越来越强，生图就会越来越简单。

我觉得对一半。

大部分人拿着顶尖生图模型生成的图依然和脑子里的差很多。最头疼的往往是这三点：

![图片](imgs/img-003-640.png)

![图片](imgs/img-004-640.png)

第一，提示词门槛高。别人写出来的提示词精细得堪比一篇论文，而我们普通人只能说出一句类似‘帮我画得好看点’的大白话。

第二，流程太断裂。写文案、想关键词、去网页端生成、保存下载、再拖进设计软件……全是重复劳动，也比较割裂。没法沉淀工作流，复用。

第三，批量出图困难。要是想做一套品牌宣传图或者一本绘本，角色一致性难搞。

![图片](imgs/img-005-640.png)

为了解决以上这些问题，我设计了一套组合：多Agent + GPT-Image-2 Skill。

这个Skill可开启多Agent分工协作来完成图片生成，地址：

https://github.com/kangarooking/kangarooking-skills/tree/main/multi-agent-image

*这篇文章从我为什么做这套工作流，这套工作流的 *设计思路，架构来，以及各种常用的* 应用案例展开。
*

我用这套组合干的第一件事--开发一款类似马里奥的闯关小游戏。

我就一句话：做一款类似马里奥的小游戏。

<video src="https://mpvideo.qpic.cn/0bc3gyezaaaj7yaloyhcevuvsnwdsa3ateaa.f10002.mp4?dis_k=4801b9eafe6e71b54e82a1c84ba85f81&amp;dis_t=1779069225&amp;play_scene=10120&amp;auth_info=KMOH14hTbncRwofOnyJTFWoROTU2EmIxTGJXBntlCAYOdDgLJjkEHmUMK3ZvAkE=&amp;auth_key=59582ad9ef1c3666e6b5f0ac9ec64505&amp;vid=wxv_4486673043834175495&amp;format_id=10002&amp;support_redirect=0&amp;mmversion=false">您的浏览器不支持 video 标签</video>

这套组合就会自动让 GPT-Image-2 画角色、场景和 UI 素材，再让 Codex 去把跳跃、碰撞、交互这些逻辑接起来。

最后居然真的从零拼出了一个能跑、能跳、能玩的酷似疯狂马里奥的小游戏 Demo（见文章开头的视频演示）。

![图片](imgs/img-006-640.png) ![图片](imgs/img-007-640.png) ![图片](imgs/img-008-640.png) ![图片](imgs/img-009-640.png)

整个过程，你不需要去学怎么写复杂的提示词，也不用在各个工具之间来回复制粘贴。

你只要把大概的想法丢给它，它就能：

自动理解你的真正意图，把你的话翻译成专业的设计要求。

自动规划任务步骤，决定先画什么后画什么。

自动把生成的单张图设计成一系列风格统一的可用素材。

而且整套流程里面先用gpt-image-2设计素材，然后根据设计去开发，开发出来的东西不仅功能稳定，在视觉上更是绝了。

**一、 这套多Agent+Skill组合，到底是怎么分工的**

接下来我想和大家聊一下这套工作流的核心节点。

下图是三层架构概览

![图片](imgs/img-010-640.png)

这三层用最简单的话说：

![图片](imgs/img-011-640.png)

![图片](imgs/img-012-640.png)

Agent 是大脑。

它负责理解你说的话到底在表达什么，然后拆任务、安排顺序，判断这次到底是做海报、角色、游戏素材，还是一整套品牌物料。

Skill 是双手。

负责沉淀那些已经跑通过的方法，比如 Prompt 编译、风格管理、尺寸规范、批量模板、审核逻辑。

GPT-Image2 是引擎。

负责把前面整理好的专业指令，生成高质量图片。

![图片](imgs/img-013-640.png)

有了以上三个重要节点，是不是就能把这条工作流跑通了？不是

![图片](imgs/img-014-640.jpg)

为了让各个Agent团队配合得更默契，底座我用了 Hermes 多 Agent 协同系统。

画图的、搞设计的、精修的、质量审查的、写代码的，各个 Agent 各司其职，做完了自动交接给下一个。

同时系统里还装了一个案例库，这就相当于一本菜谱。

只要是以前做成功过的项目会积累到案例库，下次遇到类似需求直接调出来复用，替换掉部分信息就能直接开工，不用再从零开始试错。

毕竟，如果我看得更远，那是我站在巨人的肩膀上。---牛顿

**二、解决问题的真实场景（不止这些场景）
**

除了可以直出高质量UI的应用，还能做各种场景的出图，文章篇幅原因，我把日常生活中，工作中最容易遇到的几种情况挑出来跑了一下。

### Case 1：电商产品图自动化生成

上传产品描述文字，Agent 自动提炼视觉关键词 → 调用 Skill → Image2 输出符合平台规范的商品主图

测试点：批量处理、风格统一、免修图

某宝找的原始图：

![图片](imgs/img-015-640.png)

自动生成的一系列商品图：

![图片](imgs/img-016-640.png) ![图片](imgs/img-017-640.png) ![图片](imgs/img-018-640.png) ![图片](imgs/img-019-640.png)

### Case 2：营销海报一键生成

输入活动主题和品牌色，Agent 规划构图策略 → Skill 注入品牌风格 prompt → Image2 生成高质感海报

非设计师出专业级物料

![图片](imgs/img-020-640.png) ![图片](imgs/img-021-640.png)

### Case 3：室内设计效果图快速出图

输入房间尺寸、偏好风格（如"北欧极简"、"新中式"）和预算关键词，Agent 拆解设计要素 → Skill 生成专业室内设计 prompt → Image2 输出多套风格效果图供选择

![图片](imgs/img-022-640.png) ![图片](imgs/img-023-640.png)

以后装修前可以自己设计大纲的风格，后期也能降低和设计师的沟通成本

### Case 4：产品原型 UI 界面草图转高保真视觉稿

上传手绘线框图或低保真原型截图，Agent 识别页面结构与交互逻辑 → Skill 注入品牌视觉规范（色值、字体风格、圆角等）→ Image2 生成接近真实产品的高保真 UI 视觉稿

apple风格的ui：

![图片](imgs/img-024-640.png) ![图片](imgs/img-025-640.png) ![图片](imgs/img-026-640.png) ![图片](imgs/img-027-640.png)

手绘风格的ui：

![图片](imgs/img-028-640.png) ![图片](imgs/img-029-640.png) ![图片](imgs/img-030-640.png) ![图片](imgs/img-031-640.png)

这再搭配上今天刚刚上的GPT-5.5把原型开发出来，岂不是无敌了！

这个skill的gpt-image-2的API，我用的是我一个朋友的API中转站：

![图片](imgs/img-032-640.png)

感兴趣的朋友，可以用我这个含邀请码的注册链接：

https://apimart.ai/register?aff=WVtR

他这个站点，一直都在持续更新、迭代，而且模型上新速度也特别快。价格实惠。一次只要0.006$，2k是0.012$，4k是0.018$

![图片](imgs/img-033-640.png)

还能直接在网页上使用gpt-image-2，特别方便

![图片](imgs/img-034-640.png)

我是袋鼠帝, 一个致力于帮你把 AI 变成生产力的博主. 我们下期见～

能看到这里的都是凤毛麟角的存在!

如果觉得不错, 随手点个赞、在看、转发三连吧~

如果想第一时间收到推送, 也可以给我个星标⭐

谢谢你耐心看完我的文章~

袋鼠帝AI客栈

邀请你前往腾讯公益一起捐

滇苗助学

103人捐赠

skills · 目录

作者提示: 个人观点，仅供参考

继续滑动看下一个

袋鼠帝AI客栈

向上滑动看下一个
