# Power Apps MDA Test with AI

Playwright + TypeScript で Power Apps モデル駆動型アプリ (MDA) の E2E UI テスト自動化フレームワーク。  
Dataverse Web API からメタデータを取得し、LLM (GPT-4o) でテストコードを自動生成するハイブリッドアプローチ。

## ディレクトリ構造

```
src/
  pages/              # MDA Page Object Model
    login.page.ts     # Entra ID ログインフロー
    app-shell.page.ts # サイトマップ、コマンドバー、通知
    form.page.ts      # エンティティフォーム操作
    view.page.ts      # エンティティリスト/グリッド操作
    dialog.page.ts    # ダイアログ操作
  helpers/
    auth.helper.ts    # storageState 管理
  metadata/
    dataverse-client.ts # Dataverse Web API クライアント
    types.ts           # メタデータ型定義
    parser.ts          # メタデータパーサー
    extractor.ts       # メタデータ取得 CLI
  generator/
    prompts/
      templates.ts     # LLM プロンプトテンプレート
    generator.ts       # AI テスト生成 CLI
tests/
  auth.setup.ts        # 認証セットアップ (global setup)
  generated/           # AI 生成テスト出力先
  manual/
    sample-crud.spec.ts # 手動記述リファレンステスト
metadata-cache/        # 取得済みメタデータ JSON
```

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
npx playwright install chromium
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、値を設定:

```bash
cp .env.example .env
```

| 変数 | 説明 |
|---|---|
| `MDA_URL` | Power Apps MDA アプリの URL |
| `MDA_USERNAME` | Entra ID ユーザー名 |
| `MDA_PASSWORD` | パスワード |
| `TENANT_ID` | Azure AD テナント ID |
| `CLIENT_ID` | アプリ登録のクライアント ID |
| `CLIENT_SECRET` | クライアントシークレット |
| `OPENAI_API_KEY` | OpenAI API キー |
| `OPENAI_MODEL` | 使用モデル (デフォルト: `gpt-4o`) |

## 使い方

### テスト一覧の表示

```bash
npx playwright test --list
```

### テストの実行

```bash
npx playwright test
```

### テストレポートの表示

```bash
npx playwright show-report
```

### メタデータの取得

```bash
npx ts-node src/metadata/extractor.ts --entity account
npx ts-node src/metadata/extractor.ts --entity contact
```

取得したメタデータは `metadata-cache/` に JSON として保存されます。

### AI テスト生成

```bash
npx ts-node src/generator/generator.ts --entity account --pattern crud
npx ts-node src/generator/generator.ts --entity account --pattern validation
npx ts-node src/generator/generator.ts --entity account --pattern navigation
npx ts-node src/generator/generator.ts --entity account --pattern bpf
```

生成されたテストは `tests/generated/` に出力されます。

## Page Object Model (POM)

### LoginPage
Entra ID ログインフロー（メール → パスワード → MFA 待機 → Stay signed in）。

### AppShellPage
- サイトマップナビゲーション（エリア切替、サブエリア遷移）
- コマンドバー操作（ボタンクリック、ドロップダウン、More Commands）
- 通知バー（成功/エラーメッセージ検出）
- ローディングスピナー待機

### FormPage
- フィールド操作: テキスト、数値、日付、ルックアップ、オプションセット、2値オプション
- タブ/セクション展開・折りたたみ
- ヘッダーフィールド操作
- フォーム保存（Save, Save & Close）、レコード削除
- BPF ステージ操作
- バリデーションエラー検出

### ViewPage
- ビュー切替
- グリッド行選択・レコードオープン
- 列ソート/フィルター、クイック検索
- レコード件数取得

### DialogPage
- ルックアップダイアログ
- 削除確認ダイアログ
- 重複検出ダイアログ
- カスタムダイアログ

## 技術的決定事項

| 項目 | 決定 | 理由 |
|---|---|---|
| フレームワーク | Playwright + TypeScript | Auto-wait、TypeScript ネイティブ、MDA の複雑な DOM に対応 |
| セレクタ戦略 | `data-id`, `aria-label` ベース | MDA の `data-id` はフィールド論理名に対応 |
| 認証 | storageState 方式 | 初回ログイン → 以降自動再利用、MFA 対応 |

## ライセンス

[LICENSE](LICENSE) を参照してください。