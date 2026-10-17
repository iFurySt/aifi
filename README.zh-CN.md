# AIFi

[![English](https://img.shields.io/badge/English-Click-yellow)](./README.md)
[![简体中文](https://img.shields.io/badge/简体中文-点击查看-orange)](./README.zh-CN.md)

AIFi 是一个 agent-first 的投资研究工作区。它用一组可复用的 AI skills
收集公告、财报、新闻、市场信号、竞品和风险证据，并把研究材料沉淀到
`research/`，方便后续持续复用。

它用于研究和决策辅助，不做自动交易，也不是财务建议。

## 本地应用预览

Web 和 Electron 复用同一套 React 界面。股票目录、行情和研究数据读取本地采集缓存；
桌面端 Chat 可连接 ChatGPT 订阅进行真实文本对话，券商接入和后台 Agent 留待后续实现。

默认打开 Stocks，内侧栏支持真实目录搜索和滚动加载，个股页包含六个研究标签。行情和财务示例
标注为样例；持仓、交易、评级和新闻暂时显示空状态。公司 Logo 按需加载并缓存到本机，缺失时显示字母。原有会话仍可在 Chat 中打开。

需要 Node.js 24+、Go 1.26.1+、pnpm 10.13.1。

```sh
pnpm install
pnpm dev             # Web：http://127.0.0.1:5173
pnpm dev:desktop     # Electron + 本地 Web 服务，与 pnpm dev 二选一
```

```sh
pnpm build
pnpm desktop         # 启动构建后的桌面应用
make ci
```

桌面 App 打开 **Settings → ChatGPT → Continue with ChatGPT**，在浏览器完成
登录和订阅使用授权，再回到 Chat 选择模型、发送消息。不需要 API Key、客户端密钥，
也无需预先在 OpenAI 控制台创建应用；账号须符合官方接入条件。纯 Web 端暂未接入。
当前对话尚未附加行情、财报等工具，回复标为草稿。详见
[连接方式和限制](docs/design-docs/chatgpt-desktop-connection.md)。

首次启动桌面端会下载 Electron 运行时。目录边界见
[架构文档](docs/ARCHITECTURE.md)，开发命令见
[前端指南](docs/FRONTEND.md)，界面规范见 [DESIGN.md](DESIGN.md)。

## 股票目录采集

首个真实采集器已接入 Nasdaq Trader 官方证券目录，写入本地 SQLite。
需要 Go 1.26.1+，无需 API Key。应用启动时会启动 Go 服务，设置中可管理数据源、同步周期和本机凭据。
行情和财务页面仍使用样例。

```sh
make check-go
./bin/aifi data directory sync
./bin/aifi data directory list --query AAPL
```

详见 [CLI 命令与存储](apps/cli/README.md)。

## 用法

```sh
codex "分析 Intel 最近为什么大涨，以及应该如何看待它在组合里的位置"
```

```sh
codex "更新我的 Intel 研究，补充最新财报、公告、新闻和市场信号"
```

```sh
codex "对比 Intel、AMD、Nvidia 和 TSMC，并总结 bull/base/bear case"
```

## 效果预览

![AIFi local app preview](./docs/assets/readme/aifi-app-preview.png)

### 研究产物示例

![AIFi 研究结果预览](./docs/assets/readme/aifi-preview-zh-CN.png)
