import { describe, it, expect, vi } from 'vitest';
import {
  parseGoodsId,
  extractRawData,
  parseProductData,
  extractJsonObject,
  isPddDomain,
  resolveGoodsId,
} from '../src/services/pdd.js';

describe('parseGoodsId', () => {
  it('從 mobile.yangkeduo.com 鏈結提取 goods_id', () => {
    expect(parseGoodsId('https://mobile.yangkeduo.com/goods.html?goods_id=123456789')).toBe('123456789');
  });

  it('從 www.yangkeduo.com 鏈結提取 goods_id', () => {
    expect(parseGoodsId('https://www.yangkeduo.com/goods2.html?goods_id=987654321&refer_share_uin=abc')).toBe('987654321');
  });

  it('從分享鏈結提取 goods_id', () => {
    const url =
      'https://mobile.yangkeduo.com/goods1.html?refer_share_uin=ABC&refer_share_id=xyz&page_from=31&goods_id=555666777888&_oak_share_detail_id=123';
    expect(parseGoodsId(url)).toBe('555666777888');
  });

  it('無效鏈結返回 null', () => {
    expect(parseGoodsId('https://example.com/foo')).toBeNull();
    expect(parseGoodsId('')).toBeNull();
    expect(parseGoodsId(null)).toBeNull();
  });
});

describe('isPddDomain', () => {
  it('識別拼多多相關域名', () => {
    expect(isPddDomain('https://p.pinduoduo.com/abc')).toBe(true);
    expect(isPddDomain('https://mobile.yangkeduo.com/goods.html')).toBe(true);
    expect(isPddDomain('https://example.com')).toBe(false);
  });
});

describe('resolveGoodsId', () => {
  it('短鏈結透過重定向解析 goods_id', async () => {
    global.fetch = vi.fn(async () => ({
      url: 'https://mobile.yangkeduo.com/goods.html?goods_id=888999000111',
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    const { goodsId, resolvedUrl } = await resolveGoodsId('https://p.pinduoduo.com/abc123');
    expect(goodsId).toBe('888999000111');
    expect(resolvedUrl).toContain('goods_id=888999000111');
  });

  it('無 goods_id 的非拼多多鏈結返回 null', async () => {
    const { goodsId } = await resolveGoodsId('https://example.com/foo');
    expect(goodsId).toBeNull();
  });

  it('直接含 goods_id 的鏈結不需重定向', async () => {
    const { goodsId, resolvedUrl } = await resolveGoodsId('https://mobile.yangkeduo.com/goods.html?goods_id=111222333');
    expect(goodsId).toBe('111222333');
    expect(resolvedUrl).toContain('goods_id=111222333');
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
