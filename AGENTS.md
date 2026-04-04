# AGENTS.md

このファイルは `H:\react\project-master-backend` の開発ガイドです。

## 役割

- 案件管理 Web アプリ向けの Hono API
- フロントエンド `H:\react\project-master` から利用される JSON API
- 永続化は DB ではなく OS 上の分割 JSON ファイル

## 開発コマンド

- 依存関係インストール: `yarn`
- 開発サーバ: `yarn dev`
- 型チェック: `yarn typecheck`
- ビルド: `yarn build`
- 本番起動: `yarn start`

変更完了前に最低限 `yarn typecheck` と `yarn build` を通すこと。

## 現在の永続化方針

データは backend ルートの `data/` に機能ごとに分割して保存する。

- `data/projects.json`
- `data/phases.json`
- `data/members.json`
- `data/assignments.json`

実装の入口は [file-store.ts](H:/react/project-master-backend/src/lib/file-store.ts)。

- 起動時にファイルを検証して読み込む
- ファイルが無ければ seed データから生成する
- 更新時は一時ファイルへ書いてから置き換える
- 書き込みはアプリ内で直列化する

## ディレクトリ構成

```text
src/
  app.ts
  index.ts
  data/
    seedData.ts
  lib/
    file-store.ts
    project-service.ts
  routes/
    health.ts
    projects.ts
    cross-project.ts
  types/
    domain.ts
data/
  projects.json
  phases.json
  members.json
  assignments.json
```

## レイヤ責務

- `routes/`
  - HTTP 入出力、パラメータ検証、HTTP ステータス制御
- `lib/file-store.ts`
  - JSON 永続化、起動時初期化、スキーマ検証、書き込み直列化
- `lib/project-service.ts`
  - 案件一覧、案件詳細、横断ビュー、作成、更新の業務ロジック
- `data/seedData.ts`
  - 初回起動時の初期データ
- `types/`
  - ドメイン型

ルートで配列を直接操作せず、永続化や業務処理は `lib/` に寄せること。

## 実装ルール

- API は JSON を返す
- 入力バリデーションは `zod`
- フロントに返す shape を不用意に壊さない
- ID 採番や関連整合性は service 層で管理する
- 永続化方式を変える場合も、まず `project-service.ts` の外側で吸収する

## フロントとの契約

主に使われる画面は以下。

- 案件一覧
- 案件詳細
- 複数案件横断ビュー

そのため以下のレスポンス互換性が重要。

- `currentPhase`
- `pm`
- `phases[].range`
- `phases[].assignee`
- `assignments[].member`
- `weeklyPhases`

## 今後の拡張候補

- 案件編集、削除 API
- フェーズ担当者、状態、進捗の更新 API
- 監査ログ
- 認証
- DB への移行
