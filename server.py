import json
import hmac
import math
import os
import re
import sys
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
WORK_DIR = APP_DIR.parent
PYDEPS = WORK_DIR / "pydeps"
if PYDEPS.exists():
    sys.path.insert(0, str(PYDEPS))

try:
    import akshare as ak
except Exception:
    ak = None


CATALOG = [
    {
        "id": "QQQ",
        "symbol": "QQQ",
        "name": "Invesco QQQ Trust",
        "assetClass": "US Equity",
        "source": "yahoo",
        "currency": "USD",
        "hintStart": "1999-03-10",
        "keywords": "nasdaq 100 qqq 纳指 纳斯达克 科技",
    },
    {
        "id": "GLD",
        "symbol": "GLD",
        "name": "SPDR Gold Shares",
        "assetClass": "Gold",
        "source": "yahoo",
        "currency": "USD",
        "hintStart": "2004-11-18",
        "keywords": "gold gld 黄金",
    },
    {
        "id": "SPY",
        "symbol": "SPY",
        "name": "SPDR S&P 500 ETF",
        "assetClass": "US Equity",
        "source": "yahoo",
        "currency": "USD",
        "hintStart": "1993-01-29",
        "keywords": "s&p500 sp500 标普",
    },
    {
        "id": "TLT",
        "symbol": "TLT",
        "name": "iShares 20+ Year Treasury Bond ETF",
        "assetClass": "US Bond",
        "source": "yahoo",
        "currency": "USD",
        "hintStart": "2002-07-30",
        "keywords": "treasury long bond tlt 美债 长债",
    },
    {
        "id": "H30269",
        "symbol": "H30269",
        "name": "中证红利低波动指数",
        "assetClass": "China Equity",
        "source": "csindex",
        "currency": "CNY",
        "hintStart": "2006-01-04",
        "keywords": "红利低波 512890 dividend low volatility",
    },
    {
        "id": "000922",
        "symbol": "000922",
        "name": "中证红利指数",
        "assetClass": "China Equity",
        "source": "csindex",
        "currency": "CNY",
        "hintStart": "2005-01-04",
        "keywords": "中证红利 红利 dividend",
    },
    {
        "id": "000300",
        "symbol": "000300",
        "name": "沪深300指数",
        "assetClass": "China Equity",
        "source": "csindex",
        "currency": "CNY",
        "hintStart": "2002-01-04",
        "keywords": "沪深300 csi300 hs300",
    },
    {
        "id": "513100",
        "symbol": "513100",
        "name": "国泰纳斯达克100ETF 累计净值",
        "assetClass": "QDII Equity",
        "source": "fund_nav_accum",
        "currency": "CNY",
        "hintStart": "2013-04-25",
        "keywords": "513100 纳指 etf qdii qqq",
    },
    {
        "id": "512890",
        "symbol": "512890",
        "name": "红利低波ETF华泰柏瑞 累计净值",
        "assetClass": "China Equity ETF",
        "source": "fund_nav_accum",
        "currency": "CNY",
        "hintStart": "2018-12-19",
        "keywords": "512890 红利低波 etf",
    },
    {
        "id": "518880",
        "symbol": "sh518880",
        "name": "华安黄金ETF 场内收盘价",
        "assetClass": "Gold ETF",
        "source": "sina",
        "currency": "CNY",
        "hintStart": "2013-07-29",
        "keywords": "518880 黄金 etf",
    },
]

CATALOG_BY_ID = {item["id"]: item for item in CATALOG}
FUND_CATALOG_PATH = APP_DIR / "data" / "fund_catalog.json"
SERIES_CACHE = {}
SEARCH_CACHE = {}
OPTIMIZE_CACHE = {}
FUND_LIST_CACHE = None
FUND_LIST_LOADING = False
FUND_LIST_ERROR = None
FUND_START_CACHE = {}
YAHOO_SEARCH_DISABLED_UNTIL = 0
YAHOO_SEARCH_COOLDOWN_SECONDS = 5 * 60
BITCOIN_YAHOO_FALLBACKS = [
    {"symbol": "BTC-USD", "name": "Bitcoin USD", "assetClass": "CRYPTOCURRENCY", "currency": "USD"},
    {"symbol": "BTC=F", "name": "Bitcoin Futures", "assetClass": "FUTURE", "currency": "USD"},
    {"symbol": "GBTC", "name": "Grayscale Bitcoin Trust (BTC)", "assetClass": "ETF", "currency": "USD"},
    {"symbol": "BTC-EUR", "name": "Bitcoin EUR", "assetClass": "CRYPTOCURRENCY", "currency": "EUR"},
]
YAHOO_SYMBOL_FALLBACKS = {
    "btc": BITCOIN_YAHOO_FALLBACKS,
    "bitcoin": BITCOIN_YAHOO_FALLBACKS,
}
ACCESS_KEY_ENV = "ALLOCLAB_ACCESS_KEY"
KEY_HELP_URL_ENV = "ALLOCLAB_KEY_HELP_URL"
LEGACY_ACCESS_KEY_ENV = "PORTFOLIO_APP_ACCESS_KEY"
LEGACY_KEY_HELP_URL_ENV = "PORTFOLIO_APP_KEY_HELP_URL"
AUTH_WINDOW_SECONDS = 5 * 60
AUTH_MAX_ATTEMPTS = 10
AUTH_FAILURES = {}
AUTH_LOCKS = {}
AUTH_ERROR = {"error": "访问密钥无效或尝试次数过多"}


def log_event(event, **fields):
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    detail = " ".join(f"{key}={value}" for key, value in fields.items())
    print(f"[alloclab] {timestamp} {event} {detail}".rstrip(), flush=True)


def http_get_json(url, headers=None, timeout=30):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json,text/plain,*/*",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def fetch_yahoo_chart(symbol):
    end = int(time.time()) + 7 * 24 * 3600
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        + urllib.parse.quote(symbol)
        + f"?period1=0&period2={end}&interval=1d&events=history&includeAdjustedClose=true"
    )
    data = http_get_json(url)
    result = data["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quote = result["indicators"]["quote"][0]
    adj = result["indicators"].get("adjclose", [{}])[0].get("adjclose") or quote["close"]
    rows = []
    for ts, close in zip(timestamps, adj):
        if close is None:
            continue
        date = datetime.fromtimestamp(ts, timezone.utc).date().isoformat()
        rows.append({"date": date, "close": float(close)})
    return rows


def fetch_sina_us_daily(symbol):
    sina_symbol = symbol.upper().split(".")[0]
    callback_name = re.sub(r"[^a-z0-9_]", "_", sina_symbol.lower())
    url = (
        "https://stock.finance.sina.com.cn/usstock/api/jsonp.php/"
        + urllib.parse.quote(f"var {callback_name}=")
        + "/US_MinKService.getDailyK?"
        + urllib.parse.urlencode({"symbol": sina_symbol})
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    match = re.search(r"=\((.*)\);?\s*$", text, re.S)
    if not match:
        raise RuntimeError(f"Sina US daily data format changed: {sina_symbol}")
    data = json.loads(match.group(1))
    rows = []
    for row in data:
        date = row.get("d")
        close = row.get("c")
        if not date or close in (None, ""):
            continue
        close_value = float(close)
        if close_value > 0:
            rows.append({"date": date, "close": close_value})
    return sorted(rows, key=lambda item: item["date"])


def fetch_yahoo(symbol):
    try:
        return fetch_yahoo_chart(symbol)
    except Exception as yahoo_exc:
        try:
            rows = fetch_sina_us_daily(symbol)
            if rows:
                log_event("market.yahoo_fallback.sina_us", symbol=symbol, count=len(rows))
                return rows
        except Exception as sina_exc:
            log_event(
                "market.yahoo_fallback.sina_us_error",
                symbol=symbol,
                yahoo_error=type(yahoo_exc).__name__,
                sina_error=type(sina_exc).__name__,
            )
        raise yahoo_exc


def yahoo_search(query):
    if not query:
        return []
    key = query.lower().strip()
    if key in SEARCH_CACHE:
        return SEARCH_CACHE[key]
    url = (
        "https://query1.finance.yahoo.com/v1/finance/search?"
        + urllib.parse.urlencode({"q": query, "quotesCount": 12, "newsCount": 0})
    )
    data = http_get_json(url)
    items = []
    for quote in data.get("quotes", []):
        symbol = quote.get("symbol")
        if not symbol:
            continue
        quote_type = quote.get("quoteType") or quote.get("typeDisp") or "Yahoo"
        name = quote.get("shortname") or quote.get("longname") or symbol
        exchange = quote.get("exchDisp") or quote.get("exchange") or ""
        first_trade_ms = quote.get("firstTradeDateMilliseconds")
        hint_start = ""
        if first_trade_ms:
            hint_start = datetime.fromtimestamp(first_trade_ms / 1000, timezone.utc).date().isoformat()
        dynamic_id = f"Y:{symbol.upper()}"
        items.append(
            {
                "id": dynamic_id,
                "symbol": symbol,
                "name": name,
                "assetClass": quote_type,
                "source": "yahoo",
                "currency": quote.get("currency") or "",
                "hintStart": hint_start,
                "keywords": f"{symbol} {name} {exchange}",
                "exchange": exchange,
                "dynamic": True,
            }
        )
    SEARCH_CACHE[key] = items
    return items


def yahoo_search_available():
    return time.time() >= YAHOO_SEARCH_DISABLED_UNTIL


def record_yahoo_search_failure():
    global YAHOO_SEARCH_DISABLED_UNTIL
    YAHOO_SEARCH_DISABLED_UNTIL = time.time() + YAHOO_SEARCH_COOLDOWN_SECONDS


def looks_like_ticker_query(query):
    key = query.strip()
    return bool(re.fullmatch(r"[A-Za-z][A-Za-z0-9.\-]{0,9}", key))


def yahoo_symbol_fallback_candidates(query):
    key = query.strip().lower()
    if key in YAHOO_SYMBOL_FALLBACKS:
        return YAHOO_SYMBOL_FALLBACKS[key]
    if looks_like_ticker_query(query):
        symbol = query.strip().upper()
        return [{"symbol": symbol, "name": symbol, "assetClass": "Yahoo", "currency": ""}]
    return []


def yahoo_symbol_fallback_search(query):
    items = []
    for candidate in yahoo_symbol_fallback_candidates(query):
        symbol = candidate["symbol"].upper()
        asset_id = f"Y:{symbol}"
        try:
            hint = asset_start_hint(asset_id)
        except Exception as exc:
            log_event("search.symbol_fallback.error", query=query, symbol=symbol, error=type(exc).__name__)
            continue
        if not hint or not hint.get("hintStart") or hint.get("hintStart") == "不可用":
            continue
        items.append(
            {
                "id": asset_id,
                "symbol": symbol,
                "name": candidate.get("name") or symbol,
                "assetClass": candidate.get("assetClass") or hint.get("assetClass") or "Yahoo",
                "source": "yahoo",
                "currency": candidate.get("currency") or hint.get("currency") or "",
                "hintStart": hint.get("hintStart") or "",
                "lastDate": hint.get("lastDate") or "",
                "dataCount": int(hint.get("dataCount") or 0),
                "keywords": f"{symbol} {candidate.get('name') or ''}",
                "dynamic": True,
            }
        )
    return items


def append_search_items(items, existing, candidates, limit):
    for item in candidates:
        if item["id"] not in existing:
            items.append(item)
            existing.add(item["id"])
        if len(items) >= limit:
            break


def load_fund_catalog_seed():
    global FUND_LIST_CACHE, FUND_LIST_ERROR
    if FUND_LIST_CACHE is not None:
        return FUND_LIST_CACHE
    if not FUND_CATALOG_PATH.exists():
        return None
    started = time.time()
    try:
        rows = json.loads(FUND_CATALOG_PATH.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            raise ValueError("fund catalog seed must be a list")
        FUND_LIST_CACHE = [
            {
                "code": str(row.get("code", "")).strip(),
                "name": str(row.get("name", "")).strip(),
                "type": str(row.get("type", "")).strip(),
                "abbr": str(row.get("abbr", "")).strip(),
                "pinyin": str(row.get("pinyin", "")).strip(),
            }
            for row in rows
            if row.get("code") and row.get("name")
        ]
        FUND_LIST_ERROR = None
        log_event(
            "fund_catalog.seed_loaded",
            count=len(FUND_LIST_CACHE),
            elapsed_ms=int((time.time() - started) * 1000),
        )
        return FUND_LIST_CACHE
    except Exception as exc:
        FUND_LIST_ERROR = type(exc).__name__
        log_event(
            "fund_catalog.seed_error",
            error=type(exc).__name__,
            elapsed_ms=int((time.time() - started) * 1000),
        )
        return None


def fetch_fund_catalog_remote():
    if ak is None:
        return []
    started = time.time()
    df = ak.fund_name_em()
    rows = []
    for _, row in df.iterrows():
        code = str(row.get("基金代码", "")).strip()
        name = str(row.get("基金简称", "")).strip()
        if not code or not name:
            continue
        rows.append(
            {
                "code": code,
                "name": name,
                "type": str(row.get("基金类型", "")).strip(),
                "abbr": str(row.get("拼音缩写", "")).strip(),
                "pinyin": str(row.get("拼音全称", "")).strip(),
            }
        )
    log_event("fund_catalog.remote_fetched", count=len(rows), elapsed_ms=int((time.time() - started) * 1000))
    return rows


def fund_catalog():
    global FUND_LIST_CACHE, FUND_LIST_ERROR
    if FUND_LIST_CACHE is not None:
        return FUND_LIST_CACHE
    seed_rows = load_fund_catalog_seed()
    if seed_rows is not None:
        return seed_rows
    started = time.time()
    try:
        rows = fetch_fund_catalog_remote()
        FUND_LIST_CACHE = rows
        FUND_LIST_ERROR = None
        log_event("fund_catalog.loaded", count=len(rows), elapsed_ms=int((time.time() - started) * 1000))
    except Exception as exc:
        FUND_LIST_CACHE = []
        FUND_LIST_ERROR = type(exc).__name__
        log_event("fund_catalog.error", error=type(exc).__name__, elapsed_ms=int((time.time() - started) * 1000))
    return FUND_LIST_CACHE


def start_fund_catalog_load():
    global FUND_LIST_LOADING
    if FUND_LIST_LOADING:
        return
    load_fund_catalog_seed()
    if ak is None:
        return
    FUND_LIST_LOADING = True

    def load():
        global FUND_LIST_CACHE, FUND_LIST_ERROR, FUND_LIST_LOADING
        started = time.time()
        try:
            rows = fetch_fund_catalog_remote()
            if rows:
                FUND_LIST_CACHE = rows
                FUND_LIST_ERROR = None
            log_event(
                "fund_catalog.refresh_done",
                count=len(rows),
                elapsed_ms=int((time.time() - started) * 1000),
            )
        except Exception as exc:
            FUND_LIST_ERROR = type(exc).__name__
            log_event(
                "fund_catalog.refresh_error",
                error=type(exc).__name__,
                elapsed_ms=int((time.time() - started) * 1000),
            )
        finally:
            FUND_LIST_LOADING = False

    threading.Thread(target=load, name="fund-catalog-load", daemon=True).start()
    log_event("fund_catalog.loading")


def fund_catalog_if_ready():
    if FUND_LIST_CACHE is not None:
        return FUND_LIST_CACHE
    seed_rows = load_fund_catalog_seed()
    if seed_rows is not None:
        return seed_rows
    start_fund_catalog_load()
    return None


def fund_catalog_status():
    return {
        "ready": FUND_LIST_CACHE is not None,
        "loading": FUND_LIST_LOADING,
        "count": len(FUND_LIST_CACHE or []),
        "error": FUND_LIST_ERROR,
    }


def fetch_fund_start_date(code):
    if code in FUND_START_CACHE:
        return FUND_START_CACHE[code]
    try:
        first_page = http_get_json(
            "https://api.fund.eastmoney.com/f10/lsjz?"
            f"fundCode={code}&pageIndex=1&pageSize=1&startDate=&endDate=",
            headers={"Referer": "https://fundf10.eastmoney.com/"},
            timeout=15,
        )
        total = int(first_page.get("TotalCount") or 0)
        if total <= 1:
            rows = first_page.get("Data", {}).get("LSJZList", [])
            start = rows[0].get("FSRQ", "") if rows else ""
        else:
            last_page = http_get_json(
                "https://api.fund.eastmoney.com/f10/lsjz?"
                f"fundCode={code}&pageIndex={total}&pageSize=1&startDate=&endDate=",
                headers={"Referer": "https://fundf10.eastmoney.com/"},
                timeout=15,
            )
            rows = last_page.get("Data", {}).get("LSJZList", [])
            start = rows[0].get("FSRQ", "") if rows else ""
    except Exception:
        start = "不可用"
    FUND_START_CACHE[code] = start or "不可用"
    return FUND_START_CACHE[code]


def dynamic_fund_hint_start(code):
    return CATALOG_BY_ID.get(code, {}).get("hintStart") or "查询中"


def fund_start_hint(asset_id):
    if asset_id in CATALOG_BY_ID:
        return CATALOG_BY_ID[asset_id].get("hintStart", "") or "不可用"
    if asset_id.startswith("F:"):
        return fetch_fund_start_date(asset_id[2:])
    return ""


def fund_start_hints(asset_ids):
    hints = []
    normalized_ids = []
    seen = set()
    for asset_id in asset_ids:
        asset_id = str(asset_id or "").strip()
        if not asset_id or asset_id in seen:
            continue
        seen.add(asset_id)
        if asset_id in CATALOG_BY_ID or asset_id.startswith("F:"):
            normalized_ids.append(asset_id)
    if not normalized_ids:
        return hints
    with ThreadPoolExecutor(max_workers=min(6, len(normalized_ids))) as executor:
        futures = {executor.submit(fund_start_hint, asset_id): asset_id for asset_id in normalized_ids}
        for future in as_completed(futures):
            asset_id = futures[future]
            try:
                hint_start = future.result()
            except Exception:
                hint_start = "不可用"
            hints.append({"id": asset_id, "hintStart": hint_start or "不可用"})
    return hints


def asset_start_hint(asset_id):
    asset_id = str(asset_id or "").strip()
    if not asset_id:
        return None
    if asset_id in CATALOG_BY_ID:
        meta = CATALOG_BY_ID[asset_id]
        hint_start = meta.get("hintStart") or enrich_start(meta).get("hintStart")
        return {**meta, "hintStart": hint_start or "不可用"}
    if asset_id.startswith("F:"):
        hint_start = fetch_fund_start_date(asset_id[2:])
        meta = get_dynamic_fund_meta(asset_id) or {"id": asset_id}
        return {**meta, "hintStart": hint_start or "不可用"}
    if asset_id.startswith("Y:"):
        meta = get_dynamic_yahoo_meta(asset_id)
        return enrich_start(meta) if meta else None
    return None


def asset_start_hints(asset_ids):
    hints = []
    normalized_ids = []
    seen = set()
    for asset_id in asset_ids:
        asset_id = str(asset_id or "").strip()
        if not asset_id or asset_id in seen:
            continue
        seen.add(asset_id)
        if asset_id in CATALOG_BY_ID or asset_id.startswith(("F:", "Y:")):
            normalized_ids.append(asset_id)
    if not normalized_ids:
        return hints
    with ThreadPoolExecutor(max_workers=min(6, len(normalized_ids))) as executor:
        futures = {executor.submit(asset_start_hint, asset_id): asset_id for asset_id in normalized_ids}
        for future in as_completed(futures):
            asset_id = futures[future]
            try:
                hint = future.result()
            except Exception:
                hint = {"id": asset_id, "hintStart": "不可用"}
            if hint:
                hints.append(hint)
    return hints


def fund_search(query, limit=12):
    key = query.lower().strip()
    if not key:
        return []
    catalog = fund_catalog_if_ready()
    if catalog is None:
        if key.isdigit() and len(key) == 6:
            return [
                {
                    "id": key if key in CATALOG_BY_ID else f"F:{key}",
                    "symbol": key,
                    "name": f"{key} 累计净值",
                    "assetClass": "China Fund",
                    "source": "fund_nav_accum",
                    "currency": "CNY",
                    "hintStart": dynamic_fund_hint_start(key),
                    "keywords": key,
                    "dynamic": key not in CATALOG_BY_ID,
                }
            ]
        return []
    matched = []
    for row in catalog:
        haystack = f"{row['code']} {row['name']} {row['type']} {row['abbr']} {row['pinyin']}".lower()
        if key not in haystack:
            continue
        item_id = row["code"] if row["code"] in CATALOG_BY_ID else f"F:{row['code']}"
        matched.append(
            {
                "id": item_id,
                "symbol": row["code"],
                "name": f"{row['name']} 累计净值",
                "assetClass": row["type"] or "China Fund",
                "source": "fund_nav_accum",
                "currency": "CNY",
                "hintStart": dynamic_fund_hint_start(row["code"]),
                "keywords": f"{row['code']} {row['name']} {row['abbr']} {row['pinyin']}",
                "dynamic": item_id.startswith("F:"),
            }
        )
        if len(matched) >= limit:
            break
    return matched


def should_search_yahoo(query):
    return any("a" <= char <= "z" or "0" <= char <= "9" for char in query.lower())


def should_search_funds(query):
    key = query.strip().lower()
    if not key:
        return False
    if key.isdigit() and 2 <= len(key) <= 6:
        return True
    return any("\u4e00" <= char <= "\u9fff" for char in key)


def get_dynamic_yahoo_meta(asset_id):
    if not asset_id.startswith("Y:"):
        return None
    symbol = asset_id[2:]
    return {
        "id": asset_id,
        "symbol": symbol,
        "name": symbol,
        "assetClass": "Yahoo",
        "source": "yahoo",
        "currency": "",
        "hintStart": "",
        "keywords": symbol,
        "dynamic": True,
    }


def get_dynamic_fund_meta(asset_id):
    if not asset_id.startswith("F:"):
        return None
    code = asset_id[2:]
    info = next((row for row in fund_catalog() if row["code"] == code), None)
    name = f"{info['name']} 累计净值" if info else f"{code} 累计净值"
    asset_class = info["type"] if info else "China Fund"
    return {
        "id": asset_id,
        "symbol": code,
        "name": name,
        "assetClass": asset_class,
        "source": "fund_nav_accum",
        "currency": "CNY",
        "hintStart": "",
        "keywords": code,
        "dynamic": True,
    }


def get_asset_meta(asset_id):
    return CATALOG_BY_ID.get(asset_id) or get_dynamic_yahoo_meta(asset_id) or get_dynamic_fund_meta(asset_id)


def enrich_start(meta):
    try:
        rows = get_series(meta["id"])
        meta = dict(meta)
        meta["hintStart"] = rows[0]["date"] if rows else ""
        meta["lastDate"] = rows[-1]["date"] if rows else ""
        meta["dataCount"] = len(rows)
    except Exception:
        meta = dict(meta)
        meta["hintStart"] = "不可用"
        meta["dataCount"] = 0
    return meta


def fetch_csindex(symbol):
    if ak is None:
        raise RuntimeError("AKShare 不可用，请先安装到 work/pydeps。")
    df = ak.stock_zh_index_hist_csindex(
        symbol=symbol, start_date="20000101", end_date="20991231"
    )
    rows = []
    for _, row in df.iterrows():
        date = str(row["日期"])
        close = float(row["收盘"])
        if close > 0 and date >= "2000-01-01":
            rows.append({"date": date, "close": close})
    return sorted(rows, key=lambda item: item["date"])


def fetch_fund_nav(symbol, value_field="LJJZ"):
    rows = []
    prev_first = None
    for page in range(1, 500):
        url = (
            "https://api.fund.eastmoney.com/f10/lsjz?"
            f"fundCode={symbol}&pageIndex={page}&pageSize=20&startDate=&endDate="
        )
        data = http_get_json(url, headers={"Referer": "https://fundf10.eastmoney.com/"})
        page_rows = data.get("Data", {}).get("LSJZList", [])
        if not page_rows or page_rows[0].get("FSRQ") == prev_first:
            break
        prev_first = page_rows[0].get("FSRQ")
        rows.extend(page_rows)
        if len(page_rows) < 20:
            break

    out = []
    seen = set()
    for row in rows:
        date = row.get("FSRQ")
        raw = row.get(value_field)
        if not date or date in seen or raw in (None, ""):
            continue
        seen.add(date)
        value = float(raw)
        if value > 0:
            out.append({"date": date, "close": value})
    return sorted(out, key=lambda item: item["date"])


def fetch_sina(symbol):
    url = (
        "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/"
        f"CN_MarketData.getKLineData?symbol={symbol}&scale=240&ma=no&datalen=6000"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return sorted(
        {"date": row["day"], "close": float(row["close"])}
        for row in data
        if row.get("day") and float(row["close"]) > 0
    )


def get_series(asset_id):
    dynamic_meta = get_asset_meta(asset_id)
    if dynamic_meta is None:
        raise ValueError(f"未知标的：{asset_id}")
    if asset_id in SERIES_CACHE:
        return SERIES_CACHE[asset_id]

    meta = dynamic_meta
    source = meta["source"]
    if source == "yahoo":
        rows = fetch_yahoo(meta["symbol"])
    elif source == "csindex":
        rows = fetch_csindex(meta["symbol"])
    elif source == "fund_nav_accum":
        rows = fetch_fund_nav(meta["symbol"], "LJJZ")
    elif source == "sina":
        rows = fetch_sina(meta["symbol"])
    else:
        raise ValueError(f"暂不支持的数据源：{source}")

    if not rows:
        raise RuntimeError(f"没有获取到 {asset_id} 的行情数据")
    SERIES_CACHE[asset_id] = rows
    return rows


def pct_change(values):
    return [values[i] / values[i - 1] - 1 for i in range(1, len(values))]


def align_series(series_list, start=None, end=None):
    maps = [{row["date"]: row["close"] for row in series} for series in series_list]
    dates = sorted(set(maps[0]).intersection(*[set(m) for m in maps[1:]]))
    if start:
        dates = [date for date in dates if date >= start]
    if end:
        dates = [date for date in dates if date <= end]
    if len(dates) < 30:
        raise ValueError("所选标的或时间区间的重叠数据不足。")
    prices = [[m[date] for date in dates] for m in maps]
    return dates, prices


def max_drawdown(values):
    peak = values[0]
    peak_idx = 0
    max_dd = 0.0
    max_peak_idx = 0
    trough_idx = 0
    drawdowns = []
    for i, value in enumerate(values):
        if value > peak:
            peak = value
            peak_idx = i
        dd = value / peak - 1
        drawdowns.append(dd)
        if dd < max_dd:
            max_dd = dd
            max_peak_idx = peak_idx
            trough_idx = i
    return max_dd, max_peak_idx, trough_idx, drawdowns


def annualized_vol(values):
    returns = pct_change(values)
    if len(returns) < 2:
        return 0
    mean = sum(returns) / len(returns)
    var = sum((ret - mean) ** 2 for ret in returns) / (len(returns) - 1)
    return math.sqrt(var * 252)


def years_between(start, end):
    return (datetime.fromisoformat(end) - datetime.fromisoformat(start)).days / 365.25


def should_rebalance(mode, threshold, dates, t, target_weights, units, prices, value):
    if t == len(dates) - 1 or mode == "none":
        return False
    if mode == "monthly":
        return dates[t][:7] != dates[t + 1][:7]
    if mode == "quarterly":
        q = (int(dates[t][5:7]) - 1) // 3
        nq = (int(dates[t + 1][5:7]) - 1) // 3
        return dates[t][:4] != dates[t + 1][:4] or q != nq
    if mode == "annual":
        return dates[t][:4] != dates[t + 1][:4]
    if mode == "threshold":
        current_weights = [
            units[i] * prices[i][t] / value for i in range(len(target_weights))
        ]
        return any(
            abs(current_weights[i] - target_weights[i]) >= threshold
            for i in range(len(target_weights))
        )
    raise ValueError(f"未知再平衡模式：{mode}")


def compute_metrics(dates, nav, rebalances):
    total = nav[-1] / nav[0] - 1
    years = years_between(dates[0], dates[-1])
    cagr = nav[-1] ** (1 / years) - 1 if years > 0 else 0
    vol = annualized_vol(nav)
    mdd, peak_idx, trough_idx, drawdowns = max_drawdown(nav)
    returns = pct_change(nav)
    positive_days = sum(1 for ret in returns if ret > 0)
    best = max(returns) if returns else 0
    worst = min(returns) if returns else 0
    avg_day = sum(returns) / len(returns) if returns else 0
    ulcer = math.sqrt(sum(dd * dd for dd in drawdowns) / len(drawdowns))
    return {
        "start": dates[0],
        "end": dates[-1],
        "years": years,
        "totalReturn": total,
        "cagr": cagr,
        "volatility": vol,
        "maxDrawdown": mdd,
        "sharpe0": cagr / vol if vol else None,
        "calmar": cagr / abs(mdd) if mdd else None,
        "bestDay": best,
        "worstDay": worst,
        "avgDay": avg_day,
        "winRate": positive_days / len(returns) if returns else 0,
        "ulcerIndex": ulcer,
        "rebalanceCount": len(rebalances),
        "drawdownPeak": dates[peak_idx],
        "drawdownTrough": dates[trough_idx],
    }, drawdowns


def correlation_matrix(prices):
    returns = [pct_change(values) for values in prices]
    matrix = []
    for a in returns:
        row = []
        ma = sum(a) / len(a)
        va = sum((x - ma) ** 2 for x in a)
        for b in returns:
            mb = sum(b) / len(b)
            vb = sum((y - mb) ** 2 for y in b)
            cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
            row.append(cov / math.sqrt(va * vb) if va > 0 and vb > 0 else 0)
        matrix.append(row)
    return matrix


def simulate_portfolio(dates, prices, target_weights, rebalance, collect_details=True):
    if any(weight < 0 for weight in target_weights):
        raise ValueError("暂不支持做空权重。")
    if sum(target_weights) <= 0:
        raise ValueError("权重合计必须大于 0。")
    units = [target_weights[i] / prices[i][0] for i in range(len(target_weights))]
    cash = 1 - sum(target_weights)
    mode = rebalance.get("mode", "annual")
    threshold = float(rebalance.get("threshold", 0.10))
    nav = []
    rebalances = []
    weights_timeline = []

    for t, date in enumerate(dates):
        value = cash + sum(units[i] * prices[i][t] for i in range(len(target_weights)))
        if value <= 0:
            raise ValueError(f"组合净值在 {date} 跌至 0 或以下，请降低杠杆。")
        current_weights = [
            units[i] * prices[i][t] / value for i in range(len(target_weights))
        ]
        nav.append(value)
        if collect_details:
            weights_timeline.append(current_weights)
        if should_rebalance(mode, threshold, dates, t, target_weights, units, prices, value):
            event = {"date": date, "nav": value}
            if collect_details:
                event.update({"before": current_weights, "after": target_weights})
            rebalances.append(event)
            units = [value * target_weights[i] / prices[i][t] for i in range(len(target_weights))]
            cash = value * (1 - sum(target_weights))

    metrics, drawdowns = compute_metrics(dates, nav, rebalances)
    return metrics, drawdowns, nav, rebalances, weights_timeline


def backtest_portfolio(asset_ids, weights, rebalance, start=None, end=None):
    series_list = [get_series(asset_id) for asset_id in asset_ids]
    dates, prices = align_series(series_list, start, end)
    target_weights = [weight / 100 for weight in weights]
    metrics, drawdowns, nav, rebalances, weights_timeline = simulate_portfolio(
        dates, prices, target_weights, rebalance, collect_details=True
    )
    corr = correlation_matrix(prices)
    normalized_assets = [
        [price / asset_prices[0] for price in asset_prices] for asset_prices in prices
    ]
    asset_stats = []
    for asset_id, asset_prices, asset_nav in zip(asset_ids, prices, normalized_assets):
        asset_metrics, _ = compute_metrics(dates, asset_nav, [])
        meta = get_asset_meta(asset_id)
        asset_stats.append({"id": asset_id, "name": meta["name"], **asset_metrics})

    return {
        "assets": [
            {**get_asset_meta(asset_id), "weight": target_weights[i]}
            for i, asset_id in enumerate(asset_ids)
        ],
        "dates": dates,
        "nav": nav,
        "drawdowns": drawdowns,
        "weightsTimeline": weights_timeline,
        "rebalanceEvents": rebalances,
        "metrics": metrics,
        "correlation": corr,
        "assetSeries": normalized_assets,
        "assetStats": asset_stats,
    }


def generate_weight_grid(n, step=0.1, min_weight=0.0):
    units = round(1 / step)
    min_units = round(min_weight / step)
    current = []
    out = []

    def rec(remaining, slots):
        if slots == 1:
            if remaining >= min_units:
                out.append([(x * step) for x in current + [remaining]])
            return
        for value in range(min_units, remaining - min_units * (slots - 1) + 1):
            current.append(value)
            rec(remaining - value, slots - 1)
            current.pop()

    rec(units, n)
    return out


def optimize_portfolio(asset_ids, start=None, end=None):
    n = len(asset_ids)
    if n < 2:
        raise ValueError("至少选择两个标的才能优化。")
    cache_key = (tuple(asset_ids), start or "", end or "")
    if cache_key in OPTIMIZE_CACHE:
        return OPTIMIZE_CACHE[cache_key]
    series_list = [get_series(asset_id) for asset_id in asset_ids]
    dates, prices = align_series(series_list, start, end)
    step = 0.05 if n == 2 else 0.10
    grids = generate_weight_grid(n, step=step, min_weight=0.0)
    grids = [weights for weights in grids if all(weight <= 0.85 for weight in weights)]
    rules = [
        {"mode": "none", "threshold": 0.10, "label": "不再平衡"},
        {"mode": "annual", "threshold": 0.10, "label": "每年"},
        {"mode": "quarterly", "threshold": 0.10, "label": "每季"},
        {"mode": "threshold", "threshold": 0.08, "label": "8% 阈值"},
        {"mode": "threshold", "threshold": 0.10, "label": "10% 阈值"},
        {"mode": "threshold", "threshold": 0.15, "label": "15% 阈值"},
        {"mode": "threshold", "threshold": 0.20, "label": "20% 阈值"},
    ]
    candidates = []
    for weights in grids:
        if sum(1 for weight in weights if weight > 0) < 2:
            continue
        for rule in rules:
            try:
                metrics, _, _, _, _ = simulate_portfolio(
                    dates, prices, weights, rule, collect_details=False
                )
            except ValueError:
                continue
            candidates.append(
                {
                    "weights": weights,
                    "rebalance": rule,
                    "metrics": metrics,
                    "score": {
                        "sharpe0": metrics["sharpe0"] or -999,
                        "calmar": metrics["calmar"] or -999,
                        "cagr": metrics["cagr"],
                        "mdd": metrics["maxDrawdown"],
                        "vol": metrics["volatility"],
                    },
                }
            )

    selected = []

    def add_profile(kind, title, rows):
        for row in rows:
            key = (
                tuple(round(w, 4) for w in row["weights"]),
                row["rebalance"]["mode"],
                round(row["rebalance"].get("threshold", 0), 4),
            )
            if any(item["key"] == key for item in selected):
                continue
            selected.append({"key": key, "kind": kind, "title": title, **row})
            return

    add_profile(
        "sharpe",
        "风险调整后最佳",
        sorted(candidates, key=lambda c: (c["score"]["sharpe0"], c["score"]["cagr"]), reverse=True),
    )
    add_profile(
        "calmar",
        "回撤效率最佳",
        sorted(candidates, key=lambda c: (c["score"]["calmar"], c["score"]["cagr"]), reverse=True),
    )
    add_profile(
        "return",
        "年化收益最高",
        sorted(candidates, key=lambda c: c["score"]["cagr"], reverse=True),
    )
    for limit in [0.20, 0.30, 0.40]:
        filtered = [c for c in candidates if c["score"]["mdd"] >= -limit]
        add_profile(
            f"mdd{int(limit*100)}",
            f"最大回撤不超过 {int(limit*100)}% 的最高年化",
            sorted(filtered, key=lambda c: c["score"]["cagr"], reverse=True),
        )
    add_profile(
        "lowvol",
        "正收益下最低波动",
        sorted(
            [c for c in candidates if c["score"]["cagr"] > 0],
            key=lambda c: (c["score"]["vol"], -c["score"]["cagr"]),
        ),
    )

    for item in selected:
        item.pop("key", None)
    result = selected[:8]
    OPTIMIZE_CACHE[cache_key] = result
    return result


def json_response(handler, payload, status=200):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def access_key():
    return os.environ.get(ACCESS_KEY_ENV) or os.environ.get(LEGACY_ACCESS_KEY_ENV, "")


def auth_enabled():
    return bool(access_key())


def key_help_url():
    return os.environ.get(KEY_HELP_URL_ENV) or os.environ.get(LEGACY_KEY_HELP_URL_ENV, "")


def client_ip(handler):
    return handler.client_address[0]


def auth_locked(ip):
    now = time.time()
    lock_until = AUTH_LOCKS.get(ip, 0)
    if lock_until > now:
        return True
    if lock_until:
        AUTH_LOCKS.pop(ip, None)
        AUTH_FAILURES.pop(ip, None)
    return False


def record_auth_failure(ip):
    now = time.time()
    attempts = [ts for ts in AUTH_FAILURES.get(ip, []) if now - ts < AUTH_WINDOW_SECONDS]
    attempts.append(now)
    AUTH_FAILURES[ip] = attempts
    if len(attempts) >= AUTH_MAX_ATTEMPTS:
        AUTH_LOCKS[ip] = now + AUTH_WINDOW_SECONDS


def clear_auth_failures(ip):
    AUTH_FAILURES.pop(ip, None)
    AUTH_LOCKS.pop(ip, None)


def submitted_key(handler):
    header_key = handler.headers.get("X-Access-Key", "")
    if header_key:
        return header_key
    auth = handler.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


def valid_access_key(candidate):
    configured = access_key()
    return bool(configured) and hmac.compare_digest(candidate or "", configured)


def require_api_key(handler):
    if not auth_enabled():
        return True
    ip = client_ip(handler)
    if auth_locked(ip):
        json_response(handler, AUTH_ERROR, 401)
        return False
    if valid_access_key(submitted_key(handler)):
        return True
    record_auth_failure(ip)
    json_response(handler, AUTH_ERROR, 401)
    return False


def serve_index(handler):
    html = (APP_DIR / "index.html").read_text(encoding="utf-8")
    html = html.replace("__PORTFOLIO_KEY_HELP_URL__", json.dumps(key_help_url(), ensure_ascii=False))
    html = html.replace("__ALLOCLAB_AUTH_REQUIRED__", json.dumps(auth_enabled()))
    data = html.encode("utf-8")
    handler.send_response(200)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def log_message(self, format, *args):
        print(f"[server] {self.address_string()} - {format % args}")

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path in ("", "/", "/index.html"):
                serve_index(self)
                return
            if parsed.path.startswith("/api/") and not require_api_key(self):
                return
            if parsed.path == "/api/search":
                started = time.time()
                query = urllib.parse.parse_qs(parsed.query).get("q", [""])[0].lower().strip()
                log_event("search.start", query=query or "-", yahoo=should_search_yahoo(query), funds=should_search_funds(query))
                items = []
                for item in CATALOG:
                    haystack = " ".join(
                        [
                            item["id"],
                            item["symbol"],
                            item["name"],
                            item["assetClass"],
                            item.get("keywords", ""),
                        ]
                    ).lower()
                    if not query or query in haystack:
                        items.append({k: v for k, v in item.items() if k != "keywords"})
                log_event("search.local", query=query or "-", count=len(items), elapsed_ms=int((time.time() - started) * 1000))
                if query and should_search_yahoo(query):
                    existing = {item["id"] for item in items}
                    yahoo_started = time.time()
                    if not yahoo_search_available():
                        log_event(
                            "search.yahoo.skipped",
                            query=query,
                            reason="cooldown",
                            remaining_seconds=int(max(0, YAHOO_SEARCH_DISABLED_UNTIL - time.time())),
                        )
                        yahoo_items = yahoo_symbol_fallback_search(query)
                    else:
                        try:
                            yahoo_items = yahoo_search(query)
                            log_event(
                                "search.yahoo.done",
                                query=query,
                                count=len(yahoo_items),
                                elapsed_ms=int((time.time() - yahoo_started) * 1000),
                            )
                        except Exception as exc:
                            record_yahoo_search_failure()
                            log_event(
                                "search.yahoo.error",
                                query=query,
                                error=type(exc).__name__,
                                cooldown_seconds=YAHOO_SEARCH_COOLDOWN_SECONDS,
                                elapsed_ms=int((time.time() - yahoo_started) * 1000),
                            )
                            yahoo_items = yahoo_symbol_fallback_search(query)
                    if yahoo_items:
                        append_search_items(items, existing, yahoo_items, 18)
                if query and should_search_funds(query):
                    existing = {item["id"] for item in items}
                    fund_started = time.time()
                    try:
                        fund_ready = FUND_LIST_CACHE is not None
                        fund_items = fund_search(query)
                        log_event(
                            "search.fund.done",
                            query=query,
                            count=len(fund_items),
                            ready=fund_ready,
                            loading=FUND_LIST_LOADING,
                            elapsed_ms=int((time.time() - fund_started) * 1000),
                        )
                    except Exception as exc:
                        log_event(
                            "search.fund.error",
                            query=query,
                            error=type(exc).__name__,
                            elapsed_ms=int((time.time() - fund_started) * 1000),
                        )
                        fund_items = []
                    for item in fund_items:
                        if item["id"] not in existing:
                            items.append(item)
                            existing.add(item["id"])
                        if len(items) >= 24:
                            break
                log_event("search.done", query=query or "-", count=len(items), elapsed_ms=int((time.time() - started) * 1000))
                json_response(
                    self,
                    {
                        "items": [{k: v for k, v in item.items() if k != "keywords"} for item in items],
                        "fundCatalog": fund_catalog_status(),
                    },
                )
                return
            if parsed.path == "/api/catalog":
                json_response(self, {"items": [{k: v for k, v in item.items() if k != "keywords"} for item in CATALOG]})
                return
            if parsed.path == "/api/fund-catalog-status":
                json_response(self, fund_catalog_status())
                return
            super().do_GET()
        except ValueError as exc:
            json_response(self, {"error": str(exc)}, 400)
        except Exception as exc:
            json_response(self, {"error": str(exc)}, 500)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            if self.path == "/api/verify-key":
                if not auth_enabled():
                    json_response(self, {"ok": True, "keyHelpUrl": key_help_url(), "authRequired": False})
                    return
                ip = client_ip(self)
                if auth_locked(ip):
                    json_response(self, AUTH_ERROR, 401)
                    return
                if valid_access_key(str(payload.get("key", ""))):
                    clear_auth_failures(ip)
                    json_response(self, {"ok": True, "keyHelpUrl": key_help_url()})
                    return
                record_auth_failure(ip)
                json_response(self, AUTH_ERROR, 401)
                return
            if self.path.startswith("/api/") and not require_api_key(self):
                return
            if self.path == "/api/backtest":
                assets = payload.get("assets", [])
                asset_ids = [item["id"] for item in assets]
                weights = [float(item.get("weight", 0)) for item in assets]
                result = backtest_portfolio(
                    asset_ids,
                    weights,
                    payload.get("rebalance", {"mode": "annual", "threshold": 0.10}),
                    payload.get("start") or None,
                    payload.get("end") or None,
                )
                json_response(self, result)
                return
            if self.path == "/api/fund-start-hints":
                asset_ids = payload.get("assetIds", [])
                if not isinstance(asset_ids, list):
                    json_response(self, {"error": "assetIds 必须是数组"}, 400)
                    return
                json_response(self, {"items": fund_start_hints(asset_ids)})
                return
            if self.path == "/api/asset-start-hints":
                asset_ids = payload.get("assetIds", [])
                if not isinstance(asset_ids, list):
                    json_response(self, {"error": "assetIds 必须是数组"}, 400)
                    return
                json_response(self, {"items": asset_start_hints(asset_ids)})
                return
            if self.path == "/api/optimize":
                assets = payload.get("assets", [])
                asset_ids = [item["id"] for item in assets]
                result = optimize_portfolio(
                    asset_ids,
                    payload.get("start") or None,
                    payload.get("end") or None,
                )
                json_response(self, {"profiles": result})
                return
            json_response(self, {"error": "未知接口"}, 404)
        except ValueError as exc:
            json_response(self, {"error": str(exc)}, 400)
        except Exception as exc:
            json_response(self, {"error": str(exc)}, 500)


def main():
    host = os.environ.get("ALLOCLAB_HOST") or os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("ALLOCLAB_PORT") or os.environ.get("PORT", "8765"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    start_fund_catalog_load()
    display_host = "127.0.0.1" if host == "0.0.0.0" else host
    print(f"AllocLab running at http://{display_host}:{port} (bind {host}:{port})")
    server.serve_forever()


if __name__ == "__main__":
    main()
