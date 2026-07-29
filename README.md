# bbwg 沙盘项目

这是一个基于 qiankun 的微前端项目，主入口用于展示沙盘地图、联盟成员、信息统计、实力对比和活动日历等模块。

## 项目结构

- `main-app`：qiankun 主应用
- `vue-app`：Vue 3 沙盘主功能应用
- `react-app`：React 17 微应用
- `hero-card-app`：英雄卡片微应用
- `info-statistics-api`：信息统计本地接口服务

## 本地运行

可以直接双击根目录脚本：

- `启动全部项目.bat`：启动主应用和所有微应用
- `重启全部项目.bat`：停止 8080/8081/8082/8084 端口后重新启动
- `停止全部项目.bat`：停止所有项目

启动后打开：

```text
http://localhost:8080
```

也可以手动启动：

```bash
cd main-app
npm install
npm run dev
```

```bash
cd vue-app
npm install
npm run dev
```

```bash
cd react-app
npm install
npm run dev
```

```bash
cd hero-card-app
npm install
npm run dev
```

常用端口：

- 主应用：http://localhost:8080
- Vue 沙盘应用：http://localhost:8081
- React 应用：http://localhost:8082
- 英雄卡片应用：http://localhost:8084
- 信息统计 API：http://localhost:8090

## 信息统计接口

`vue-app` 的信息统计模块会优先请求 `info-statistics-api`：

```text
GET/POST/PUT/DELETE http://localhost:8090/api/info-registrations
```

当前后端使用：

```text
info-statistics-api/data/info-registrations.json
```

作为本地持久化文件。以后如果更换 Supabase、LeanCloud、MySQL 等云端数据库，只需要保持接口路径不变，并替换 `info-statistics-api/src/repositories` 内的实现。

## 联盟排行榜接口

地图系列通过 `/benben-ranking-api` 读取当前数据源的区服和联盟排行榜。

同时支持管理员切换数据源：

- 当前数据：`https://t2s.awzh.cn`
- 旧版数据：`https://benbenkshen.cn`

旧版接口示例：

```text
https://benbenkshen.cn/data/servers.json
https://benbenkshen.cn/data/1.json
```

Netlify 部署通过根目录 `netlify.toml` 和构建产物 `_redirects` 配置代理规则。修改代理后需要重新部署。

### t2s 接口签名密钥

`t2s.awzh.cn` 当前接口需要服务端代理添加签名请求头：

```text
X-Sign-Time
X-Sign-Nonce
X-Sign
```

签名密钥不要提交到代码仓库。请在本地或部署平台配置环境变量：

```text
T2S_SIGN_SECRET=你的真实密钥
```

本地 PowerShell 示例：

```powershell
$env:T2S_SIGN_SECRET="你的真实密钥"
npm run dev
```

线上部署时，在 Netlify 或 Cloudflare Pages 的环境变量中配置 `T2S_SIGN_SECRET`。

Netlify 注意事项：

- 不要只把 `dist` 文件夹手动拖到 Netlify，否则 `netlify/functions` 不会一起部署，`/ranking-api/*` 和 `/auth-api/*` 会 404。
- 推荐使用 Git 连接 Netlify，让 Netlify 按根目录 `netlify.toml` 构建并发布。
- 如果必须手动部署，需要使用 Netlify CLI 部署整个项目并包含 functions，而不是只上传静态 dist。

## 更新记录

### 2026-07-23 活动日历与 APP 端体验优化

- 新增“活动日历”模块，读取活动排期接口，按月份展示活动图标、颜色和持续日期。
- 活动日历改为正常月历视图，并在每周日期行下方展示跨日期活动横条，一眼看清活动持续时间。
- 点击日历日期后，下方会展示当天全部活动，解决单日活动较多时日历展示不完整的问题。
- APP 端首页隐藏默认地图、神剑战场和三盟争霸入口，避免小屏进入网格地图后看不到配置信息。
- 信息统计模块在 APP 端隐藏王城网格入口，只保留盟友信息列表、搜索、保存、导出和表单填写功能。
- 首页更新记录默认展开，手机端进入首页后可以直接看到最近功能变化。

### 2026-07-21 三盟争霸与数据源管理优化

- 三盟争霸地图新增高亮据点 PK 进度条，普通据点显示 3 vs 12，中心潮汐神殿显示 12 vs 7。
- 点击 PK 进度条可打开对战详情弹窗，展示双方人数、模拟战力、完整成员列表和战况提示。
- PK 战况规则优化：双方队列都大于等于 5 人时提示“可突击、撤退”，否则提示“双方被卡死”。
- 首页管理员数据源切换改为独立小面板，验证一次账号密码后即可随时切换当前数据和旧版数据。
- 管理员入口移动到“联盟成员”按钮旁边，减少页面底部横条占位，让首页操作区更集中。
- 信息统计模块数据已与三盟争霸、神剑战场、基础地图隔离，编辑统计信息不会再覆盖地图成员数据。

### 2026-07-13 联盟成员自动同步与地图稳定性修复

- 地图方案新增“实力对比”入口卡片，进入独立页面后可左右查看两个区服的完整排行榜。
- 区服下拉框新增 1–99、100、200、300、400、500+ 区段按钮，快速缩小区服选择范围。
- 地图系列首页新增区服与联盟选择，选中联盟后立即请求排行榜、筛选联盟成员并按 UID 去重，无需额外点击更新。
- 联盟设置右侧完整展示当前联盟的上榜成员，战力前 10 名自动标记为车头并同步到所有地图。
- 已保存的区服和联盟会在再次进入时自动同步，地图成员榜刷新时也会重新读取当前联盟数据。
- 移除地图初始化对外部 CDN 的依赖，修复 fflate 加载失败导致地图无法进入的问题。
