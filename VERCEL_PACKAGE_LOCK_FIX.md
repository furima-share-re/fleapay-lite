# Vercel package-lock.json 同期エラー修正ガイド

**作成日**: 2026-01-06  
**問題**: `package-lock.json` と `package.json` が同期していない

---

## 🔴 エラーの原因

`package.json` を更新した後、`package-lock.json` が更新されていないため、以下のエラーが発生しています：

```
Invalid: lock file's @types/node@20.19.27 does not satisfy @types/node@24.10.4
Invalid: lock file's undici-types@6.21.0 does not satisfy undici-types@7.16.0
```

---

## ✅ 解決方法

### ステップ1: ローカルで `npm install` を実行

`package-lock.json` を更新するために、ローカル環境で以下を実行：

```bash
npm install
```

これにより、`package-lock.json` が `package.json` の変更に合わせて更新されます。

### ステップ2: 変更をコミット

更新された `package-lock.json` をコミット：

```bash
git add package-lock.json
git commit -m "fix: Update package-lock.json for Node.js 24.x"
git push
```

---

## 📋 更新されるパッケージ

以下のパッケージが更新されます：

| パッケージ | 旧バージョン | 新バージョン |
|-----------|------------|------------|
| `@types/node` | `20.19.27` | `24.10.4` |
| `undici-types` | `6.21.0` | `7.16.0` |

---

## ⚠️ 注意事項

1. **ローカル環境のNode.jsバージョン**: ローカル環境でNode.js 20.xを使用している場合、警告が表示される可能性がありますが、VercelではNode.js 24.xが使用されるため問題ありません。

2. **依存関係の更新**: `npm install` を実行すると、他の依存関係も更新される可能性があります。

3. **セキュリティ警告**: `npm audit` の警告が表示される場合がありますが、これは別途対応してください。

---

## 🔍 確認方法

`package-lock.json` が正しく更新されたか確認：

```bash
# @types/nodeのバージョンを確認
grep -A 2 '"@types/node"' package-lock.json | head -5

# undici-typesのバージョンを確認
grep -A 2 '"undici-types"' package-lock.json | head -5
```

---

## 📚 参考

- [npm ci vs npm install](https://docs.npmjs.com/cli/v9/commands/npm-ci)
- [package-lock.json](https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json)

---

**最終更新**: 2026-01-06

