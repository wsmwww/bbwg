# 信息统计接口服务

这个服务先用本地 JSON 文件保存“信息统计”模块的数据，后续要换成 Supabase、LeanCloud、MySQL 或其他免费云数据库时，只需要替换 `src/repositories` 里的数据访问实现。

## 运行

```bash
cd info-statistics-api
npm run dev
```

默认地址：

```text
http://localhost:8090
```

## 接口

- `GET /api/health` 健康检查
- `GET /api/info-registrations` 获取全部填写记录
- `POST /api/info-registrations` 新增一条记录
- `PUT /api/info-registrations/:id` 更新一条记录
- `DELETE /api/info-registrations/:id` 删除一条记录
- `PUT /api/info-registrations` 覆盖保存全部记录
- `DELETE /api/info-registrations` 清空全部记录

## 数据文件

本地数据保存在：

```text
data/info-registrations.json
```
