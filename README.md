# project-master-backend

案件管理 Web アプリ向けの Hono ベース API です。

## セットアップ

```bash
yarn
yarn dev
```

デフォルトの待受ポートは `8787` です。

## 利用可能な API

- `GET /`
- `GET /health`
- `GET /api/members`
- `POST /api/members/login`
- `GET /api/members/:memberId`
- `PATCH /api/members/:memberId/bookmarks`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId/current-phase`
- `PATCH /api/projects/:projectId/schedule`
- `PATCH /api/projects/:projectId/links`
- `PATCH /api/projects/:projectId/phases`
- `PATCH /api/projects/:projectId/events`
- `PATCH /api/projects/:projectId/structure`
- `PATCH /api/phases/:phaseId`
- `GET /api/cross-project-weeks`

## データ保存

SQLite などの DB は使わず、`data/` 配下の JSON を直接読み書きします。

- `data/projects.json`
- `data/phases.json`
- `data/events.json`
- `data/members.json`
- `data/assignments.json`

`members.json` はメンバー情報に加えて `bookmarkedProjectIds` も保持します。`users.json` は廃止済みです。

## ビルド

```bash
yarn build
```

## 型チェック

```bash
yarn typecheck
```
