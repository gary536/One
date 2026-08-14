# Requirements Document

## Introduction

本系統是一個面向香港買家的拼多多代購購物網站。客戶可以貼上拼多多商品鏈結，系統自動獲取商品資訊（含規格），以當日人民幣兌港幣匯率換算後附加 10% 代購服務費計算售價；運費按商品重量以 10 HKD/kg 計算，不足 1kg 按 1kg 收費。客戶需註冊並提供聯絡人、電話及收貨地址方可下單。系統提供客戶端（註冊/登入/下單/查單）與後台管理端（管理員登入、商品與訂單管理）。

## Glossary

- **系統**: 拼多多代購網站（含客戶端與後台管理端）
- **客戶**: 使用網站購物的香港買家
- **管理員**: 後台管理人員，帳號 gary / 密碼 123123
- **拼多多鏈結**: 用戶貼上的拼多多商品網址
- **商品資訊**: 從拼多多鏈結取得的商品名稱、價格、圖片、規格（SKU：顏色/尺寸/選項等）、重量等
- **當日匯率**: 系統取得的當日人民幣兌港幣匯率
- **代購服務費**: 售價額外附加的 10% 費用
- **運費**: 按商品重量計算的配送費用，10 HKD/kg，不足 1kg 按 1kg 收費

## Requirements

### Requirement 1: 商品資訊自動獲取

**User Story:** AS 客戶, I want 貼上拼多多鏈結即可看到商品資訊與可購買規格, so that 不需手動輸入商品資料

#### Acceptance Criteria

1. WHEN 客戶在網站貼上拼多多商品鏈結, 系統 SHALL 自動解析鏈結並提取商品 ID
2. WHEN 系統成功取得商品資訊, 系統 SHALL 顯示商品名稱、價格、圖片、可選規格
3. WHEN 系統無法取得商品資訊, 系統 SHALL 顯示明確錯誤訊息並停止下單流程
4. WHEN 商品存在多種規格, 系統 SHALL 自動抓取並顯示該商品所有規格選項供客戶選擇
5. WHEN 商品頁包含重量資訊, 系統 SHALL 自動抓取重量用於運費計算
6. WHEN 商品頁缺少重量資訊, 系統 SHALL 以預設重量 1kg 計算運費
7. WHEN 客戶提交訂單, 系統 SHALL 保存客戶所選之規格資訊

### Requirement 2: 價格計算

**User Story:** AS 系統, I want 按當日匯率換算並附加 10% 服務費計算售價, so that 客戶得知最終港幣售價

#### Acceptance Criteria

1. WHEN 系統計算商品售價, 系統 SHALL 以當日人民幣兌港幣匯率換算後再附加 10% 代購服務費
2. WHEN 系統計算最終售價, 系統 SHALL 港幣售價 = 人民幣價格 × 當日匯率 × 1.1
3. WHEN 匯率更新, 系統 SHALL 以當日最新匯率為準
4. WHEN 無法取得當日匯率, 系統 SHALL 使用最近一次成功取得之匯率並提示客戶

### Requirement 3: 運費計算

**User Story:** AS 客戶, I want 明確認知運費計算方式, so that 下單前了解總費用

#### Acceptance Criteria

1. WHEN 客戶選購商品, 系統 SHALL 依商品重量計算運費
2. WHEN 商品重量不足 1kg, 系統 SHALL 按 1kg 收費
3. WHEN 商品重量為 N kg, 系統 SHALL 以 ceil(N) × 10 HKD 計算運費
4. WHEN 客戶下單, 系統 SHALL 於訂單明細顯示運費金額

### Requirement 4: 客戶註冊與登入

**User Story:** AS 客戶, I want 註冊帳號並登入, so that 可使用購物與訂單功能

#### Acceptance Criteria

1. WHEN 新客戶註冊, 系統 SHALL 要求填寫帳號、密碼、聯絡人姓名、聯絡電話及收貨地址
2. WHEN 客戶提交註冊資料, 系統 SHALL 驗證必填欄位並檢查帳號是否重複
3. WHEN 客戶登入, 系統 SHALL 驗證帳號密碼
4. WHEN 登入成功, 系統 SHALL 顯示客戶專屬介面

### Requirement 5: 客戶下單

**User Story:** AS 客戶, I want 選擇商品規格並下單, so that 完成代購訂購

#### Acceptance Criteria

1. WHEN 客戶已登入並選定商品規格, 系統 SHALL 建立訂單並記錄商品、規格、數量、售價、運費與總金額
2. WHEN 客戶下單, 系統 SHALL 要求填寫付款備註（如轉數快、PayPal、銀行過數）
3. WHEN 客戶下單, 系統 SHALL 使用其註冊時填寫之收貨地址與聯絡資料
4. WHEN 訂單建立成功, 系統 SHALL 顯示訂單確認資訊
5. WHEN 客戶查詢訂單, 系統 SHALL 顯示訂單狀態與明細
6. WHEN 訂單建立完成, 系統 SHALL 將訂單狀態設為「待確認」
7. WHEN 管理員核對客戶付款入帳, 系統 SHALL 允許管理員將訂單狀態更新為「已確認」

### Requirement 6: 後台管理

**User Story:** AS 管理員, I want 登入後台管理訂單與商品, so that 管理代購業務

#### Acceptance Criteria

1. WHEN 管理員輸入帳號 gary 及密碼 123123, 系統 SHALL 允許登入後台
2. WHEN 帳號或密碼錯誤, 系統 SHALL 拒絕登入並提示錯誤
3. WHEN 管理員登入後, 系統 SHALL 顯示訂單列表、客戶列表與商品列表
4. WHEN 管理員檢視訂單, 系統 SHALL 顯示訂單明細與客戶收貨資訊
5. WHEN 管理員更新訂單狀態, 系統 SHALL 保存並顯示最新狀態

### Requirement 7: 匯率與運費設定管理

**User Story:** AS 管理員, I want 檢視與維護匯率及運費費率, so that 系統設定與當日實際一致

#### Acceptance Criteria

1. WHEN 系統取得當日匯率, 系統 SHALL 自動更新匯率資料
2. WHEN 管理員檢視後台, 系統 SHALL 顯示當前匯率與運費費率
3. WHEN 管理員調整運費費率, 系統 SHALL 將新費率套用於後續訂單計算
