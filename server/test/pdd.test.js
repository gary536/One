import { describe, it, expect } from 'vitest';
import { parseGoodsId, extractRawData, parseProductData, extractJsonObject } from '../src/services/pdd.js';

describe('parseGoodsId', () => {
  it('從 mobile.yangkeduo.com 鏈結提取 goods_id', () => {
    expect(parseGoodsId('https://mobile.yangkeduo.com/goods.html?goods_id=123456789')).toBe('123456789');
  });

  it('從 www.yangkeduo.com 鏈結提取 goods_id', () => {
    expect(parseGoodsId('https://www.yangkeduo.com/goods2.html?goods_id=987654321&refer_share_uin=abc')).toBe('987654321');
  });

  it('無效鏈結返回 null', () => {
    expect(parseGoodsId('https://example.com/foo')).toBeNull();
    expect(parseGoodsId('')).toBeNull();
    expect(parseGoodsId(null)).toBeNull();
  });
});

const sampleHtml = `
<!DOCTYPE html>
<html>
<head><title>商品</title></head>
<body>
<script>
window.rawData = {
  "goods": {
    "goodsID": "123456789",
    "goodsName": "測試無線耳機",
    "minGroupPrice": 1990,
    "minNormalPrice": 2590,
    "topGallery": [{"url": "//img.pddpic.com/a.jpg"}, {"url": "https://img.pddpic.com/b.jpg"}],
    "specs": [
      {"spec_name": "顏色", "values": [{"value": "白色"}, {"value": "黑色"}]}
    ],
    "skus": [
      {"spec": "顏色", "ov": "白色", "groupPrice": 1990},
      {"spec": "顏色", "ov": "黑色", "groupPrice": 1990}
    ],
    "weight": "2.5kg"
  }
};
</script>
</body>
</html>
`;

describe('extractRawData', () => {
  it('從頁面 HTML 提取 window.rawData JSON', () => {
    const data = extractRawData(sampleHtml);
    expect(data).not.toBeNull();
    expect(data.goods.goodsName).toBe('測試無線耳機');
  });

  it('頁面不含 rawData 返回 null', () => {
    expect(extractRawData('<html><body>hello</body></html>')).toBeNull();
  });

  it('extractJsonObject 處理字串中的花括號', () => {
    const text = 'data = {"name": "a{b}c", "nested": {"x": 1}};';
    const json = extractJsonObject(text, 0);
    expect(JSON.parse(json)).toEqual({ name: 'a{b}c', nested: { x: 1 } });
  });
});

describe('parseProductData', () => {
  it('提取名稱、價格(分轉元)、圖片、規格與重量', () => {
    const raw = extractRawData(sampleHtml);
    const p = parseProductData(raw);
    expect(p.name).toBe('測試無線耳機');
    expect(p.priceCny).toBe(19.9);
    expect(p.images).toEqual(['https://img.pddpic.com/a.jpg', 'https://img.pddpic.com/b.jpg']);
    expect(p.specs).toEqual([{ name: '顏色', options: ['白色', '黑色'] }]);
    expect(p.weightKg).toBe(2.5);
  });

  it('無重量資訊時預設 1kg', () => {
    const raw = {
      goods: { goodsID: '1', goodsName: '無重量商品', minGroupPrice: 1000 },
    };
    const p = parseProductData(raw);
    expect(p.weightKg).toBe(1);
  });

  it('多組規格時保留全部規格', () => {
    const raw = {
      goods: {
        goodsID: '2',
        goodsName: '多規格',
        minGroupPrice: 5000,
        specs: [
          { spec_name: '顏色', values: [{ value: '紅' }, { value: '藍' }] },
          { spec_name: '尺寸', values: [{ value: 'M' }, { value: 'L' }] },
        ],
      },
    };
    const p = parseProductData(raw);
    expect(p.specs).toHaveLength(2);
    expect(p.specs[1]).toEqual({ name: '尺寸', options: ['M', 'L'] });
  });

  it('缺少商品資料時拋錯', () => {
    expect(() => parseProductData({})).toThrow();
  });
});
