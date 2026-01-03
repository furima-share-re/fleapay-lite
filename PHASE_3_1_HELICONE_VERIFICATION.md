# Phase 3.1: Helicone導入 動作確認手順

**作成日**: 2026-01-03  
**対象**: fleapay-lite プロジェクト  
**目的**: Helicone導入後の動作確認

---

## ✅ 実装完了項目

- [x] `lib/openai.ts`作成完了
- [x] `app/api/analyze-item/route.ts`変更完了
- [x] `app/api/photo-frame/route.ts`変更完了
- [x] Render環境変数設定完了（`HELICONE_API_KEY`）

---

## 🔍 動作確認手順

### 1. デプロイ確認

**検証環境へのデプロイが必要です**:
- コード変更をGitにコミット・プッシュ
- Renderが自動デプロイを実行
- デプロイ完了を確認

**確認方法**:
```powershell
# デプロイ状態確認スクリプトを実行
.\scripts\auto-verify-staging.ps1
```

---

### 2. Heliconeダッシュボードでの確認

**確認項目**:
1. **Heliconeダッシュボードを開く**
   - URL: `https://us.helicone.ai/dashboard`
   - プロジェクト: `edo ichiba`（または`fleapay-lite`）

2. **リクエストが記録されているか確認**
   - Dashboardでリクエスト数が0より大きいことを確認
   - リクエスト一覧にAPI呼び出しが表示されることを確認

3. **環境プロパティの確認**
   - `Environment`プロパティで`staging`または`production`が設定されていることを確認
   - フィルターで環境別に表示できることを確認

---

### 3. API呼び出しテスト

#### 3.1 商品画像解析API (`/api/analyze-item`)

**テスト方法**:
```powershell
# 画像ファイルをPOST
$imagePath = "path/to/test-image.jpg"
$response = Invoke-RestMethod -Uri "https://fleapay-lite-t1.onrender.com/api/analyze-item" `
  -Method Post `
  -InFile $imagePath `
  -ContentType "multipart/form-data"

$response | ConvertTo-Json
```

**期待される結果**:
- Status: 200 OK
- レスポンスに`summary`と`total`が含まれる
- Heliconeダッシュボードにリクエストが記録される

#### 3.2 写真フレーム加工API (`/api/photo-frame`)

**テスト方法**:
```powershell
# 画像ファイルをPOST
$imagePath = "path/to/test-image.jpg"
$response = Invoke-RestMethod -Uri "https://fleapay-lite-t1.onrender.com/api/photo-frame" `
  -Method Post `
  -InFile $imagePath `
  -ContentType "multipart/form-data"

# 画像が返されるので、ファイルに保存
$response | Set-Content -Path "output.png" -Encoding Byte
```

**期待される結果**:
- Status: 200 OK
- PNG画像が返される
- Heliconeダッシュボードにリクエストが記録される

---

### 4. Heliconeダッシュボードでの詳細確認

**確認項目**:

1. **リクエスト詳細**
   - リクエスト一覧から任意のリクエストをクリック
   - プロンプト内容が表示されることを確認
   - レスポンス内容が表示されることを確認
   - トークン数・コストが表示されることを確認

2. **環境別フィルタリング**
   - `Environment`フィルターで`staging`を選択
   - 検証環境のリクエストのみ表示されることを確認
   - `Environment`フィルターで`production`を選択
   - 本番環境のリクエストのみ表示されることを確認（本番環境デプロイ後）

3. **コスト可視化**
   - Dashboardの「Costs」セクションでコストが表示されることを確認
   - リクエストごとのコストが表示されることを確認

---

## ✅ 完了条件

- [ ] 検証環境にデプロイ完了
- [ ] `/api/analyze-item`が正常に動作
- [ ] `/api/photo-frame`が正常に動作
- [ ] Heliconeダッシュボードでリクエストが記録される
- [ ] 環境プロパティ（`staging`）が正しく設定されている
- [ ] コスト・レイテンシ・トークン数が可視化される
- [ ] プロンプト・レスポンス全文が記録される

---

## 🎯 次のステップ

Helicone導入が完了したら：
1. Phase 3.1の他の監視ツール（Sentry, Cloudflare WAF）を導入
2. または、Phase 3.3（Langfuse + Promptfoo）を実装（本番環境DB移行後）

---

**作成日**: 2026-01-03  
**確認実施者**: AI Assistant

