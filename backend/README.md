# Backend API

拡張機能から秘密情報を分離するための最小Node.js APIです。APIキーやプロ版判定に使う秘密値は、サーバーの環境変数にだけ配置します。

## 起動

```bash
cd backend
cp .env.example .env
PRO_API_KEY='server-only-secret' ALLOWED_ORIGINS='chrome-extension://your-extension-id' npm start
```

このサンプルは外部パッケージを使用しません。HTTPS終端はデプロイ先のリバースプロキシで必ず有効にしてください。

## API

- `GET /health`: 稼働確認。認証不要です。
- `GET /v1/pro/status`: `Authorization: Bearer <PRO_API_KEY>` を検証し、プロ版状態を返します。

この `PRO_API_KEY` はサーバー間の検証例です。公開サービスでは、単一の共有キーをユーザー識別に使わず、ExtensionPayなどの決済事業者のWebhookでユーザー単位の購入状態をDBへ同期し、認証済みユーザーのトークンを検証してください。