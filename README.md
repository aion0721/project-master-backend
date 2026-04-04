# project-master-backend

案件管理Webアプリ向けの Hono ベースAPIです。

## セットアップ

```bash
yarn
yarn dev
```

デフォルトの起動ポートは `8787` です。

## 利用可能なAPI

- `GET /health`
- `GET /api/members`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/cross-project-weeks`

## ビルド

```bash
yarn build
```

## 型チェック

```bash
yarn typecheck
```
