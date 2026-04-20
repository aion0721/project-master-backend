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
- `PATCH /api/projects/:projectId`
- `PATCH /api/projects/:projectId/current-phase`
- `PATCH /api/projects/:projectId/schedule`
- `PATCH /api/projects/:projectId/links`
- `PATCH /api/projects/:projectId/phases`
- `PATCH /api/projects/:projectId/events`
- `PATCH /api/projects/:projectId/structure`
- `PATCH /api/phases/:phaseId`
- `GET /api/cross-project-weeks`
- `GET /api/ai/health`
- `GET /api/ai/capabilities`
- `GET /api/ai/projects/:projectNumber/context`
- `GET /api/ai/audit-log`
- `POST /api/ai/commands/execute`

## AI 拡張

既存の `/api/*` は変更せず、AI 専用の薄いレイヤを `/api/ai/*` に追加しています。

- `GET /api/ai/projects/:projectNumber/context`
  - AI が案件理解に必要な詳細、関連システム、横断週次情報をまとめて取得します。
- `POST /api/ai/commands/execute`
  - 現在は `create_project` と `update_project_phases` をサポートします。
  - `dryRun: true` を指定すると永続化せずに事前検証だけ行います。
- `GET /api/ai/audit-log`
  - AI コマンドの検証・実行結果を `data/ai-audit-log.json` から取得します。

## データ保存

SQLite などの DB は使わず、`data/` 配下の JSON を直接読み書きします。

- `data/projects.json`
- `data/phases.json`
- `data/events.json`
- `data/members.json`
- `data/assignments.json`
- `data/ai-audit-log.json`

`members.json` はメンバー情報に加えて `bookmarkedProjectIds` も保持します。`users.json` は廃止済みです。

## ビルド

```bash
yarn build
```

## 型チェック

```bash
yarn typecheck
```
