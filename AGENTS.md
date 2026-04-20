# AGENTS.md

このファイルは `H:\react\project-master-backend` の作業ガイドです。

## 🚨 MUST RULES（最重要）

- 文字列は UTF-8 の通常文字で記述すること（\uXXXX 禁止）
- 文字化けした状態で編集しないこと（先に修正する）
- shellでファイルを扱う場合は Encoding を明示すること
- 全置換は禁止し、必ず最小差分で変更すること

## 概要

- 案件管理 Web アプリ向けの Hono API
- フロントエンド `H:\react\project-master` から利用される JSON API
- 永続化は DB ではなく `data/` 配下の JSON ファイル

## 開発コマンド

- 依存インストール: `yarn`
- 開発サーバー: `yarn dev`
- 型チェック: `yarn typecheck`
- ビルド: `yarn build`
- 本番起動: `yarn start`

作業完了前は最低でも `yarn typecheck` と `yarn build` を通すこと。

## 永続化の前提

データは `data/` に保存する。

- `data/projects.json`
- `data/phases.json`
- `data/events.json`
- `data/members.json`
- `data/assignments.json`

`members.json` は組織メンバー情報に加えて `bookmarkedProjectIds` を保持する。`users.json` は使わない。

永続化の実装は [file-store.ts](H:/react/project-master-backend/src/lib/file-store.ts)。

- 読み込み時にファイルを検証して正規化する
- ファイルがなければ seed data から初期化する
- 更新時は一時ファイルへ書いてから置き換える
- 書き込みはアプリ側で直列化する

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
    user-service.ts
  routes/
    health.ts
    projects.ts
    cross-project.ts
    users.ts
  types/
    domain.ts
data/
  projects.json
  phases.json
  events.json
  members.json
  assignments.json
```

## レイヤ責務

- `routes/`
  - HTTP 入出力、パラメータ検証、HTTP ステータス変換
- `lib/file-store.ts`
  - JSON 永続化、起動時の読み込み、書き込み制御
- `lib/project-service.ts`
  - 案件一覧、案件詳細、構造更新、フェーズ更新などの業務ロジック
- `lib/user-service.ts`
  - 利用メンバー選択、ブックマーク更新
- `data/seedData.ts`
  - 初期化用の seed データ
- `types/`
  - ドメイン型

## 実装ルール

- API は JSON を返す
- 入力バリデーションは `zod`
- フロントに返す shape を不用意に変えない
- ID 採番や関連整合性は service 層で管理する
- 永続化都合を増やす場合も、業務ロジックはまず `lib/` に寄せる

## 主要レスポンス

主に使われる画面は以下。

- 案件一覧
- 案件詳細
- 複数案件横断ビュー

そのため以下のレスポンス整形は互換性に注意する。

- `currentPhase`
- `pm`
- `phases[].range`
- `assignments[].member`
- `weeklyPhases`

## 今後の拡張候補

- 案件編集 API
- メンバー権限や認証
- フェーズ週計算の集約
- DB への移行

## 文字コード

- テキストファイルは `UTF-8` で統一する
- 新規作成・編集時は `UTF-8` で保存し、`Shift-JIS` や環境依存のコードページを使わない
- Windows 環境ではターミナルやスクリプトの既定エンコーディングで文字化けしやすいため、ファイル読み書き時は文字コードを明示して `UTF-8` を優先する
- 既存ファイルの文字コードが不明な場合は、内容確認なしに保存し直さず、現在のエンコーディングを確認してから扱う

## ファイルの読み取り書き込みについて

- 適用範囲: このファイルが置かれたフォルダ配下すべて。
- 文字コードは UTF-8 を必須とする。
- 日本語を `\uXXXX` 形式で出力しないこと。
- 文字化けした内容を見つけた場合、そのまま編集せず UTF-8 の正しい文字列として扱うこと。

### shell 利用ルール

- shell を使わずに済む場合は、エディタ上のファイル内容を優先して扱うこと。
- PowerShell でファイルを読む場合は、必ず Encoding を明示すること。
  - 例: `Get-Content -Raw -Encoding utf8 <FILE>`

- PowerShell でファイルを書く場合は、必ず UTF-8 を明示すること。
  - 例: `Set-Content -Encoding utf8`
  - 例: `Add-Content -Encoding utf8`
  - 例: `Out-File -Encoding utf8`

### PowerShell 5.1 実行ラッパ

- PowerShell 5.1 で日本語を含むコマンドを実行する場合は、以下のラッパを付けること。
- 形式（`<COMMAND>` を実コマンドに置換）:
  - `[Console]::InputEncoding=[Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $OutputEncoding=[Text.UTF8Encoding]::new($false); chcp 65001 > $null; & { <COMMAND> }`

### 変更方針

- 全置換ではなく最小差分で変更すること。
- 文字コード問題がある場合は、先に文字列を UTF-8 として正常化し、その後にリファクタリングすること。
