# VERcalc 動脈瘤塞栓支援システム 仕様書

## 1. 目的

本アプリケーションは、動脈瘤の塞栓術において医師が適切なコイル選択と塞栓率（VER: Volume Embolization Ratio）の計算を効率的に行えるよう支援することを目的とします。

**解決したい課題：**
- 動脈瘤の体積計算の煩雑さ
- 多数存在するコイル製品からの最適な選択の困難さ
- リアルタイムでのVER計算による塞栓効果の定量的評価
- 手術計画の精度向上と時間短縮

## 2. ハイレベルワークフロー

```
動脈瘤情報入力 → コイル選択 → VER計算・表示 → 手術計画確定
     ↓              ↓              ↓              ↓
瘤径測定/直接入力 → 製品データベース → リアルタイム更新 → レポート出力
     ↓              ↓              ↓              ↓
体積自動計算    → 視覚的選択UI  → 累積VER表示   → データ保存
```

**詳細ワークフロー：**
1. **入力フェーズ**: 動脈瘤の瘤径を入力または体積を直接入力
2. **計算フェーズ**: 瘤径から球体近似で体積を自動計算
3. **選択フェーズ**: メーカー・製品名でフィルタリング後、チャート形式でコイル選択
4. **評価フェーズ**: 選択したコイルのVER寄与度をリアルタイム表示
5. **出力フェーズ**: 使用コイル一覧と総VERを確認・保存

## 3. システム構成

| レイヤー | コンポーネント | 主な技術 | 備考 |
|---------|---------------|----------|------|
| フロントエンド | Full Stack Webアプリケーション | Next.js 14+, TypeScript, React 18+ | App Router使用、3画面分割レイアウト |
| UI/UX | モダンデザインシステム | Tailwind CSS, shadcn/ui, Lucide Icons | 美しく一貫性のあるUI |
| チャート | インタラクティブ可視化 | Recharts, Chart.js | コイル選択チャート、VER進捗表示 |
| フォーム | バリデーション付きフォーム | React Hook Form, Zod | 型安全なフォーム処理 |
| バックエンド | API Routes | Next.js API Routes, Prisma ORM | サーバーレス関数、型安全なDB操作 |
| データベース | 軽量データベース | SQLite + Prisma | コイル情報、お気に入り設定 |
| データ処理 | CSVインポート機能 | Papa Parse, Multer | 既存コイルデータの取り込み |
| 認証 | セッション管理 | NextAuth.js（※補足提案） | セキュアな認証システム |
| ホスティング | Webアプリケーション | Vercel, Netlify（※補足提案） | 高速デプロイ、PWA対応可能 |

## 4. データモデル

| テーブル名 | 主キー | 主なカラム | 備考 |
|-----------|--------|-----------|------|
| coils | coil_id | manufacturer (text), product_name (text), secondary_diameter (real), length (real), volume (real) | コイル基本情報 |
| manufacturers | manufacturer_id | name (text), country (text), active (boolean) | メーカー情報 |
| favorites | favorite_id | user_id (FK), coil_id (FK), created_at (datetime) | お気に入りコイル |
| aneurysm_cases | case_id | case_name (text), diameter (real), volume (real), target_ver (real), created_at (datetime) | 症例データ（※補足提案） |
| case_coils | case_coil_id | case_id (FK), coil_id (FK), quantity (integer), order_sequence (integer) | 症例で使用したコイル |
| user_settings | setting_id | user_id (FK), default_ver_target (real), preferred_manufacturers (text) | ユーザー設定（※補足提案） |

## 5. ジョブ詳細

| ジョブ名 | 実行タイミング/頻度 | 具体的な説明 |
|---------|-------------------|-------------|
| CSV Import Job | ユーザートリガー | 新しいコイルデータCSVファイルを解析し、データベースに登録。重複チェックと整合性検証を実行 |
| Data Validation Job | 日次（※補足提案） | コイルデータの整合性チェック（体積計算値の妥当性、必須項目の存在確認） |
| Backup Job | 週次（※補足提案） | ユーザーデータとお気に入り設定のバックアップ作成 |
| Cache Refresh Job | アプリ起動時 | よく使用されるコイルデータのインメモリキャッシュを更新し、応答速度を向上 |

## 6. AI プロンプト設計

**※本アプリケーションは計算ベースのため、LLM利用は限定的ですが、将来的な拡張として以下を提案**

### システムプロンプト（※補足提案）
```
あなたは動脈瘤塞栓術の専門知識を持つ医療AI助手です。
以下の役割を担います：
1. コイル選択の推奨理由の説明
2. VER値に基づく塞栓効果の解説
3. 類似症例に基づく治療方針の提案

必ず医学的根拠に基づいた回答を行い、最終的な治療判断は医師が行うことを前提としてください。
```

### ユーザープロンプト例（※補足提案）
```
動脈瘤情報：
- 部位: {部位}
- 径: {径}mm
- 体積: {体積}mm³
- 現在のVER: {現在VER}%

選択中のコイル：
- メーカー: {メーカー}
- 製品名: {製品名}
- 二次径: {二次径}mm
- 長さ: {長さ}cm

この選択の妥当性と、目標VER達成のための推奨事項を教えてください。
```

## 7. フロントエンド UI

### レイアウト構成
```
grid-cols-3 gap-4 h-screen (Tailwind CSS)
├── 左パネル: 動脈瘤情報 (col-span-1)
├── 中央パネル: コイル選択 (col-span-1) 
└── 右パネル: 使用コイル一覧 (col-span-1)
```

### 主要画面コンポーネント（shadcn/ui使用）

1. **動脈瘤体積計算エリア（左画面）**
   ```typescript
   // 使用コンポーネント
   - Card, CardHeader, CardContent, CardTitle
   - Input (瘤径・体積入力)
   - Label, Badge (計算結果表示)
   - Separator (セクション区切り)
   ```
   - 瘤径入力フィールド（mm単位、バリデーション付き）
   - 体積直接入力フィールド（mm³単位）
   - 自動計算された体積の表示（リアルタイム更新）
   - 計算式の表示（`V = 4/3πr³`、Tooltip付き）
   - 計算履歴の保存・呼び出し機能

2. **コイル選択エリア（中央画面）**
   ```typescript
   // 使用コンポーネント
   - Select, SelectContent, SelectItem
   - Button, ToggleGroup
   - ScrollArea, Tabs, TabsContent
   - HoverCard, Tooltip
   - Badge (お気に入り表示)
   ```
   - メーカー選択（`Select`コンポーネント、検索機能付き）
   - 製品名選択（階層選択UI）
   - お気に入りフィルタ（`ToggleGroup`で切り替え）
   - 二次径×長さのインタラクティブチャート（Recharts）
   - 各点でのホバー表示（`HoverCard`でコイル詳細）
   - VER寄与度の色分け表示
   - 選択中コイルの詳細パネル（`Card`内に表示）
   - **AZURシリーズ特別機能**：
     - ゲル膨潤コイルの自動識別（product_seriesに'AZUR'含有判定）
     - 膨潤率設定：約2.5倍（設定可能）
     - 膨潤前後の体積併記表示（ツールチップ・詳細パネル）
     - VER計算は膨潤後体積を使用
     - 視覚的識別：「膨潤コイル」バッジ、膨潤後体積の青色強調

3. **使用コイル一覧エリア（右画面）**
   ```typescript
   // 使用コンポーネント
   - DataTable (tanstack/react-table)
   - Progress (VER進捗バー)
   - Button, DropdownMenu
   - AlertDialog (削除確認)
   - Sheet (詳細表示)
   ```
   - 選択済みコイルの`DataTable`（ソート・フィルタ機能）
   - 各行でのアクション（編集・削除・複製）
   - 累積VER値の大きな表示（`Progress`コンポーネント）
   - 目標VER達成度の視覚的表示
   - データエクスポート（CSV/PDF）

### 共通UI要素・ナビゲーション

4. **ヘッダーナビゲーション**
   ```typescript
   // 使用コンポーネント
   - NavigationMenu, Breadcrumb
   - Input (症例名)
   - Button, DropdownMenu
   - Dialog (設定モーダル)
   ```
   - 症例名入力（自動保存機能）
   - 保存/読み込み（`Dialog`での症例選択）
   - 設定メニュー（`DropdownMenu`）
   - ヘルプ・ショートカット（`Popover`）

5. **設定画面（モーダル・専用ページ）**
   ```typescript
   // 使用コンポーネント
   - Dialog, DialogContent
   - Form, FormField, FormItem
   - Switch, Slider
   - Tabs, TabsContent
   ```
   - 目標VER値設定（`Slider`で直感的操作）
   - 好みのメーカー設定（`Checkbox`グループ）
   - 単位表示切り替え（`Switch`）
   - テーマ設定（ダーク/ライトモード）
   - データインポート/エクスポート

6. **高度なUI機能**
   ```typescript
   // 使用コンポーネント
   - Command, CommandDialog (コマンドパレット)
   - Toast, Sonner (通知)
   - ResizablePanelGroup (画面分割調整)
   - ContextMenu (右クリックメニュー)
   ```
   - コマンドパレット（`Cmd+K`でコイル検索）
   - リアルタイム通知（保存完了、エラー通知）
   - 画面分割比率の調整可能
   - 右クリックコンテキストメニュー

### レスポンシブ対応

7. **モバイル・タブレット対応**
   ```typescript
   // Tailwind CSS Breakpoints
   - sm: タブレット縦向き（画面縦積み）
   - md: タブレット横向き（2列レイアウト）
   - lg: デスクトップ（3列レイアウト）
   ```
   - 画面サイズに応じたレイアウト変更
   - タッチ操作に最適化されたボタンサイズ
   - スワイプジェスチャー対応（`Sheet`使用）

---

**注意事項：**
- 本システムは医療補助ツールであり、最終的な治療判断は医師の責任において行われるものとします
- コイルデータの正確性について定期的な検証が必要です
- 医療機器規制に準拠した開発・運用を前提とします（※補足提案） 