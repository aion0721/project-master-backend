# AGENTS.md

このファイルは、`H:\react\project-master-backend` のバックエンド作業ガイドです。

## 概要

- 案件管理Webアプリ向けの Hono ベース API
- 現在はモックデータを返す read-only API
- 実行環境は Node.js
- 将来的には DB 接続と更新系 API を追加する前提

## 開発コマンド

- 依存インストール: `yarn`
- 開発サーバー: `yarn dev`
- 型チェック: `yarn typecheck`
- ビルド: `yarn build`
- 本番実行: `yarn start`

作業完了前は最低でも `yarn typecheck` と `yarn build` を通すこと。

## 現在のエンドポイント

- `GET /`
- `GET /health`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/cross-project-weeks`

## ディレクトリ構成

```text
src/
  app.ts               Hono アプリ本体
  index.ts             Node サーバー起動
  data/                モックデータ
  lib/                 集計・整形ロジック
  routes/              ルート定義
  types/               ドメイン型
```

## レイヤ責務

- `routes/`
  - HTTP 入出力、パラメータ検証、ステータスコード制御
- `lib/`
  - 案件集計、詳細整形、横断ビュー用整形
- `data/`
  - 現在のモックデータ置き場
- `types/`
  - ドメイン型の定義

ルート内で重い整形を直接書かず、`lib/project-service.ts` に寄せること。

## 実装ルール

- API は JSON を返す
- まずは画面が使いやすいレスポンスを返す
- DB の生構造をそのまま返さない
- パラメータ検証は `zod` を使う
- ルート追加時は一貫して `/api/...` 配下に揃える
- 日付や週の計算ロジックは service 側で集約する

## フロントとの契約

フロント側リポジトリは `H:\react\project-master` にある。  
レスポンス変更時は、フロント側の以下機能へ影響が出る前提で扱うこと。

- 案件一覧
- 案件詳細
- 複数案件横断ビュー

特に以下は壊れやすい。

- `currentPhase`
- PM 情報
- フェーズごとの担当者
- 週単位の `weeklyPhases`

レスポンス形状を変えるときは、フロント側の型と取得処理も同時に更新すること。

## DB導入時の方針

最初に必要なのはこの4テーブルで十分。

- `projects`
- `phases`
- `members`
- `project_assignments`

導入順は以下を推奨。

1. 読み取り API を DB 化
2. Repository 層追加
3. 更新 API 追加
4. 認証・権限制御追加

## 変更時の注意

- フェーズ期間計算を変えると `cross-project-weeks` の見え方が変わる
- `projectId` や `memberId` の扱いを変えるとフロント側のルーティングや参照に影響する
- モックからDBへ移るまでは、データ整形責務を API 側に寄せておく

## 今後の拡張候補

- 永続DB化
- POST / PUT / DELETE の追加
- OpenAPI 化
- 認証
- 監査ログ
- API テスト

## 判断優先順位

1. API 契約の安定性
2. 型安全
3. フロントが使いやすいレスポンス
4. 責務分離
5. 実装速度
