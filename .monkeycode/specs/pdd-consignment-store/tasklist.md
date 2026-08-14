# 需求实施计划

- [x] 1. 設置項目結構與後端基礎
   - 創建 `server/` 目錄與 package.json，安裝 Express、better-sqlite3、bcryptjs、jsonwebtoken、node-fetch
   - 建立 Express 入口 `server/src/index.js` 與中間件（json body、CORS）
   - 建立 `client/` Vue 3 + Vite 項目骨架
   - 配置 Vite dev server `/api` 反向代理至後端 port 3001（對應設計 Requirements 1-7）

- [x] 2. 實現數據庫與核心計算邏輯
  - [x] 2.1 實現 SQLite 數據庫初始化與 schema
    - 建立 users、products、orders、exchange_rates、admin_settings 資料表（對應設計 Data Models）
    - 初始化管理員帳號 gary/123123（bcrypt 雜湊）與默認運費費率 10 HKD、服務費 10%
  - [x] 2.2 實現價格計算模塊
    - 實現 `unit_price_hkd = round(price_cny × rate × 1.1, 2)`（對應需求 Requirement 2）
  - [x] 2.3 實現運費計算模塊
    - 實現 `shipping_fee = ceil(weight_kg) × rate_per_kg`，不足 1kg 按 1kg（對應需求 Requirement 3）
  - [x] 2.4 為計算邏輯編寫單元測試
    - 測試價格與運費計算邊界（不足 1kg、恰為整數、多 SKU 最低價）

- [x] 3. 檢查點 - 確保數據庫初始化與計算邏輯正確，如有疑問請詢問用戶

- [x] 4. 實現匯率服務
  - [x] 4.1 實現匯率獲取與緩存
    - 每日首次請求向免費匯率 API 取得 CNY/HKD 匯率並緩存於 exchange_rates 表（對應需求 Requirement 2.4）
    - API 失敗時回退至最近一次成功匯率

- [x] 5. 實現拼多多商品抓取服務
  - [x] 5.1 實現拼多多鏈結解析
    - 從各種拼多多鏈結格式提取 goods_id（對應需求 Requirement 1.1）
  - [x] 5.2 實現商品頁抓取與資料解析
    - 以模擬瀏覽器請求商品頁，從 HTML/JSON 提取名稱、價格、圖片、規格、重量（對應需求 Requirement 1.2-1.6）
    - 抓取結果緩存至 products 表，失敗時返回明確錯誤
  - [x] 5.3 為鏈結解析與資料提取編寫單元測試
    - 用樣本 HTML 驗證資料提取邏輯

- [x] 6. 實現認證服務
  - [x] 6.1 實現客戶註冊接口
    - POST /api/auth/register，驗證帳號/密碼/聯絡人/電話/收貨地址必填並檢查重複（對應需求 Requirement 4）
  - [x] 6.2 實現客戶登入接口
    - POST /api/auth/login，驗證密碼並簽發 JWT（對應需求 Requirement 4.3-4.4）
  - [x] 6.3 實現管理員登入接口
    - POST /api/auth/admin-login，驗證 gary/123123 並簽發管理員 JWT（對應需求 Requirement 6.1-6.2）
  - [x] 6.4 為認證流程編寫單元測試
    - 測試註冊重複帳號、錯誤密碼、管理員憑證

- [x] 7. 實現訂單服務
  - [x] 7.1 實現創建訂單接口
    - POST /api/orders（需客戶 JWT），快照售價/匯率/運費，記錄付款備註，使用註冊收貨資訊（對應需求 Requirement 5）
  - [x] 7.2 實現客戶查詢訂單接口
    - GET /api/orders（需客戶 JWT），僅返回本人訂單（對應需求 Requirement 5.5）
  - [x] 7.3 為訂單建立與查詢編寫單元測試
    - 測試權限隔離與費用計算正確性

- [x] 8. 實現管理員後台接口
  - [x] 8.1 實現訂單管理接口
    - GET /api/admin/orders、PATCH /api/admin/orders/:id/status（需管理員 JWT），訂單狀態流轉（對應需求 Requirement 6.4-6.5）
  - [x] 8.2 實現費率與匯率查詢接口
    - GET /api/admin/rates、PUT /api/admin/rates 更新運費費率（對應需求 Requirement 7）

- [x] 9. 檢查點 - 所有後端 API 完成，如有疑問請詢問用戶

- [x] 10. 實現前端客戶端
  - [x] 10.1 實現首頁與商品查詢
    - 首頁貼拼多多鏈結，調用抓取接口並跳轉商品詳情（對應需求 Requirement 1）
  - [x] 10.2 實現商品詳情頁
    - 顯示商品圖片/名稱/人民幣價格/港幣售價/運費/總價，規格選擇與數量（對應需求 Requirement 2-3）
  - [x] 10.3 實現註冊與登入頁面
    - 註冊表單含聯絡人/電話/收貨地址，登入後存儲 JWT（對應需求 Requirement 4）
  - [x] 10.4 實現下單流程
    - 已登入客戶填寫付款備註下單，顯示訂單確認（對應需求 Requirement 5.2-5.4）
  - [x] 10.5 實現我的訂單頁
    - 顯示本人訂單列表與狀態（對應需求 Requirement 5.5）

- [x] 11. 實現前端管理後台
  - [x] 11.1 實現管理員登入頁
    - 輸入帳號密碼調用管理員登入接口（對應需求 Requirement 6.1）
  - [x] 11.2 實現訂單管理頁面
    - 訂單列表、明細、狀態更新、費率設定（對應需求 Requirement 6.3-6.5、7）

- [x] 12. 檢查點 - 端到端驗證完整流程
  - 註冊→登入→貼鏈結→選規格→下單→管理員登入→確認訂單流程驗證
  - 所有檢查點如有疑問請詢問用戶

- [x] 13. 實現產品目錄與後台產品管理
  - [x] 13.1 數據庫遷移與產品狀態欄位
    - products 表新增 status（active/inactive/deleted）與 is_manual 欄位
  - [x] 13.2 實現產品列表與管理接口
    - GET /api/products（客戶端上架產品目錄，含港幣報價）
    - POST /api/products、PUT /:id、DELETE /:id、PATCH /:id/status（管理員）
    - GET /api/admin/products（管理員查看全部非刪除產品）
  - [x] 13.3 首頁改造為產品目錄
    - 首頁顯示所有上架產品卡片（圖片/名稱/港幣售價），貼鏈結輸入框保留於上方
  - [x] 13.4 後台產品管理頁面
    - 產品列表、新增、編輯、刪除、上下架功能
  - [x] 13.5 為產品管理編寫接口測試
    - 權限、新增、上下架、編輯、刪除、客戶可見性測試
