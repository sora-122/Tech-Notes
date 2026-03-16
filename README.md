# Tech Notes

Notion に蓄積したテックメモを GitHub へ自動同期し、NotebookLM でいつでも参照できるようにするリポジトリです。

## 仕組み

```
Notion データベース
      ↓ (GitHub Actions / 毎日 AM 9:00 JST)
notes/*.md          ← ページごとの Markdown ファイル
notes-combined.md   ← 全メモを1ファイルに統合
      ↓ (URL は固定)
NotebookLM ソース   ← 一度登録するだけで自動更新
```

## NotebookLM との連携

### 初回設定（一度だけ）

1. 本リポジトリを GitHub Actions が初回実行したあと、ワークフローログに表示される URL をコピーします。

   ```
   https://raw.githubusercontent.com/<owner>/<repo>/main/notes-combined.md
   ```

2. NotebookLM を開き、**「ソースを追加」→「ウェブサイト」** を選択して上記 URL を貼り付けます。

### 以降の更新（自動）

- GitHub Actions が毎日 AM 9:00 (JST) に Notion からメモを取得し、`notes-combined.md` を更新します。
- **URL 自体は変わらない**ため、NotebookLM 側での再登録は不要です。
- NotebookLM がソースを同期するタイミングで、常に最新のメモが反映されます。

> **ポイント**: URL は固定・コンテンツは自動更新という構造により、  
> 実質的に NotebookLM のソースが自動更新される仕組みになっています。

## セットアップ

### 必要なシークレット（GitHub → Settings → Secrets and variables → Actions）

| シークレット名        | 説明                              |
| --------------------- | --------------------------------- |
| `NOTION_API_KEY`      | Notion インテグレーションの API キー |
| `NOTION_DATABASE_ID`  | 同期対象の Notion データベース ID    |

### ローカル実行（任意）

```bash
# .env ファイルを作成
cp .env.example .env   # または手動で作成

# 依存パッケージのインストール
npm install

# Notion からエクスポート
node export-notion.js

# 統合ファイルを生成（ログに NotebookLM URL が表示されます）
node generate-combined.js
```

## ファイル構成

| ファイル                             | 説明                                          |
| ------------------------------------ | --------------------------------------------- |
| `export-notion.js`                   | Notion データベースを Markdown に変換・保存    |
| `generate-combined.js`               | `notes/*.md` を1ファイルに統合、URL をログ出力 |
| `upload-gdrive.js`                   | Google Drive へのアップロード（任意）          |
| `notes/`                             | ページごとの Markdown ファイル（自動生成）     |
| `notes-combined.md`                  | 全メモ統合ファイル（NotebookLM ソース用）      |
| `.github/workflows/sync-notion-.yml` | 毎日自動実行する GitHub Actions ワークフロー   |
