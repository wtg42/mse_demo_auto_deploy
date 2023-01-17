# mse_demo_auto_deploy

Deno runtime 在 BSD 環境實驗，

簡單的 CLI 自動部署實驗工具。

使用 websocket 溝通，比較簡單啦。

## Features

- 簡單自動部署我自己機器上的 main 分支到 PM DEMO 機器上
- 會自動清除資料夾、上傳原始碼、Composer 編譯並執行 php artisan 設定
- stdout 透過 websocket 回傳到本機 localshot terminal 上顯示
- 可以指定目標機器 ip 部署(未實作)
- 整合CI/CD(未實作)
- 模組化(未實作)

## Install

1. client & server 都需要先使用 pkg 安裝 Deno runtime
2. 設定好 ssh-keygen 公私鑰
3. deno run -A server.ts (第一次未安裝套件可以添加慘數
   --unsafely-ignore-certificate-errors)
4. deno run -A client.ts
