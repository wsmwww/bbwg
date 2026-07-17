# qiankun micro frontend demo

This folder contains four small projects:

- `main-app`: qiankun host application
- `vue-app`: Vue 3 micro application
- `react-app`: React 17 micro application
- `hero-card-app`: hero card group micro application
- `info-statistics-api`: information statistics API service

## Run

Double-click from this folder:

- `启动全部项目.bat`: start the main app and all micro apps
- `重启全部项目.bat`: stop ports 8080/8081/8082/8084, then start all apps again
- `停止全部项目.bat`: stop all apps

Then open http://localhost:8080.

Manual run:

Open four terminals:

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

Then open http://localhost:8080.

Ports:

- main app: http://localhost:8080
- vue app: http://localhost:8081
- react app: http://localhost:8082
- hero card app: http://localhost:8084
- information statistics API: http://localhost:8090

## 信息统计接口

`vue-app` 的信息统计模块会优先请求 `info-statistics-api`：

```text
GET/POST/PUT/DELETE http://localhost:8090/api/info-registrations
```

当前后端使用 `info-statistics-api/data/info-registrations.json` 做本地持久化。以后换 Supabase、LeanCloud、MySQL 等云端数据库时，保留接口路径不变，只替换 `info-statistics-api/src/repositories` 的实现即可。

## 联盟排行榜接口

地图系列会通过 `/benben-ranking-api` 读取区服和联盟排行榜。本地开发服务器已经代理到
`https://benbenkshen.cn/data`。生产环境需要配置同名反向代理，否则浏览器会因为跨域限制
无法直接读取数据站。

Nginx 示例：

```nginx
location /benben-ranking-api/ {
    proxy_pass https://benbenkshen.cn/data/;
    proxy_set_header Host benbenkshen.cn;
    proxy_ssl_server_name on;
}
```

也可以在加载微应用前设置 `window.__BENBEN_RANKING_API_BASE__`，指定其他同源代理地址。

Netlify 部署已经通过根目录 `netlify.toml` 和构建产物中的 `_redirects` 配置同一条代理规则。
修改后必须重新部署；直接访问 `/benben-ranking-api/servers.json` 应返回区服 JSON，而不是 Netlify 404 页面。
