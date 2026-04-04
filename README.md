# project-master-backend

案件管理 Web アプリ向けの Hono ベース API です。

## セットアップ

```bash
yarn
yarn dev
```

デフォルトの起動ポートは `8787` です。

## 利用可能な API

- `GET /`
- `GET /health`
- `GET /api/members`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/phases/:phaseId`
- `GET /api/cross-project-weeks`

## 永続化

SQLite などの DB は使わず、backend ルート配下の `data/` ディレクトリに JSON を分割保存します。

- `data/projects.json`
- `data/phases.json`
- `data/members.json`
- `data/assignments.json`

起動時に各ファイルを読み込み、存在しない場合は seed データから自動生成します。
更新時は対象ファイルを `*.tmp` に書いてから置き換えるため、単純な上書きより安全です。

## ビルド

```bash
yarn build
```

## 型チェック

```bash
yarn typecheck
```
