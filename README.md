# プライズウォッチ

好きなアニメのクレーンゲームプライズ最新情報を、複数の公式サイトからまとめてチェックできる個人用Webアプリ。

- **バンプレストナビサイト** (bsp-prize.jp) — BANDAI SPIRITS のプライズ
- **セガプラザ** (segaplaza.jp) — SEGA のプライズ

## 機能

- 登録したアニメのプライズだけを一覧表示（画像 / 取得元 / 作品名 / 商品名 / 登場日）
- 絞り込み: 作品チェックボックス、直近1〜3ヶ月プリセット、期間指定、登場日の昇順/降順
- フィルタ状態はDBに保存され、次回開いたときもそのまま
- アニメ登録時は両サイトの作品マスタから候補をサジェスト
- データ更新: 画面表示時に自動（6時間経過で）＋「今すぐ更新」ボタン

## 開発

```bash
npm install
npm run db:push   # ローカルSQLite (data/local.db) にスキーマ反映
npm run dev       # http://localhost:3000
npm test          # スクレイパーのユニットテスト（実レスポンスのフィクスチャ使用）
```

「アニメ管理」から作品を登録 →「今すぐ更新」でプライズが収集されます。

## デプロイ（Vercel + Turso）

DBはSQLite互換の [Turso](https://turso.tech)（無料枠あり）を使う。

1. Turso で DB を作成し、URL とトークンを取得
   ```bash
   turso db create prize-watch
   turso db show prize-watch --url
   turso db tokens create prize-watch
   ```
2. 本番DBにスキーマを反映
   ```bash
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:push
   ```
3. Vercel にデプロイし、環境変数 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` を設定

## 仕組み（データ取得）

| サイト | 方式 |
|---|---|
| bsp-prize.jp | サーバーレンダリングHTMLを取得し cheerio でパース。`/title/` の作品マスタ（約370作品）と、作品ごとの `/title/{IP-ID}/`（最新**15件**のローリングウィンドウ）を読む |
| segaplaza.jp | 画面はNuxt製CSRだが、検索の実体である静的JSON `/jsons/search-db.json`（全プライズ約4,000件）と `search-db2.json`（登場日・作品名）を直接取得。ETagによる条件付きGETで差分がないときは再ダウンロードしない。画像URLだけはJSビルド依存のため、新規アイテムに限り商品ページの `og:image` を1回読んでキャッシュ |

### 源泉サイトへの配慮

- 更新はクールダウン付き（自動15分・手動2分）
- BSPへのリクエストは登録作品数ぶんのみ、300ms間隔の直列実行
- SEGAのog:image取得は1回の更新につき最大40件・並列5
- 画像はホットリンク表示（`referrerPolicy="no-referrer"`）で再配布しない

### 注意

- BSPは作品ごとに「直近＋今後の予定」約15件しか公開していないため、運用開始直後は過去分が薄い。定期的に更新すればDBに履歴が蓄積されていく
- サイト構造が変わるとパーサーが壊れる。`npm test`（実レスポンスのフィクスチャ）で検知し、更新エラーは一覧画面上部に表示される

## 技術スタック

Next.js 16 (App Router) / TypeScript / Tailwind CSS v4 / Drizzle ORM + libSQL（ローカル: SQLiteファイル、本番: Turso）/ cheerio / Vitest
