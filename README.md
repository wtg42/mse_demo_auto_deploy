# mse_demo_auto_deploy

Deno runtime 在 FreeBSD 環境實驗，

簡單的 CLI 自動部署實驗工具。

使用 websocket 溝通，比較簡單啦。

## Features

- 簡單自動部署我自己機器上的 main 分支到 PM DEMO 機器上
- 會自動清除資料夾、上傳原始碼、Composer 編譯並執行 php artisan 設定
- stdout 透過 websocket 回傳到本機 localshot terminal 上顯示
- ES6 模組化
- 可以指定目標機器 ip 跟本機路徑，使用 --des_ip, --source_path CLI flag
- 整合 GitLab Runner 部署 DEMO 機專案程式 <br /> Runner: Ubuntu 22.04 Executor Type: shell

## Install

1. client & server 都需要先使用 pkg 安裝 Deno runtime
2. 設定好 ssh-keygen 公私鑰
3. Server: deno run -A main.ts --server
4. Client: deno run -A main.ts --client
5. 其他 flag: --des_ip(指定部署機器 ip), --source_path(git 原始碼路徑)
6. 第一次未安裝套件可以添加 flag: deno run --unsafely-ignore-certificate-errors

## Bugs

- 執行 chg_privilege.sh 會出現錯誤訊息，似乎是 gcc 這邊吐出來的。
