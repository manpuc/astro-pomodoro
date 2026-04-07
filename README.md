# 🍅 Pomodoro Timer

集中力を高めるための高機能・モダンなポモドーロタイマー。タスク管理、統計機能、高度なカスタマイズ性を備えたPWA（Progressive Web App）です。

## ✨ 特徴

- **ポモドーロタイマー**: 作業・小休憩・長休憩のサイクルを直感的に管理。
- **タスク管理**: ドラッグ可能なパネルでタスクを管理し、完了状況を追跡。
- **統計機能**: 作業セッションの結果を視覚化し、月間ポイントでモチベーションを維持。
- **高度なカスタマイズ**:
  - タイマーの色（作業・休憩）を個別に設定可能。
  - Google Fontsから好きなフォントを選択可能。
  - ダークモード/ライトモードに完全対応（OS設定連動）。
- **PWA (Progressive Web App)**: デスクトップやスマートフォンにアプリとしてインストール可能。オフラインでも動作。
- **SEO & Sitemap**: 自動生成されるサイトマップとメタタグにより、検索エンジンへの最適化を実施。
- **自在なレイアウト**: `react-resizable-panels` を使用し、タスク・統計パネルのサイズを自由に変更可能。
- **通知機能**: `sonner` による洗練されたトースト通知と、ブラウザ通知による休憩開始のお知らせ。
- **キーボードショートカット**: `s`（開始）、`e`（停止）、`t`（タスクパネル）、`g`（統計パネル）などの操作に対応。

## 🛠️ 技術スタック

- **Framework**: [Astro 6](https://astro.build/)
- **Frontend Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **State Management**: [Zustand 5](https://zustand-demo.pmnd.rs/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Form & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **PWA**: [@vite-pwa/astro](https://vite-pwa-org.netlify.app/frameworks/astro)
- **Language**: [TypeScript 6](https://www.typescriptlang.org/)
- **Deployment**: [Vercel](https://vercel.com/)

## 🚀 開発環境のセットアップ

### 1. 依存関係のインストール

```sh
pnpm install
```

### 2. ローカルサーバーの起動

```sh
pnpm dev
```

ブラウザで `http://localhost:4321` を開きます。

### 3. ビルド

```sh
pnpm build
```

##  Genie コマンド

| コマンド | 内容 |
| :--- | :--- |
| `pnpm install` | 依存関係をインストール |
| `pnpm dev` | ローカル開発サーバーを起動 |
| `pnpm build` | 本番用ビルドを生成 (`./dist/`) |
| `pnpm preview` | ビルド済みファイルをローカルでプレビュー |
| `pnpm astro check` | TypeScriptの型チェックなどを実行 |

## 📱 PWAについて

このアプリはPWAに対応しており、以下の機能が利用可能です：

- **オフライン動作**: キャッシュによりインターネット未接続でも利用可能。
- **ホーム画面への追加**: ブラウザの設定やアプリ内の「インストール」ボタンから追加できます。
- **プッシュ通知**: ブラウザの通知機能を使用して休憩の開始をお知らせします。

---

Developed with ❤️ for productivity.
