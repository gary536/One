import { DEFAULT_WEIGHT_KG } from '../config.js';

const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

export function parseGoodsId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const qs = trimmed.split(/[?#]/)[1] || '';
  const params = new URLSearchParams(qs);
  const id = params.get('goods_id') || params.get('goodsId') || params.get('goodsid');
  if (id && /^\d+$/.test(id)) return id;
  const pathMatch = trimmed.match(/(?:goods|goods2)\.html\/(\d{6,})/);
  if (pathMatch) return pathMatch[1];
  const rawMatch = trimmed.match(/goods_?id[=:](\d{6,})/i);
  return rawMatch ? rawMatch[1] : null;
}

export function isPddDomain(url) {
  if (!url || typeof url !== 'string') return false;
  return /pinduoduo\.com|yangkeduo\.com|pdd\.com/i.test(url);
}

export async function resolveRedirect(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' },
    });
    await res.arrayBuffer();
    return res.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveGoodsId(url) {
  const direct = parseGoodsId(url);
  if (direct) return { goodsId: direct, resolvedUrl: url };
  if (!isPddDomain(url)) return { goodsId: null, resolvedUrl: url };
  const finalUrl = await resolveRedirect(url);
  return { goodsId: parseGoodsId(finalUrl), resolvedUrl: finalUrl };
}

export function extractJsonObject(text, startIndex) {
  const start = text.indexOf('{', startIndex);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

export function extractRawData(html) {
  const marker = html.indexOf('window.rawData');
  if (marker === -1) return null;
  const raw = extractJsonObject(html, marker);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toCny(priceInFen) {
  const n = Number(priceInFen);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n) / 100;
}

function normalizeImageUrl(url) {
  if (!url) return null;
  let u = url;
  if (u.startsWith('//')) u = `https:${u}`;
  return u;
}

function extractWeight(rawData) {
  const candidates = [
    rawData?.goods?.weight,
    rawData?.goods?.goodsWeight,
    rawData?.goods?.weightText,
    rawData?.goods?.detail?.weight,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    const text = String(c);
    const m = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|千克|公斤)/i);
    if (m) return parseFloat(m[1]);
    const pure = parseFloat(text);
    if (Number.isFinite(pure) && pure > 0 && pure < 10000) return pure;
  }
  return DEFAULT_WEIGHT_KG;
}

export function parseProductData(rawData) {
  const goods = rawData?.goods || rawData?.data?.goods || {};
  const name = goods.goodsName || goods.goods_name || rawData?.share?.goodsName || '';
  const minGroupPrice = toCny(goods.minGroupPrice ?? goods.min_group_price ?? goods.minOnSaleGroupPrice ?? goods.minOnSaleGroupPriceFen ?? goods.price);
  const minNormalPrice = toCny(goods.minNormalPrice ?? goods.min_normal_price ?? goods.maxNormalPrice ?? goods.normalPrice);

  if (!name || (minGroupPrice == null && minNormalPrice == null)) {
    throw new Error('無法從商品頁提取商品資料');
  }

  const priceCny = minGroupPrice ?? minNormalPrice;

  const topGallery = goods.topGallery || goods.top_gallery || [];
  const images = (Array.isArray(topGallery) ? topGallery : [])
    .map((item) => normalizeImageUrl(item?.url || item?.imageUrl || item))
    .filter(Boolean);

  const skus = Array.isArray(goods.skus) ? goods.skus : [];
  const rawSpecs = Array.isArray(goods.specs) ? goods.specs : [];
  const specs = [];
  if (rawSpecs.length > 0) {
    for (const s of rawSpecs) {
      const values = Array.isArray(s.values) ? s.values : [];
      const options = values.map((v) => v?.value || v?.spec_value_name || String(v)).filter(Boolean);
      if (s.spec_name && options.length > 0) {
        specs.push({ name: s.spec_name, options });
      }
    }
  }
  if (specs.length === 0 && skus.length > 0) {
    const map = new Map();
    for (const sku of skus) {
      const spec = sku.spec || sku.spec_name || '規格';
      const ov = sku.ov || sku.spec_value || sku.spec_key || '默認';
      if (!map.has(spec)) map.set(spec, new Set());
      map.get(spec).add(String(ov));
    }
    for (const [name, set] of map) {
      specs.push({ name, options: [...set] });
    }
  }

  const weightKg = extractWeight(rawData);

  return {
    goodsId: String(goods.goodsID || goods.goods_id || rawData?.goodsId || ''),
    name,
    priceCny,
    images,
    specs,
    weightKg,
  };
}

function isRiskControlPage(html) {
  if (html.length < 2000) return true;
  if (html.includes('__ac_nonce') || html.includes('ac_seed') || html.includes('captcha')) return true;
  if (html.includes('安全验证') || html.includes('点选验证') || html.includes('拖动滑块')) return true;
  return false;
}

export async function fetchProductPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });
    if (!res.ok) throw new Error(`拼多多回應 ${res.status}`);
    const html = await res.text();
    const finalUrl = res.url || url;
    if (isRiskControlPage(html)) {
      throw new Error('拼多多觸發風控驗證，請稍後重試');
    }
    if (html.includes('needLogin') && /"needLogin":\s*true/.test(html)) {
      throw new Error('此商品需要登入拼多多才能查看，請換其他商品鏈結');
    }
    return { html, finalUrl };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProduct(url) {
  const { html, finalUrl } = await fetchProductPage(url);
  const rawData = extractRawData(html);
  if (!rawData) throw new Error('無法解析商品頁資料');
  const product = parseProductData(rawData);
  const resolvedUrl = finalUrl || url;
  const goodsId = product.goodsId || parseGoodsId(resolvedUrl);
  return { ...product, goodsId, pddUrl: resolvedUrl };
}
