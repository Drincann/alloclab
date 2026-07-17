import json
import csv
import hashlib
import hmac
import http.cookiejar
import math
import os
import re
import secrets
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import multiprocessing
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import NamedTemporaryFile


APP_DIR = Path(__file__).resolve().parent
WORK_DIR = APP_DIR.parent
PYDEPS = WORK_DIR / "pydeps"
if PYDEPS.exists():
    sys.path.insert(0, str(PYDEPS))

ak = None
AKSHARE_IMPORT_ATTEMPTED = False
AKSHARE_IMPORT_LOCK = threading.Lock()


def get_akshare():
    global ak, AKSHARE_IMPORT_ATTEMPTED
    if AKSHARE_IMPORT_ATTEMPTED:
        return ak
    with AKSHARE_IMPORT_LOCK:
        if AKSHARE_IMPORT_ATTEMPTED:
            return ak
        try:
            import akshare as imported_akshare

            ak = imported_akshare
        except Exception:
            ak = None
        AKSHARE_IMPORT_ATTEMPTED = True
    return ak


try:
    import numpy as np
except Exception:
    np = None


CATALOG = [
    {
        "id": "QQQ",
        "symbol": "QQQ",
        "name": "Invesco QQQ Trust",
        "assetClass": "US Equity",
        "source": "yahoo",
        "symbols": {
            "yahoo_chart": "QQQ",
            "stooq": "qqq.us",
            "eastmoney_us": ["105.QQQ", "106.QQQ"],
            "sina_us": "QQQ",
        },
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
        "symbols": {
            "yahoo_chart": "GLD",
            "stooq": "gld.us",
            "eastmoney_us": ["106.GLD", "105.GLD"],
            "sina_us": "GLD",
        },
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
        "symbols": {
            "yahoo_chart": "SPY",
            "stooq": "spy.us",
            "eastmoney_us": ["106.SPY", "105.SPY"],
            "sina_us": "SPY",
        },
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
        "symbols": {
            "yahoo_chart": "TLT",
            "stooq": "tlt.us",
            "eastmoney_us": ["106.TLT", "105.TLT"],
            "sina_us": "TLT",
        },
        "currency": "USD",
        "hintStart": "2002-07-30",
        "keywords": "treasury long bond tlt 美债 长债",
    },
    {
        "id": "CASH",
        "symbol": "CASH",
        "name": "Synthetic cash (0% return)",
        "assetClass": "Cash",
        "source": "cash",
        "currency": "USD",
        "hintStart": "1900-01-01",
        "keywords": "cash usd money market 现金 美元现金 0收益",
    },
    {
        "id": "CNYCASH",
        "symbol": "CNYCASH",
        "name": "合成现金（0收益）",
        "assetClass": "Cash",
        "source": "cash",
        "currency": "CNY",
        "hintStart": "1900-01-01",
        "keywords": "cash cny money market 现金 人民币现金 0收益",
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
SHARE_DIR = APP_DIR / "data" / "shares"
MARKET_CACHE_DIR = APP_DIR / "data" / "market_cache"
SEARCH_CACHE = {}
OPTIMIZE_CACHE = {}
OPTIMIZE_WORKER_STATE = None
FUND_LIST_CACHE = None
FUND_LIST_LOADING = False
FUND_LIST_ERROR = None
FUND_PROFILE_CACHE = {}
PROVIDER_MEMORY_CACHE = {}
PROVIDER_CACHE_LOCK = threading.Lock()
SCAN_WORKERS_ENV = "ALLOCLAB_SCAN_WORKERS"
SCAN_ENGINE_ENV = "ALLOCLAB_SCAN_ENGINE"
SCAN_BATCH_SIZE_ENV = "ALLOCLAB_SCAN_BATCH_SIZE"
MIN_PARALLEL_SCAN_EVALUATIONS = 2000
MIN_NUMPY_WORK_PER_PROCESS = 20_000_000
YAHOO_SEARCH_DISABLED_UNTIL = 0
YAHOO_SEARCH_COOLDOWN_SECONDS = 5 * 60
MIN_BACKTEST_DAYS = 30
DATA_UNAVAILABLE_HINT = "不可用"
DATA_UNAVAILABLE_REASON = "行情不可用"
INSUFFICIENT_DATA_REASON = "数据不足"
MAX_MARKET_START_DRIFT_DAYS = 365 * 2
MAX_SERIES_GAP_DAYS = 21
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
STOOQ_API_KEY_ENV = "ALLOCLAB_STOOQ_API_KEY"
LEGACY_ACCESS_KEY_ENV = "PORTFOLIO_APP_ACCESS_KEY"
LEGACY_KEY_HELP_URL_ENV = "PORTFOLIO_APP_KEY_HELP_URL"
AUTH_WINDOW_SECONDS = 5 * 60
AUTH_MAX_ATTEMPTS = 10
AUTH_FAILURES = {}
AUTH_LOCKS = {}
AUTH_ERROR = {"error": "访问密钥无效或尝试次数过多"}


class MarketDataUnavailable(RuntimeError):
    def __init__(self, asset_id, status="", detail=""):
        self.asset_id = asset_id
        self.status = str(status or "")
        self.detail = detail
        message = (
            f"{asset_id} 行情源在当前服务器环境不可用。Yahoo 返回"
            f"{' HTTP ' + self.status if self.status else '错误'}，备用源不可用或数据不完整。"
            "请稍后重试，或为服务器配置稳定行情源/代理。"
        )
        super().__init__(message)


def log_event(event, **fields):
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    detail = " ".join(f"{key}={value}" for key, value in fields.items())
    print(f"[alloclab] {timestamp} {event} {detail}".rstrip(), flush=True)


def http_error_status(exc):
    return getattr(exc, "code", "") if isinstance(exc, urllib.error.HTTPError) else ""


def market_cache_today():
    return datetime.now(timezone.utc).date().isoformat()


def market_cache_symbol_key(symbol):
    key = re.sub(r"[^A-Za-z0-9._=-]+", "_", str(symbol).strip().lower())
    return key or "unknown"


def market_cache_path(source, symbol):
    return MARKET_CACHE_DIR / source / f"{market_cache_symbol_key(symbol)}.json"


def normalize_market_rows(rows):
    out = []
    seen = set()
    for row in rows or []:
        date = str(row.get("date") or "").strip()
        if not date or date in seen:
            continue
        try:
            close = float(row.get("close"))
        except Exception:
            continue
        if close <= 0 or not math.isfinite(close):
            continue
        seen.add(date)
        out.append({"date": date, "close": close})
    return sorted(out, key=lambda item: item["date"])


def read_provider_cache(source, symbol, allow_stale=False):
    cache_key = (source, market_cache_symbol_key(symbol))
    today = market_cache_today()
    with PROVIDER_CACHE_LOCK:
        cached = PROVIDER_MEMORY_CACHE.get(cache_key)
        if cached and cached.get("rows") and (allow_stale or cached.get("cacheDate") == today):
            return [dict(row) for row in cached["rows"]]

    path = market_cache_path(source, symbol)
    try:
        with path.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
    except FileNotFoundError:
        return None
    except Exception as exc:
        log_event("market.cache.read_error", source=source, symbol=symbol, error=type(exc).__name__)
        return None

    rows = normalize_market_rows(payload.get("rows") or [])
    if not rows or (payload.get("cacheDate") != today and not allow_stale):
        return None
    with PROVIDER_CACHE_LOCK:
        PROVIDER_MEMORY_CACHE[cache_key] = {"cacheDate": payload.get("cacheDate") or "", "rows": rows}
    log_event(
        "market.cache.hit" if payload.get("cacheDate") == today else "market.cache.stale_hit",
        source=source,
        symbol=symbol,
        count=len(rows),
        cache_date=payload.get("cacheDate") or "",
    )
    return [dict(row) for row in rows]


def write_provider_cache(source, symbol, rows):
    rows = normalize_market_rows(rows)
    if not rows:
        return rows
    cache_key = (source, market_cache_symbol_key(symbol))
    payload = {
        "source": source,
        "symbol": symbol,
        "cacheDate": market_cache_today(),
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rows": rows,
    }
    path = market_cache_path(source, symbol)
    tmp_path = None
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile("w", encoding="utf-8", dir=str(path.parent), delete=False) as tmp:
            json.dump(payload, tmp, ensure_ascii=False, separators=(",", ":"))
            tmp_path = Path(tmp.name)
        tmp_path.replace(path)
    except Exception as exc:
        log_event("market.cache.write_error", source=source, symbol=symbol, error=type(exc).__name__)
        if tmp_path:
            try:
                tmp_path.unlink(missing_ok=True)
            except Exception:
                pass
    with PROVIDER_CACHE_LOCK:
        PROVIDER_MEMORY_CACHE[cache_key] = {"cacheDate": payload["cacheDate"], "rows": rows}
    return [dict(row) for row in rows]


def cached_provider_fetch(source, symbol, fetcher):
    cached = read_provider_cache(source, symbol)
    if cached is not None:
        return cached
    try:
        rows = write_provider_cache(source, symbol, fetcher(symbol))
    except Exception:
        stale = read_provider_cache(source, symbol, allow_stale=True)
        if stale is not None:
            log_event("market.cache.stale_fallback", source=source, symbol=symbol, count=len(stale))
            return stale
        raise
    log_event("market.cache.refresh", source=source, symbol=symbol, count=len(rows))
    return rows


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


def fetch_yahoo_chart_uncached(symbol):
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


def fetch_yahoo_chart(symbol):
    return cached_provider_fetch("yahoo_chart", symbol, fetch_yahoo_chart_uncached)


def fetch_sina_us_daily_uncached(symbol):
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


def fetch_sina_us_daily(symbol):
    return cached_provider_fetch("sina_us", symbol, fetch_sina_us_daily_uncached)


def fetch_eastmoney_us_daily_uncached(symbol):
    raw_symbol = str(symbol or "").upper().strip()
    normalized_symbol = raw_symbol.split(".")[-1]
    hosts = ["https://63.push2his.eastmoney.com", "https://push2his.eastmoney.com"]
    if re.match(r"^(105|106)\.[A-Z0-9.-]+$", raw_symbol):
        secids = [raw_symbol]
    else:
        # Legacy callers may still pass a bare US ticker. Provider mapping code should pass secids.
        secids = [f"105.{normalized_symbol}", f"106.{normalized_symbol}"]
    last_error = None
    for host in hosts:
        for secid in secids:
            params = urllib.parse.urlencode(
                {
                    "secid": secid,
                    "fields1": "f1,f2,f3,f4,f5,f6",
                    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
                    "klt": "101",
                    "fqt": "1",
                    "beg": "19900101",
                    "end": "20500000",
                    "lmt": "1000000",
                }
            )
            url = f"{host}/api/qt/stock/kline/get?{params}"
            try:
                data = http_get_json(
                    url,
                    headers={
                        "Referer": "https://quote.eastmoney.com/",
                        "Origin": "https://quote.eastmoney.com",
                    },
                    timeout=30,
                )
                klines = (data.get("data") or {}).get("klines") or []
                rows = []
                for line in klines:
                    parts = str(line).split(",")
                    if len(parts) < 3:
                        continue
                    date = parts[0]
                    close = float(parts[2])
                    if close > 0:
                        rows.append({"date": date, "close": close})
                if rows:
                    return sorted(rows, key=lambda item: item["date"])
            except Exception as exc:
                last_error = exc
    if last_error:
        raise last_error
    raise RuntimeError(f"Eastmoney US daily data unavailable: {normalized_symbol}")


def fetch_eastmoney_us_daily(symbol):
    return cached_provider_fetch("eastmoney_us", symbol, fetch_eastmoney_us_daily_uncached)


def stooq_symbol(symbol):
    raw = symbol.upper().strip()
    if "." in raw:
        return raw.lower()
    if re.match(r"^[A-Z][A-Z0-9.-]*$", raw):
        return f"{raw.lower()}.us"
    return raw.lower()


def as_symbol_list(value):
    if value in (None, ""):
        return []
    if isinstance(value, (list, tuple)):
        return [str(item).strip() for item in value if str(item).strip()]
    return [str(value).strip()]


def is_plain_us_yahoo_symbol(symbol):
    return bool(re.match(r"^[A-Z]{1,5}$", str(symbol or "").upper().strip()))


def provider_symbols(meta, provider):
    symbols = meta.get("symbols") or {}
    explicit = as_symbol_list(symbols.get(provider))
    if explicit:
        return explicit

    symbol = str(meta.get("symbol") or "").strip()
    if not symbol:
        return []

    if provider == "yahoo_chart":
        return [symbol]

    if meta.get("source") != "yahoo" or not is_plain_us_yahoo_symbol(symbol):
        return []

    normalized = symbol.upper()
    if provider == "stooq":
        return [stooq_symbol(normalized)]
    if provider == "eastmoney_us":
        return [f"105.{normalized}", f"106.{normalized}"]
    if provider == "sina_us":
        return [normalized]
    return []


def yahoo_fallback_candidates(meta):
    for provider, fetcher in YAHOO_FALLBACK_FETCHERS.items():
        for native_symbol in provider_symbols(meta, provider):
            yield provider, fetcher, native_symbol


def solve_stooq_verify(text, url, opener, headers):
    match = re.search(r'const c="([^"]+)",d=(\d+)', text)
    if not match:
        return False
    challenge = match.group(1)
    difficulty = int(match.group(2))
    prefix = "0" * difficulty
    nonce = 0
    while nonce < 2_000_000:
        digest = hashlib.sha256(f"{challenge}{nonce}".encode("utf-8")).hexdigest()
        if digest.startswith(prefix):
            break
        nonce += 1
    if nonce >= 2_000_000:
        return False
    parsed = urllib.parse.urlsplit(url)
    verify_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, "/__verify", "", ""))
    body = urllib.parse.urlencode({"c": challenge, "n": str(nonce)}).encode("utf-8")
    req = urllib.request.Request(
        verify_url,
        data=body,
        headers={
            **headers,
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": url,
        },
        method="POST",
    )
    with opener.open(req, timeout=30) as resp:
        return 200 <= resp.status < 300


def fetch_stooq_daily_uncached(symbol):
    normalized_symbol = str(symbol or "").strip().lower()
    params = {"s": normalized_symbol, "i": "d"}
    stooq_api_key = os.environ.get(STOOQ_API_KEY_ENV, "").strip()
    if stooq_api_key:
        params["apikey"] = stooq_api_key
    url = "https://stooq.com/q/d/l/?" + urllib.parse.urlencode(params)
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/csv,text/plain,*/*",
    }
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
    req = urllib.request.Request(url, headers=headers)
    with opener.open(req, timeout=30) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    if "This site requires JavaScript to verify your browser" in text and solve_stooq_verify(text, url, opener, headers):
        req = urllib.request.Request(url, headers=headers)
        with opener.open(req, timeout=30) as resp:
            text = resp.read().decode("utf-8", errors="replace")
    if text.strip().lower().startswith("access denied"):
        raise RuntimeError("Stooq access denied; set ALLOCLAB_STOOQ_API_KEY if your environment requires it")
    rows = []
    for row in csv.DictReader(text.splitlines()):
        date = row.get("Date")
        close = row.get("Close")
        if not date or close in (None, "", "N/D"):
            continue
        close_value = float(close)
        if close_value > 0:
            rows.append({"date": date, "close": close_value})
    if not rows:
        raise RuntimeError(f"Stooq daily data unavailable: {normalized_symbol}")
    return sorted(rows, key=lambda item: item["date"])


def fetch_stooq_daily(symbol):
    native_symbol = str(symbol or "").strip().lower()
    if "." not in native_symbol:
        native_symbol = stooq_symbol(symbol)
    return cached_provider_fetch("stooq", native_symbol, fetch_stooq_daily_uncached)


YAHOO_FALLBACK_FETCHERS = {
    "stooq": fetch_stooq_daily,
    "eastmoney_us": fetch_eastmoney_us_daily,
    "sina_us": fetch_sina_us_daily,
}


def fetch_yahoo(symbol):
    meta = {"id": symbol, "symbol": symbol, "source": "yahoo"}
    try:
        return fetch_yahoo_chart(symbol)
    except Exception as yahoo_exc:
        for source, fetcher, provider_symbol in yahoo_fallback_candidates(meta):
            try:
                rows = fetcher(provider_symbol)
                if rows:
                    log_event(
                        f"market.yahoo_fallback.{source}",
                        symbol=symbol,
                        provider_symbol=provider_symbol,
                        count=len(rows),
                    )
                    return rows
            except Exception as fallback_exc:
                log_event(
                    f"market.yahoo_fallback.{source}_error",
                    symbol=symbol,
                    provider_symbol=provider_symbol,
                    yahoo_error=type(yahoo_exc).__name__,
                    yahoo_status=http_error_status(yahoo_exc),
                    fallback_error=type(fallback_exc).__name__,
                    fallback_status=http_error_status(fallback_exc),
                )
        if not list(yahoo_fallback_candidates(meta)):
            log_event(
                "market.yahoo_fallback.skipped",
                symbol=symbol,
                reason="no_provider_symbol_mapping",
            )
        raise MarketDataUnavailable(symbol, http_error_status(yahoo_exc), type(yahoo_exc).__name__) from yahoo_exc


def series_quality_warnings(rows, expected_start=""):
    warnings = []
    if not rows:
        return ["no_data"]

    if expected_start and _series_starts_too_late("", rows, expected_start):
        warnings.append("start_late")

    max_gap = 0
    max_gap_start = ""
    max_gap_end = ""
    for prev, current in zip(rows, rows[1:]):
        try:
            gap = (datetime.fromisoformat(current["date"]) - datetime.fromisoformat(prev["date"])).days
        except Exception:
            continue
        if gap > max_gap:
            max_gap = gap
            max_gap_start = prev["date"]
            max_gap_end = current["date"]

    if max_gap > MAX_SERIES_GAP_DAYS:
        warnings.append("large_gap")
        log_event("market.series.large_gap", gap_days=max_gap, start=max_gap_start, end=max_gap_end)
    return warnings


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
        hint_start_source = ""
        if first_trade_ms:
            hint_start = datetime.fromtimestamp(first_trade_ms / 1000, timezone.utc).date().isoformat()
            hint_start_source = "yahoo_search"
        if not hint_start:
            hint_start = lookup_catalog_hint_start(symbol)
            hint_start_source = "catalog" if hint_start else ""
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
                "hintStartSource": hint_start_source,
                "dataQuality": "metadata" if hint_start else "unverified",
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
            meta = {
                "id": asset_id,
                "symbol": symbol,
                "name": candidate.get("name") or symbol,
                "assetClass": candidate.get("assetClass") or "Yahoo",
                "source": "yahoo",
                "currency": candidate.get("currency") or "",
                "hintStart": "",
                "keywords": f"{symbol} {candidate.get('name') or ''}",
                "dynamic": True,
            }
            hint = enrich_asset_market_profile(meta)
        except Exception as exc:
            log_event("search.symbol_fallback.error", query=query, symbol=symbol, error=type(exc).__name__)
            continue
        if not hint or not hint.get("hintStart") or hint.get("hintStart") == DATA_UNAVAILABLE_HINT:
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
                "hintStartSource": hint.get("hintStartSource") or "market_probe",
                "lastDate": hint.get("lastDate") or "",
                "dataCount": int(hint.get("dataCount") or 0),
                "dataQuality": hint.get("dataQuality") or "verified",
                "disabledReason": hint.get("disabledReason") or "",
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
    akshare = get_akshare()
    if akshare is None:
        return []
    started = time.time()
    df = akshare.fund_name_em()
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
    if get_akshare() is None:
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


def fetch_fund_profile(code):
    if code in FUND_PROFILE_CACHE:
        return dict(FUND_PROFILE_CACHE[code])
    try:
        first_page = http_get_json(
            "https://api.fund.eastmoney.com/f10/lsjz?"
            f"fundCode={code}&pageIndex=1&pageSize=1&startDate=&endDate=",
            headers={"Referer": "https://fundf10.eastmoney.com/"},
            timeout=15,
        )
        total = int(first_page.get("TotalCount") or 0)
        first_rows = first_page.get("Data", {}).get("LSJZList", [])
        last_date = first_rows[0].get("FSRQ", "") if first_rows else ""
        if total <= 1:
            start = last_date
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
        start = DATA_UNAVAILABLE_HINT
        last_date = ""
        total = 0
    profile = {
        "hintStart": start or DATA_UNAVAILABLE_HINT,
        "lastDate": last_date or "",
        "dataCount": total,
    }
    FUND_PROFILE_CACHE[code] = profile
    return dict(profile)


def lookup_catalog_hint_start(symbol):
    key = str(symbol or "").upper()
    if not key:
        return ""
    for item in CATALOG:
        if item.get("source") == "yahoo" and item.get("symbol", "").upper() == key:
            hint = item.get("hintStart") or ""
            if hint:
                return hint
    return ""


def dynamic_fund_hint_start(code):
    return CATALOG_BY_ID.get(code, {}).get("hintStart") or ""


def fund_search(query, limit=12):
    key = query.lower().strip()
    if not key:
        return []
    catalog = fund_catalog()
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
    hint_start = lookup_catalog_hint_start(symbol)
    return {
        "id": asset_id,
        "symbol": symbol,
        "name": symbol,
        "assetClass": "Yahoo",
        "source": "yahoo",
        "currency": "",
        "hintStart": hint_start,
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


def synthetic_cash_series():
    rows = []
    current = datetime(1900, 1, 1, tzinfo=timezone.utc).date()
    end = datetime.now(timezone.utc).date()
    while current <= end:
        rows.append({"date": current.isoformat(), "close": 1.0})
        current += timedelta(days=1)
    return rows


def data_availability_reason(meta):
    if meta.get("hintStart") == DATA_UNAVAILABLE_HINT:
        return DATA_UNAVAILABLE_REASON
    data_count = int(meta.get("dataCount") or 0)
    if 0 < data_count < MIN_BACKTEST_DAYS:
        return INSUFFICIENT_DATA_REASON
    if meta.get("dataUnavailable"):
        return DATA_UNAVAILABLE_REASON
    return ""


def enrich_asset_market_profile(meta, force=False):
    meta = dict(meta)
    if not force and meta.get("hintStart") and (not meta.get("dynamic") or "dataCount" in meta):
        meta.setdefault("hintStartSource", "catalog" if not meta.get("dynamic") else "market_probe")
        meta.setdefault("dataQuality", "known" if not meta.get("dynamic") else "verified")
        meta["disabledReason"] = data_availability_reason(meta)
        return meta
    try:
        if meta.get("source") == "fund_nav_accum":
            profile = fetch_fund_profile(meta["symbol"])
            meta.update(profile)
            meta.setdefault("hintStartSource", "fund_profile")
        else:
            rows = get_series(meta["id"])
            meta["hintStart"] = rows[0]["date"] if rows else DATA_UNAVAILABLE_HINT
            meta["hintStartSource"] = "market_series"
            meta["lastDate"] = rows[-1]["date"] if rows else ""
            meta["dataCount"] = len(rows)
        meta["dataQuality"] = "verified"
    except Exception:
        meta["hintStart"] = DATA_UNAVAILABLE_HINT
        meta["hintStartSource"] = ""
        meta["lastDate"] = ""
        meta["dataCount"] = 0
        meta["dataQuality"] = "unavailable"
        meta["dataUnavailable"] = True
    meta["disabledReason"] = data_availability_reason(meta)
    return meta


def public_asset_meta(meta):
    return {
        key: value
        for key, value in meta.items()
        if key not in {"keywords", "source", "dataUnavailable"}
    }


def local_search_items(query):
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
            items.append(dict(item))
    return items


def complete_search_items(items):
    completed = [None] * len(items)
    pending = []
    for index, item in enumerate(items):
        if item.get("dynamic") and item.get("hintStart") and "dataCount" not in item:
            quick = dict(item)
            quick.setdefault("hintStartSource", "metadata")
            quick.setdefault("dataQuality", "metadata")
            quick["disabledReason"] = data_availability_reason(quick)
            completed[index] = quick
        elif item.get("dynamic"):
            pending.append((index, item))
        else:
            completed[index] = enrich_asset_market_profile(item)
    if pending:
        with ThreadPoolExecutor(max_workers=min(6, len(pending))) as executor:
            futures = {
                executor.submit(enrich_asset_market_profile, item): index
                for index, item in pending
            }
            for future in as_completed(futures):
                index = futures[future]
                try:
                    completed[index] = future.result()
                except Exception:
                    failed = dict(items[index])
                    failed["hintStart"] = DATA_UNAVAILABLE_HINT
                    failed["dataCount"] = 0
                    failed["disabledReason"] = DATA_UNAVAILABLE_REASON
                    completed[index] = failed
    return [public_asset_meta(item) for item in completed if item]


def search_assets(query):
    started = time.time()
    query = query.lower().strip()
    log_event("search.start", query=query or "-", yahoo=should_search_yahoo(query), funds=should_search_funds(query))
    items = local_search_items(query)
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
        append_search_items(items, existing, yahoo_items, 18)

    if query and should_search_funds(query):
        existing = {item["id"] for item in items}
        fund_started = time.time()
        try:
            fund_items = fund_search(query)
            log_event(
                "search.fund.done",
                query=query,
                count=len(fund_items),
                catalog_count=len(FUND_LIST_CACHE or []),
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
        append_search_items(items, existing, fund_items, 24)

    completed_items = complete_search_items(items)
    log_event("search.done", query=query or "-", count=len(completed_items), elapsed_ms=int((time.time() - started) * 1000))
    return completed_items

def fetch_csindex_uncached(symbol):
    akshare = get_akshare()
    if akshare is None:
        raise RuntimeError("AKShare 不可用，请先安装到 work/pydeps。")
    df = akshare.stock_zh_index_hist_csindex(
        symbol=symbol, start_date="20000101", end_date="20991231"
    )
    rows = []
    for _, row in df.iterrows():
        date = str(row["日期"])
        close = float(row["收盘"])
        if close > 0 and date >= "2000-01-01":
            rows.append({"date": date, "close": close})
    return sorted(rows, key=lambda item: item["date"])


def fetch_csindex(symbol):
    return cached_provider_fetch("csindex", symbol, fetch_csindex_uncached)


def fetch_fund_nav_uncached(symbol, value_field="LJJZ"):
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


def fetch_fund_nav(symbol, value_field="LJJZ"):
    cache_source = f"fund_nav_{value_field.lower()}"
    return cached_provider_fetch(cache_source, symbol, lambda item_symbol: fetch_fund_nav_uncached(item_symbol, value_field))


def fetch_sina_uncached(symbol):
    url = (
        "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/"
        f"CN_MarketData.getKLineData?symbol={symbol}&scale=240&ma=no&datalen=6000"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return sorted(
        (
            {"date": row["day"], "close": float(row["close"])}
            for row in data
            if row.get("day") and float(row["close"]) > 0
        ),
        key=lambda item: item["date"],
    )


def fetch_sina(symbol):
    return cached_provider_fetch("sina_cn", symbol, fetch_sina_uncached)


def _series_starts_too_late(asset_id, rows, hint_start=""):
    if not rows:
        return False
    hint = hint_start
    if not hint:
        meta = get_asset_meta(asset_id)
        if not meta:
            return False
        hint = meta.get("hintStart") or ""
    if not hint:
        return False
    try:
        row_start = datetime.strptime(rows[0]["date"], "%Y-%m-%d")
        expected_start = datetime.strptime(hint, "%Y-%m-%d")
        return (row_start - expected_start).days > MAX_MARKET_START_DRIFT_DAYS
    except Exception:
        return False


def _fallback_rows_acceptable(rows, hint_start=""):
    warnings = series_quality_warnings(rows, hint_start)
    return bool(rows) and "large_gap" not in warnings and "start_late" not in warnings, warnings


def _fallback_source_rows(source, fetcher, symbol, log_symbol, hint_start=""):
    rows = fetcher(symbol)
    acceptable, warnings = _fallback_rows_acceptable(rows, hint_start)
    if not acceptable:
        log_event(
            f"market.yahoo_fallback.{source}_rejected",
            symbol=log_symbol,
            provider_symbol=symbol,
            count=len(rows),
            start=rows[0]["date"] if rows else "",
            warnings=",".join(warnings),
        )
        return None
    return rows


def _yahoo_series_with_backfill(meta, symbol):
    hint_start = meta.get("hintStart", "")
    yahoo_symbols = provider_symbols(meta, "yahoo_chart") or [meta["symbol"]]
    yahoo_symbol = yahoo_symbols[0]
    try:
        rows = fetch_yahoo_chart(yahoo_symbol)
    except Exception as yahoo_exc:
        log_event(
            "market.yahoo.error",
            symbol=meta["id"],
            provider_symbol=yahoo_symbol,
            error=type(yahoo_exc).__name__,
            status=http_error_status(yahoo_exc),
        )
        for source, fetcher, provider_symbol in yahoo_fallback_candidates(meta):
            try:
                fallback_rows = _fallback_source_rows(source, fetcher, provider_symbol, meta["id"], hint_start)
            except Exception as exc:
                log_event(
                    f"market.yahoo_fallback.{source}_error",
                    symbol=meta["id"],
                    provider_symbol=provider_symbol,
                    yahoo_error=type(yahoo_exc).__name__,
                    yahoo_status=http_error_status(yahoo_exc),
                    fallback_error=type(exc).__name__,
                    fallback_status=http_error_status(exc),
                )
                continue
            if fallback_rows:
                log_event(
                    f"market.yahoo_fallback.{source}",
                    symbol=meta["id"],
                    provider_symbol=provider_symbol,
                    count=len(fallback_rows),
                )
                return fallback_rows
        raise MarketDataUnavailable(meta["id"], http_error_status(yahoo_exc), type(yahoo_exc).__name__) from yahoo_exc

    if not hint_start:
        return rows

    if _series_starts_too_late(meta["id"], rows, hint_start):
        log_event(
            "market.series.start_fallback",
            symbol=meta["id"],
            reason="drift",
            start=rows[0]["date"] if rows else "",
            expected_hint=hint_start,
            count=len(rows),
        )
    else:
        return rows

    log_event(
        "market.series.start_gap",
        symbol=meta["id"],
        start=rows[0]["date"] if rows else "",
        expected_hint=meta.get("hintStart") or "",
        count=len(rows),
        source="yahoo",
    )
    fallback_rows = None
    for source, fetcher, provider_symbol in yahoo_fallback_candidates(meta):
        try:
            fallback_rows = _fallback_source_rows(source, fetcher, provider_symbol, meta["id"], hint_start)
        except Exception as exc:
            log_event(
                f"market.yahoo_fallback.{source}_error",
                symbol=meta["id"],
                provider_symbol=provider_symbol,
                yahoo_error="start_gap",
                fallback_error=type(exc).__name__,
                fallback_status=http_error_status(exc),
            )
            continue
        if fallback_rows:
            log_event(
                f"market.yahoo_fallback.{source}",
                symbol=meta["id"],
                provider_symbol=provider_symbol,
                count=len(fallback_rows),
            )
            break
    if not fallback_rows:
        return rows

    if not rows:
        return fallback_rows

    if rows[0]["date"] <= fallback_rows[0]["date"]:
        return rows
    return fallback_rows


def get_series(asset_id, force_refresh=False):
    dynamic_meta = get_asset_meta(asset_id)
    if dynamic_meta is None:
        raise ValueError(f"未知标的：{asset_id}")

    meta = dynamic_meta
    source = meta["source"]
    if source == "yahoo":
        rows = _yahoo_series_with_backfill(meta, meta["symbol"])
    elif source == "csindex":
        rows = fetch_csindex(meta["symbol"])
    elif source == "fund_nav_accum":
        rows = fetch_fund_nav(meta["symbol"], "LJJZ")
    elif source == "sina":
        rows = fetch_sina(meta["symbol"])
    elif source == "cash":
        rows = synthetic_cash_series()
    else:
        raise ValueError(f"暂不支持的数据源：{source}")

    if not rows:
        raise RuntimeError(f"没有获取到 {asset_id} 的行情数据")

    if _series_starts_too_late(asset_id, rows):
        log_event(
            "market.series.start_gap",
            symbol=asset_id,
            start=rows[0]["date"],
            expected_hint=meta.get("hintStart") or "",
            count=len(rows),
            source=source,
        )
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
    return annualized_vol_from_returns(pct_change(values))


def annualized_vol_from_returns(returns):
    if len(returns) < 2:
        return 0
    mean = sum(returns) / len(returns)
    var = sum((ret - mean) ** 2 for ret in returns) / (len(returns) - 1)
    return math.sqrt(var * 252)


def max_drawdown_value(values):
    peak = values[0]
    max_dd = 0.0
    for value in values:
        if value > peak:
            peak = value
        dd = value / peak - 1
        if dd < max_dd:
            max_dd = dd
    return max_dd


def build_simulation_context(dates, prices=None):
    month_end = []
    quarter_end = []
    year_end = []
    last_index = len(dates) - 1
    for index, date in enumerate(dates):
        if index == last_index:
            month_end.append(False)
            quarter_end.append(False)
            year_end.append(False)
            continue
        next_date = dates[index + 1]
        is_year_end = date[:4] != next_date[:4]
        is_month_end = date[:7] != next_date[:7]
        quarter = (int(date[5:7]) - 1) // 3
        next_quarter = (int(next_date[5:7]) - 1) // 3
        month_end.append(is_month_end)
        quarter_end.append(is_year_end or quarter != next_quarter)
        year_end.append(is_year_end)
    context = {
        "monthEnd": month_end,
        "quarterEnd": quarter_end,
        "yearEnd": year_end,
    }
    if prices is not None:
        context["priceRows"] = list(zip(*prices))
    return context


def years_between(start, end):
    return (datetime.fromisoformat(end) - datetime.fromisoformat(start)).days / 365.25


def money_weighted_return(cashflows):
    flows = []
    for date, amount in cashflows:
        if not date:
            continue
        try:
            numeric_amount = float(amount)
        except (TypeError, ValueError):
            continue
        if math.isfinite(numeric_amount) and abs(numeric_amount) > 1e-15:
            flows.append((datetime.fromisoformat(date), numeric_amount))
    flows.sort(key=lambda item: item[0])
    if not flows or not any(amount < 0 for _, amount in flows) or not any(amount > 0 for _, amount in flows):
        return None
    base_date = flows[0][0]
    timed_flows = [((date - base_date).days / 365.25, amount) for date, amount in flows]

    def npv(log_growth):
        total = 0.0
        for years, amount in timed_flows:
            exponent = max(-700.0, min(700.0, -log_growth * years))
            total += amount * math.exp(exponent)
        return total

    low = -20.0
    high = 20.0
    if npv(low) <= 0 or npv(high) >= 0:
        return None
    for _ in range(120):
        middle = (low + high) / 2
        if npv(middle) > 0:
            low = middle
        else:
            high = middle
    return math.expm1((low + high) / 2)


def investor_metrics(start_date, end_date, terminal_value, contributions):
    contribution_total = sum(float(amount) for _, amount in contributions)
    invested_capital = 1.0 + contribution_total
    terminal_value = float(terminal_value)
    net_profit = terminal_value - invested_capital
    cashflows = [(start_date, -1.0)]
    cashflows.extend((date, -float(amount)) for date, amount in contributions)
    cashflows.append((end_date, terminal_value))
    return {
        "investedCapital": invested_capital,
        "terminalValue": terminal_value,
        "netProfit": net_profit,
        "netProfitRate": net_profit / invested_capital if invested_capital else None,
        "moneyWeightedReturn": money_weighted_return(cashflows),
    }


def add_years(value, years):
    try:
        return value.replace(year=value.year + years)
    except ValueError:
        return value.replace(year=value.year + years, month=2, day=28)


def fire_withdrawal_metrics(dates, nav, annual_rate=0.04, inflation_rate=0.025):
    if len(dates) < 2:
        return {
            "rate": annual_rate,
            "inflationRate": inflation_rate,
            "terminal": 1,
            "cagr": 0,
            "depleted": False,
            "depletedDate": "",
            "withdrawals": 0,
            "totalWithdrawn": 0,
        }
    value = 1.0
    withdrawals = 0
    total_withdrawn = 0
    withdrawal_amount = annual_rate
    depleted_date = ""
    start_date = datetime.fromisoformat(dates[0])
    next_withdrawal_date = add_years(start_date, 1)
    for i in range(1, len(dates)):
        value *= nav[i] / nav[i - 1]
        current_date = datetime.fromisoformat(dates[i])
        while current_date >= next_withdrawal_date:
            value -= withdrawal_amount
            withdrawals += 1
            total_withdrawn += withdrawal_amount
            if value <= 0:
                depleted_date = dates[i]
                value = 0
                break
            withdrawal_amount *= 1 + inflation_rate
            next_withdrawal_date = add_years(start_date, withdrawals + 1)
        if depleted_date:
            break
    years = years_between(dates[0], depleted_date or dates[-1])
    cagr = value ** (1 / years) - 1 if value > 0 and years > 0 else None
    return {
        "rate": annual_rate,
        "inflationRate": inflation_rate,
        "terminal": value,
        "cagr": cagr,
        "depleted": bool(depleted_date),
        "depletedDate": depleted_date,
        "withdrawals": withdrawals,
        "totalWithdrawn": total_withdrawn,
    }


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

def clean_cashflow(raw_cashflow):
    raw_cashflow = raw_cashflow if isinstance(raw_cashflow, dict) else {}
    mode = str(raw_cashflow.get("mode") or "none")
    if mode not in {"none", "target", "underweight", "drift"}:
        mode = "none"
    contribution_rate = normalize_ratio_option(raw_cashflow.get("contributionRate"), 0.0, 0.0, 1.0)
    if contribution_rate <= 0:
        mode = "none"
        contribution_rate = 0.0
    return {"mode": mode, "contributionRate": contribution_rate, "frequency": "monthly"}


def cashflow_label(cashflow):
    mode = (cashflow or {}).get("mode", "none")
    rate = float((cashflow or {}).get("contributionRate") or 0)
    if mode == "none" or rate <= 0:
        return "no cashflow"
    labels = {
        "target": "按目标比例定投",
        "underweight": "补低配定投",
        "drift": "跟随漂移定投",
    }
    return f"{labels.get(mode, mode)} {rate * 100:.1f}%/月"


def should_contribute(cashflow, dates, t):
    if not cashflow or cashflow.get("mode") == "none" or float(cashflow.get("contributionRate") or 0) <= 0:
        return False
    return t < len(dates) - 1 and dates[t][:7] != dates[t + 1][:7]


def allocate_contribution(mode, amount, target_weights, units, prices_at_t, cash):
    if amount <= 0:
        return [0 for _ in target_weights], 0
    asset_values = [units[i] * prices_at_t[i] for i in range(len(target_weights))]
    current_value = cash + sum(asset_values)
    cash_target = 1 - sum(target_weights)

    if mode == "drift" and current_value > 0:
        asset_allocations = [amount * value / current_value for value in asset_values]
        cash_allocation = amount * cash / current_value
        return asset_allocations, cash_allocation

    if mode == "underweight":
        post_value = current_value + amount
        deficits = [
            max(0.0, post_value * target_weights[i] - asset_values[i])
            for i in range(len(target_weights))
        ]
        cash_deficit = max(0.0, post_value * cash_target - cash)
        total_deficit = sum(deficits) + cash_deficit
        if total_deficit > 0:
            used = min(amount, total_deficit)
            asset_allocations = [used * deficit / total_deficit for deficit in deficits]
            cash_allocation = used * cash_deficit / total_deficit
            remainder = amount - used
            if remainder > 0:
                cash_allocation += remainder
            return asset_allocations, cash_allocation

    asset_allocations = [amount * weight for weight in target_weights]
    cash_allocation = amount * cash_target
    return asset_allocations, cash_allocation


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
    average_nav = sum(nav) / len(nav)
    ulcer = math.sqrt(sum(dd * dd for dd in drawdowns) / len(drawdowns))
    withdrawal4 = fire_withdrawal_metrics(dates, nav, 0.04, 0.025)
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
        "averageNav": average_nav,
        "winRate": positive_days / len(returns) if returns else 0,
        "ulcerIndex": ulcer,
        "rebalanceCount": len(rebalances),
        "drawdownPeak": dates[peak_idx],
        "drawdownTrough": dates[trough_idx],
        "withdrawal4": withdrawal4,
    }, drawdowns


def compute_scan_metrics(dates, nav, rebalance_count):
    total = nav[-1] / nav[0] - 1
    years = years_between(dates[0], dates[-1])
    cagr = nav[-1] ** (1 / years) - 1 if years > 0 else 0
    returns = pct_change(nav)
    vol = annualized_vol_from_returns(returns)
    mdd = max_drawdown_value(nav)
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
        "averageNav": sum(nav) / len(nav),
        "rebalanceCount": rebalance_count,
    }


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


def simulate_portfolio(
    dates,
    prices,
    target_weights,
    rebalance,
    collect_details=True,
    cashflow=None,
    simulation_context=None,
    metrics_mode="full",
    progress=None,
):
    if any(weight < 0 for weight in target_weights):
        raise ValueError("暂不支持做空权重。")
    if sum(target_weights) <= 0:
        raise ValueError("权重合计必须大于 0。")
    cashflow = clean_cashflow(cashflow)
    simulation_context = simulation_context or build_simulation_context(dates, prices)
    price_rows = simulation_context.get("priceRows") or list(zip(*prices))
    asset_count = len(target_weights)
    weight_sum = sum(target_weights)
    units = [target_weights[i] / prices[i][0] for i in range(asset_count)]
    cash = 1 - weight_sum
    mode = rebalance.get("mode", "annual")
    if mode not in {"none", "monthly", "quarterly", "annual", "threshold"}:
        raise ValueError(f"未知再平衡模式：{mode}")
    threshold = float(rebalance.get("threshold", 0.10))
    nav = []
    rebalances = []
    rebalance_count = 0
    cashflow_count = 0
    cashflow_total = 0.0
    contribution_events = []
    weights_timeline = []
    nav_index = 1.0
    previous_account_value = cash + sum(units[i] * prices[i][0] for i in range(asset_count))
    monthly_contribution = float(cashflow.get("contributionRate") or 0)
    cashflow_enabled = cashflow.get("mode") != "none" and monthly_contribution > 0
    month_end = simulation_context["monthEnd"]
    scheduled_rebalances = {
        "monthly": month_end,
        "quarterly": simulation_context["quarterEnd"],
        "annual": simulation_context["yearEnd"],
    }
    progress_step = max(1, len(dates) // 40)

    for t, date in enumerate(dates):
        if progress and (t == 0 or t % progress_step == 0):
            progress(t / len(dates))
        prices_at_t = price_rows[t]
        value = cash + sum(units[i] * prices_at_t[i] for i in range(asset_count))
        if value <= 0:
            raise ValueError(f"组合净值在 {date} 跌至 0 或以下，请降低杠杆。")
        if t == 0:
            nav_index = 1.0
        else:
            nav_index *= value / previous_account_value
        nav.append(nav_index)
        if collect_details:
            current_weights = [
                units[i] * prices_at_t[i] / value for i in range(asset_count)
            ]
            weights_timeline.append(current_weights)
        if cashflow_enabled and month_end[t]:
            asset_allocations, cash_allocation = allocate_contribution(
                cashflow["mode"],
                monthly_contribution,
                target_weights,
                units,
                prices_at_t,
                cash,
            )
            for i, amount in enumerate(asset_allocations):
                units[i] += amount / prices_at_t[i]
            cash += cash_allocation
            cashflow_count += 1
            cashflow_total += monthly_contribution
            contribution_events.append((date, monthly_contribution))
            value = cash + sum(units[i] * prices_at_t[i] for i in range(asset_count))
        if mode == "threshold":
            rebalance_due = t < len(dates) - 1 and any(
                abs((units[i] * prices_at_t[i] / value) - target_weights[i]) >= threshold
                for i in range(asset_count)
            )
        elif mode == "none":
            rebalance_due = False
        else:
            rebalance_due = scheduled_rebalances[mode][t]
        if rebalance_due:
            rebalance_count += 1
            if metrics_mode == "full":
                event = {"date": date, "nav": nav_index}
                if collect_details:
                    before_rebalance = [
                        units[i] * prices_at_t[i] / value for i in range(asset_count)
                    ]
                    event.update({"before": before_rebalance, "after": target_weights})
                rebalances.append(event)
            units = [value * target_weights[i] / prices_at_t[i] for i in range(asset_count)]
            cash = value * (1 - weight_sum)
            value = cash + sum(units[i] * prices_at_t[i] for i in range(asset_count))
        previous_account_value = value

    if progress:
        progress(1.0)
    if metrics_mode == "scan":
        metrics = compute_scan_metrics(dates, nav, rebalance_count)
        drawdowns = []
    else:
        metrics, drawdowns = compute_metrics(dates, nav, rebalances)
    metrics["cashflowCount"] = cashflow_count
    metrics["cashflowTotal"] = cashflow_total
    metrics["cashflowMode"] = cashflow["mode"]
    if metrics_mode != "scan":
        metrics.update(investor_metrics(dates[0], dates[-1], previous_account_value, contribution_events))
    return metrics, drawdowns, nav, rebalances, weights_timeline

def backtest_portfolio(asset_ids, weights, rebalance, start=None, end=None, cashflow=None, progress=None):
    if progress:
        progress(0.02, "preparing")
    series_list = []
    for index, asset_id in enumerate(asset_ids):
        if progress:
            progress(0.05 + (index / max(1, len(asset_ids))) * 0.40, "market", asset_id)
        series_list.append(get_series(asset_id))
    if progress:
        progress(0.48, "align")
    dates, prices = align_series(series_list, start, end)
    simulation_context = build_simulation_context(dates, prices)
    target_weights = [weight / 100 for weight in weights]
    cashflow = clean_cashflow(cashflow)
    metrics, drawdowns, nav, rebalances, weights_timeline = simulate_portfolio(
        dates,
        prices,
        target_weights,
        rebalance,
        collect_details=True,
        cashflow=cashflow,
        simulation_context=simulation_context,
        progress=(lambda value: progress(0.52 + value * 0.24, "simulate")) if progress else None,
    )
    if progress:
        progress(0.78, "metrics")
    corr = correlation_matrix(prices)
    normalized_assets = [
        [price / asset_prices[0] for price in asset_prices] for asset_prices in prices
    ]
    asset_stats = []
    for index, (asset_id, asset_prices, asset_nav) in enumerate(zip(asset_ids, prices, normalized_assets)):
        if progress:
            progress(0.82 + (index / max(1, len(asset_ids))) * 0.14, "metrics", asset_id)
        asset_metrics, _ = compute_metrics(dates, asset_nav, [])
        meta = get_asset_meta(asset_id)
        asset_stats.append({"id": asset_id, "name": meta["name"], **asset_metrics})

    if progress:
        progress(0.98, "finalize")
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
        "cashflow": cashflow,
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


def clamp_number(value, default, low, high):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return max(low, min(high, number))


def normalize_ratio_option(value, default, low=0.0, high=1.0):
    number = clamp_number(value, default, low, 100.0)
    if number > 1:
        number = number / 100
    return max(low, min(high, number))


def clean_optimize_options(raw_options, asset_count):
    raw_options = raw_options if isinstance(raw_options, dict) else {}
    auto_step = 0.05 if asset_count == 2 else 0.10
    allowed_steps = [0.025, 0.05, 0.10, 0.20]
    requested_step = raw_options.get("step", "auto")
    if requested_step == "auto":
        step = auto_step
    else:
        parsed_step = clamp_number(requested_step, auto_step, min(allowed_steps), max(allowed_steps))
        step = min(allowed_steps, key=lambda item: abs(item - parsed_step))

    min_weight = normalize_ratio_option(raw_options.get("minWeight"), 0.0, 0.0, 0.40)
    if min_weight * asset_count >= 1:
        min_weight = max(0.0, (1 / asset_count) - step)
    max_weight = normalize_ratio_option(raw_options.get("maxWeight"), 0.85, 0.05, 1.0)
    max_weight = max(max_weight, 1 / asset_count, min_weight)

    raw_drawdown = raw_options.get("maxDrawdown")
    max_drawdown = None
    if raw_drawdown not in (None, ""):
        max_drawdown = normalize_ratio_option(raw_drawdown, 0.0, 0.01, 0.95)

    result_limit = int(clamp_number(raw_options.get("limit"), 24, 8, 60))
    raw_modes = raw_options.get("rebalanceModes")
    if isinstance(raw_modes, list):
        rebalance_modes = sorted(
            {
                str(mode)
                for mode in raw_modes
                if str(mode) in {"none", "monthly", "quarterly", "annual", "threshold"}
            }
        )
    else:
        rebalance_modes = ["annual", "none", "quarterly", "threshold"]
    if not rebalance_modes:
        rebalance_modes = ["annual", "none", "quarterly", "threshold"]
    contribution_rate = normalize_ratio_option(raw_options.get("contributionRate"), 0.0, 0.0, 1.0)
    raw_cashflow_strategies = raw_options.get("cashflowStrategies")
    if isinstance(raw_cashflow_strategies, list):
        cashflow_strategies = [
            str(mode)
            for mode in raw_cashflow_strategies
            if str(mode) in {"target", "underweight", "drift"}
        ]
    else:
        cashflow_strategies = ["target", "underweight", "drift"]
    if contribution_rate <= 0:
        cashflow_strategies = ["none"]
        contribution_rate = 0.0
    elif not cashflow_strategies:
        cashflow_strategies = ["target", "underweight", "drift"]

    return {
        "step": step,
        "minWeight": min_weight,
        "maxWeight": max_weight,
        "maxDrawdown": max_drawdown,
        "limit": result_limit,
        "rebalanceModes": rebalance_modes,
        "contributionRate": contribution_rate,
        "cashflowStrategies": cashflow_strategies,
    }


def optimize_worker_count(total_evaluations, weight_count):
    if total_evaluations < MIN_PARALLEL_SCAN_EVALUATIONS or weight_count < 2:
        return 1
    default_workers = max(1, (os.cpu_count() or 1) - 1)
    try:
        configured_workers = int(os.environ.get(SCAN_WORKERS_ENV, default_workers))
    except (TypeError, ValueError):
        configured_workers = default_workers
    return max(1, min(configured_workers, weight_count))


def split_weight_chunks(weight_grids, chunk_count):
    if not weight_grids:
        return []
    chunk_size = max(1, math.ceil(len(weight_grids) / max(1, chunk_count)))
    return [
        weight_grids[start : start + chunk_size]
        for start in range(0, len(weight_grids), chunk_size)
    ]


def evaluate_optimize_weight_chunk(
    dates,
    prices,
    weight_chunk,
    rules,
    cashflow_rules,
    max_drawdown,
    simulation_context=None,
):
    simulation_context = simulation_context or build_simulation_context(dates, prices)
    completed_count = 0
    evaluated_count = 0
    rows = []
    for weights in weight_chunk:
        for rule_index, rule in enumerate(rules):
            for cashflow_index, cashflow in enumerate(cashflow_rules):
                try:
                    metrics, _, _, _, _ = simulate_portfolio(
                        dates,
                        prices,
                        weights,
                        rule,
                        collect_details=False,
                        cashflow=cashflow,
                        simulation_context=simulation_context,
                        metrics_mode="scan",
                    )
                except ValueError:
                    metrics = None
                completed_count += 1
                if metrics is None:
                    continue
                evaluated_count += 1
                if max_drawdown is not None and metrics["maxDrawdown"] < -max_drawdown:
                    continue
                rows.append((weights, rule_index, cashflow_index, metrics))
    return completed_count, evaluated_count, rows


def evaluate_optimize_numpy_chunk(
    dates,
    prices,
    weight_chunk,
    rules,
    cashflow_rules,
    max_drawdown,
    simulation_context=None,
    progress=None,
):
    if np is None:
        raise RuntimeError("NumPy scan engine is unavailable")
    simulation_context = simulation_context or build_simulation_context(dates, prices)
    weight_count = len(weight_chunk)
    rules_per_weight = len(rules) * len(cashflow_rules)
    completed_count = weight_count * rules_per_weight
    if completed_count == 0:
        return 0, 0, []

    base_weights = np.asarray(weight_chunk, dtype=np.float64)
    weights = np.repeat(base_weights, rules_per_weight, axis=0)
    rule_indices = np.tile(
        np.repeat(np.arange(len(rules), dtype=np.int32), len(cashflow_rules)),
        weight_count,
    )
    cashflow_indices = np.tile(
        np.arange(len(cashflow_rules), dtype=np.int32),
        weight_count * len(rules),
    )
    rule_mode_map = {"none": 0, "monthly": 1, "quarterly": 2, "annual": 3, "threshold": 4}
    cashflow_mode_map = {"none": 0, "target": 1, "underweight": 2, "drift": 3}
    rule_modes = np.asarray([rule_mode_map[rule["mode"]] for rule in rules], dtype=np.int8)[rule_indices]
    thresholds = np.asarray([float(rule.get("threshold", 0.10)) for rule in rules], dtype=np.float64)[
        rule_indices
    ]
    cashflow_modes = np.asarray(
        [cashflow_mode_map[cashflow["mode"]] for cashflow in cashflow_rules], dtype=np.int8
    )[cashflow_indices]
    contribution_rates = np.asarray(
        [float(cashflow.get("contributionRate") or 0) for cashflow in cashflow_rules], dtype=np.float64
    )[cashflow_indices]
    cashflow_enabled = (cashflow_modes != 0) & (contribution_rates > 0)

    price_array = np.asarray(prices, dtype=np.float64)
    asset_count = weights.shape[1]
    evaluation_count = weights.shape[0]
    weight_sums = np.zeros(evaluation_count, dtype=np.float64)
    for asset_index in range(asset_count):
        weight_sums += weights[:, asset_index]
    units = weights / price_array[:, 0]
    cash = 1.0 - weight_sums
    nav = np.ones(evaluation_count, dtype=np.float64)
    nav_sum = np.zeros(evaluation_count, dtype=np.float64)
    nav_peak = np.ones(evaluation_count, dtype=np.float64)
    max_drawdowns = np.zeros(evaluation_count, dtype=np.float64)
    return_means = np.zeros(evaluation_count, dtype=np.float64)
    return_m2 = np.zeros(evaluation_count, dtype=np.float64)
    rebalance_counts = np.zeros(evaluation_count, dtype=np.int32)
    cashflow_counts = np.zeros(evaluation_count, dtype=np.int32)
    cashflow_totals = np.zeros(evaluation_count, dtype=np.float64)

    previous_values = cash.copy()
    first_prices = price_array[:, 0]
    for asset_index in range(asset_count):
        previous_values += units[:, asset_index] * first_prices[asset_index]

    month_end = np.asarray(simulation_context["monthEnd"], dtype=bool)
    quarter_end = np.asarray(simulation_context["quarterEnd"], dtype=bool)
    year_end = np.asarray(simulation_context["yearEnd"], dtype=bool)
    last_index = len(dates) - 1
    progress_step = max(1, len(dates) // 100)
    return_count = 0

    for date_index in range(len(dates)):
        if progress and (date_index == 0 or date_index % progress_step == 0):
            progress(date_index / len(dates))
        prices_at_t = price_array[:, date_index]
        values = cash.copy()
        for asset_index in range(asset_count):
            values += units[:, asset_index] * prices_at_t[asset_index]
        if np.any(values <= 0):
            raise ValueError(f"Portfolio value fell to zero or below on {dates[date_index]}")

        if date_index > 0:
            growth_factors = values / previous_values
            daily_returns = growth_factors - 1.0
            nav *= growth_factors
            return_count += 1
            delta = daily_returns - return_means
            return_means += delta / return_count
            return_m2 += delta * (daily_returns - return_means)
        nav_sum += nav
        nav_peak = np.maximum(nav_peak, nav)
        max_drawdowns = np.minimum(max_drawdowns, nav / nav_peak - 1.0)

        if month_end[date_index] and np.any(cashflow_enabled):
            for cashflow_mode in (1, 2, 3):
                row_indices = np.flatnonzero(cashflow_enabled & (cashflow_modes == cashflow_mode))
                if row_indices.size == 0:
                    continue
                amounts = contribution_rates[row_indices]
                selected_weights = weights[row_indices]
                selected_units = units[row_indices]
                selected_cash = cash[row_indices]
                selected_values = values[row_indices]
                selected_weight_sums = weight_sums[row_indices]
                selected_asset_values = selected_units * prices_at_t

                if cashflow_mode == 3:
                    asset_allocations = amounts[:, None] * selected_asset_values / selected_values[:, None]
                    cash_allocations = amounts * selected_cash / selected_values
                elif cashflow_mode == 2:
                    post_values = selected_values + amounts
                    deficits = np.maximum(
                        0.0,
                        post_values[:, None] * selected_weights - selected_asset_values,
                    )
                    cash_deficits = np.maximum(
                        0.0,
                        post_values * (1.0 - selected_weight_sums) - selected_cash,
                    )
                    total_deficits = cash_deficits.copy()
                    for asset_index in range(asset_count):
                        total_deficits += deficits[:, asset_index]
                    positive = total_deficits > 0
                    used = np.minimum(amounts, total_deficits)
                    asset_allocations = amounts[:, None] * selected_weights
                    cash_allocations = amounts * (1.0 - selected_weight_sums)
                    if np.any(positive):
                        positive_indices = np.flatnonzero(positive)
                        positive_totals = total_deficits[positive_indices]
                        positive_used = used[positive_indices]
                        asset_allocations[positive_indices] = (
                            positive_used[:, None]
                            * deficits[positive_indices]
                            / positive_totals[:, None]
                        )
                        cash_allocations[positive_indices] = (
                            positive_used
                            * cash_deficits[positive_indices]
                            / positive_totals
                            + amounts[positive_indices]
                            - positive_used
                        )
                else:
                    asset_allocations = amounts[:, None] * selected_weights
                    cash_allocations = amounts * (1.0 - selected_weight_sums)

                units[row_indices] += asset_allocations / prices_at_t
                cash[row_indices] += cash_allocations
                cashflow_counts[row_indices] += 1
                cashflow_totals[row_indices] += amounts

            values = cash.copy()
            for asset_index in range(asset_count):
                values += units[:, asset_index] * prices_at_t[asset_index]

        rebalance_due = np.zeros(evaluation_count, dtype=bool)
        if date_index < last_index:
            if month_end[date_index]:
                rebalance_due |= rule_modes == 1
            if quarter_end[date_index]:
                rebalance_due |= rule_modes == 2
            if year_end[date_index]:
                rebalance_due |= rule_modes == 3
            threshold_rows = rule_modes == 4
            if np.any(threshold_rows):
                threshold_due = np.zeros(evaluation_count, dtype=bool)
                for asset_index in range(asset_count):
                    current_weights = units[:, asset_index] * prices_at_t[asset_index] / values
                    threshold_due |= np.abs(current_weights - weights[:, asset_index]) >= thresholds
                rebalance_due |= threshold_rows & threshold_due

        if np.any(rebalance_due):
            row_indices = np.flatnonzero(rebalance_due)
            rebalance_counts[row_indices] += 1
            units[row_indices] = (
                values[row_indices, None] * weights[row_indices] / prices_at_t
            )
            cash[row_indices] = values[row_indices] * (1.0 - weight_sums[row_indices])
            rebalanced_values = cash[row_indices].copy()
            for asset_index in range(asset_count):
                rebalanced_values += units[row_indices, asset_index] * prices_at_t[asset_index]
            values[row_indices] = rebalanced_values
        previous_values = values

    if progress:
        progress(1.0)
    years = years_between(dates[0], dates[-1])
    total_returns = nav - 1.0
    cagrs = np.power(nav, 1.0 / years) - 1.0 if years > 0 else np.zeros_like(nav)
    if return_count >= 2:
        volatilities = np.sqrt((return_m2 / (return_count - 1)) * 252.0)
    else:
        volatilities = np.zeros_like(nav)
    average_navs = nav_sum / len(dates)
    rows = []
    for row_index in range(evaluation_count):
        max_drawdown_value_at_row = float(max_drawdowns[row_index])
        if max_drawdown is not None and max_drawdown_value_at_row < -max_drawdown:
            continue
        volatility = float(volatilities[row_index])
        cagr = float(cagrs[row_index])
        metrics = {
            "start": dates[0],
            "end": dates[-1],
            "years": years,
            "totalReturn": float(total_returns[row_index]),
            "cagr": cagr,
            "volatility": volatility,
            "maxDrawdown": max_drawdown_value_at_row,
            "sharpe0": cagr / volatility if volatility else None,
            "calmar": cagr / abs(max_drawdown_value_at_row) if max_drawdown_value_at_row else None,
            "averageNav": float(average_navs[row_index]),
            "rebalanceCount": int(rebalance_counts[row_index]),
            "cashflowCount": int(cashflow_counts[row_index]),
            "cashflowTotal": float(cashflow_totals[row_index]),
            "cashflowMode": cashflow_rules[int(cashflow_indices[row_index])]["mode"],
        }
        rows.append(
            (
                weight_chunk[row_index // rules_per_weight],
                int(rule_indices[row_index]),
                int(cashflow_indices[row_index]),
                metrics,
            )
        )
    return completed_count, evaluation_count, rows


def initialize_optimize_worker(dates, prices, rules, cashflow_rules, max_drawdown, engine="python"):
    global OPTIMIZE_WORKER_STATE
    OPTIMIZE_WORKER_STATE = {
        "dates": dates,
        "prices": prices,
        "rules": rules,
        "cashflowRules": cashflow_rules,
        "maxDrawdown": max_drawdown,
        "simulationContext": build_simulation_context(dates, prices),
        "engine": engine,
    }


def evaluate_optimize_worker_chunk(chunk_index, weight_chunk):
    if OPTIMIZE_WORKER_STATE is None:
        raise RuntimeError("Optimize worker is not initialized")
    state = OPTIMIZE_WORKER_STATE
    evaluator = (
        evaluate_optimize_numpy_chunk
        if state.get("engine") == "numpy"
        else evaluate_optimize_weight_chunk
    )
    completed_count, evaluated_count, rows = evaluator(
        state["dates"],
        state["prices"],
        weight_chunk,
        state["rules"],
        state["cashflowRules"],
        state["maxDrawdown"],
        state["simulationContext"],
    )
    return chunk_index, completed_count, evaluated_count, rows


def optimize_portfolio(asset_ids, start=None, end=None, options=None, progress=None):
    n = len(asset_ids)
    if n < 2:
        raise ValueError("至少选择两个标的才能优化。")
    if progress:
        progress(0.01, "preparing")
    options = clean_optimize_options(options, n)
    cache_key = (tuple(asset_ids), start or "", end or "", json.dumps(options, sort_keys=True, separators=(",", ":")))
    if cache_key in OPTIMIZE_CACHE:
        if progress:
            progress(1.0, "cached")
        return OPTIMIZE_CACHE[cache_key]
    series_list = []
    for index, asset_id in enumerate(asset_ids):
        if progress:
            progress(0.03 + (index / max(1, n)) * 0.12, "market", asset_id)
        series_list.append(get_series(asset_id))
    if progress:
        progress(0.16, "align")
    dates, prices = align_series(series_list, start, end)
    simulation_context = build_simulation_context(dates, prices)
    step = options["step"]
    grids = generate_weight_grid(n, step=step, min_weight=options["minWeight"])
    grids = [
        weights
        for weights in grids
        if all(weight <= options["maxWeight"] for weight in weights)
        and sum(1 for weight in weights if weight > 0) >= 2
    ]
    all_rules = [
        {"mode": "none", "threshold": 0.10, "label": "不再平衡", "family": "none"},
        {"mode": "monthly", "threshold": 0.10, "label": "每月", "family": "monthly"},
        {"mode": "annual", "threshold": 0.10, "label": "每年", "family": "annual"},
        {"mode": "quarterly", "threshold": 0.10, "label": "每季", "family": "quarterly"},
        {"mode": "threshold", "threshold": 0.08, "label": "8% 阈值", "family": "threshold"},
        {"mode": "threshold", "threshold": 0.10, "label": "10% 阈值", "family": "threshold"},
        {"mode": "threshold", "threshold": 0.15, "label": "15% 阈值", "family": "threshold"},
        {"mode": "threshold", "threshold": 0.20, "label": "20% 阈值", "family": "threshold"},
    ]
    rules = [rule for rule in all_rules if rule["family"] in options["rebalanceModes"]]
    cashflow_rules = [
        {"mode": mode, "contributionRate": options["contributionRate"], "frequency": "monthly"}
        for mode in options["cashflowStrategies"]
    ]
    total_evaluations = len(grids) * len(rules) * len(cashflow_rules)
    requested_engine = os.environ.get(SCAN_ENGINE_ENV, "auto").strip().lower()
    scan_engine = (
        "numpy"
        if np is not None
        and requested_engine != "python"
        and total_evaluations >= MIN_PARALLEL_SCAN_EVALUATIONS
        else "python"
    )
    worker_count = optimize_worker_count(total_evaluations, len(grids))
    if scan_engine == "numpy":
        useful_numpy_workers = max(
            1,
            math.ceil(
                total_evaluations * len(dates) / MIN_NUMPY_WORK_PER_PROCESS
            ),
        )
        worker_count = min(worker_count, useful_numpy_workers)
    if scan_engine == "numpy":
        try:
            max_batch_evaluations = max(1024, int(os.environ.get(SCAN_BATCH_SIZE_ENV, "32768")))
        except (TypeError, ValueError):
            max_batch_evaluations = 32768
        weights_per_chunk = max(1, max_batch_evaluations // max(1, len(rules) * len(cashflow_rules)))
        batch_chunk_count = math.ceil(len(grids) / weights_per_chunk) if grids else 1
        target_chunk_count = max(worker_count, batch_chunk_count)
    else:
        target_chunk_count = worker_count * 8 if worker_count > 1 else min(200, len(grids))
    weight_chunks = split_weight_chunks(grids, target_chunk_count)
    completed_evaluations = 0
    candidates = []
    evaluated_count = 0
    chunk_results = {}

    def report_chunk(completed_count):
        nonlocal completed_evaluations
        completed_evaluations += completed_count
        if progress:
            progress(
                0.18 + (completed_evaluations / max(1, total_evaluations)) * 0.72,
                "scan",
                f"{completed_evaluations}/{total_evaluations}",
            )

    def report_inflight(inflight_count):
        if progress:
            visible_count = min(total_evaluations, completed_evaluations + int(inflight_count))
            progress(
                0.18 + (visible_count / max(1, total_evaluations)) * 0.72,
                "scan",
                f"{visible_count}/{total_evaluations}",
            )

    scan_started = time.time()
    if scan_engine == "numpy" and worker_count == 1:
        for chunk_index, weight_chunk in enumerate(weight_chunks):
            chunk_evaluation_count = len(weight_chunk) * len(rules) * len(cashflow_rules)
            completed_count, chunk_evaluated_count, rows = evaluate_optimize_numpy_chunk(
                dates,
                prices,
                weight_chunk,
                rules,
                cashflow_rules,
                options["maxDrawdown"],
                simulation_context,
                progress=(
                    lambda fraction, chunk_total=chunk_evaluation_count: report_inflight(
                        fraction * chunk_total
                    )
                ),
            )
            chunk_results[chunk_index] = rows
            evaluated_count += chunk_evaluated_count
            report_chunk(completed_count)
    elif worker_count == 1:
        for chunk_index, weight_chunk in enumerate(weight_chunks):
            completed_count, chunk_evaluated_count, rows = evaluate_optimize_weight_chunk(
                dates,
                prices,
                weight_chunk,
                rules,
                cashflow_rules,
                options["maxDrawdown"],
                simulation_context,
            )
            chunk_results[chunk_index] = rows
            evaluated_count += chunk_evaluated_count
            report_chunk(completed_count)
    else:
        executor = ProcessPoolExecutor(
            max_workers=worker_count,
            mp_context=multiprocessing.get_context("spawn"),
            initializer=initialize_optimize_worker,
            initargs=(dates, prices, rules, cashflow_rules, options["maxDrawdown"], scan_engine),
        )
        try:
            futures = [
                executor.submit(evaluate_optimize_worker_chunk, chunk_index, weight_chunk)
                for chunk_index, weight_chunk in enumerate(weight_chunks)
            ]
            for future in as_completed(futures):
                chunk_index, completed_count, chunk_evaluated_count, rows = future.result()
                chunk_results[chunk_index] = rows
                evaluated_count += chunk_evaluated_count
                report_chunk(completed_count)
        finally:
            executor.shutdown(wait=True, cancel_futures=True)

    asset_refs = [{"id": asset_id} for asset_id in asset_ids]
    for chunk_index in range(len(weight_chunks)):
        for weights, rule_index, cashflow_index, metrics in chunk_results[chunk_index]:
            rule = rules[rule_index]
            cashflow = cashflow_rules[cashflow_index]
            rule_payload = {key: value for key, value in rule.items() if key != "family"}
            candidates.append(
                {
                    "weights": weights,
                    "assets": asset_refs,
                    "rebalance": rule_payload,
                    "cashflow": cashflow,
                    "metrics": metrics,
                    "score": {
                        "sharpe0": metrics["sharpe0"] or -999,
                        "calmar": metrics["calmar"] or -999,
                        "cagr": metrics["cagr"],
                        "mdd": metrics["maxDrawdown"],
                        "vol": metrics["volatility"],
                        "averageNav": metrics["averageNav"],
                    },
                }
            )
    log_event(
        "optimize.scan_done",
        evaluations=total_evaluations,
        engine=scan_engine,
        workers=worker_count,
        elapsed_ms=int((time.time() - scan_started) * 1000),
    )

    def metric_values(name):
        return [candidate["score"][name] for candidate in candidates]

    def metric_bounds(values):
        return (min(values), max(values)) if values else None

    def normalize(value, bounds, inverse=False):
        if bounds is None:
            return 0
        lo, hi = bounds
        if hi == lo:
            return 0.5
        score = (value - lo) / (hi - lo)
        return 1 - score if inverse else score

    if not candidates:
        result = {
            "profiles": [],
            "summary": {
                "scanned": evaluated_count,
                "eligible": 0,
                "retained": 0,
                "totalEvaluations": total_evaluations,
                "engine": scan_engine,
                "workers": worker_count,
                "step": step,
                "minWeight": options["minWeight"],
                "maxWeight": options["maxWeight"],
                "maxDrawdown": options["maxDrawdown"],
                "limit": options["limit"],
                "contributionRate": options["contributionRate"],
                "cashflowStrategies": options["cashflowStrategies"],
            },
        }
        OPTIMIZE_CACHE[cache_key] = result
        if progress:
            progress(0.995, "finalize")
        return result

    if progress:
        progress(0.92, "score")
    cagr_values = metric_values("cagr")
    mdd_values = metric_values("mdd")
    vol_values = metric_values("vol")
    avg_nav_values = metric_values("averageNav")
    cagr_bounds = metric_bounds(cagr_values)
    mdd_bounds = metric_bounds(mdd_values)
    vol_bounds = metric_bounds(vol_values)
    avg_nav_bounds = metric_bounds(avg_nav_values)
    for candidate in candidates:
        score = candidate["score"]
        score["composite"] = (
            normalize(score["cagr"], cagr_bounds) * 0.35
            + normalize(score["mdd"], mdd_bounds) * 0.25
            + normalize(score["averageNav"], avg_nav_bounds) * 0.25
            + normalize(score["vol"], vol_bounds, inverse=True) * 0.15
        )
    if progress:
        progress(0.95, "rank")

    def percentile(values, ratio):
        ordered = sorted(values)
        if not ordered:
            return 0
        idx = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * ratio)))
        return ordered[idx]

    cagr_p75 = percentile(cagr_values, 0.75)
    cagr_p90 = percentile(cagr_values, 0.90)
    mdd_p75 = percentile(mdd_values, 0.75)
    avg_nav_p75 = percentile(avg_nav_values, 0.75)
    vol_p25 = percentile(vol_values, 0.25)

    def profile_tags(candidate):
        score = candidate["score"]
        tags = []
        if score["cagr"] >= cagr_p90:
            tags.append("高年化")
        elif score["cagr"] >= cagr_p75:
            tags.append("收益靠前")
        if score["mdd"] >= mdd_p75:
            tags.append("低回撤")
        if score["averageNav"] >= avg_nav_p75:
            tags.append("高平均净值")
        if score["vol"] <= vol_p25:
            tags.append("低波动")
        if candidate["metrics"].get("rebalanceCount", 0) <= 2:
            tags.append("少再平衡")
        if candidate.get("cashflow", {}).get("mode", "none") != "none":
            tags.append(cashflow_label(candidate.get("cashflow")))
        max_weight = max(candidate["weights"]) if candidate["weights"] else 0
        if max_weight >= 0.75:
            tags.append("高集中度")
        elif max_weight <= 0.45:
            tags.append("更分散")
        return tags[:4]

    def profile_reason(candidate):
        tags = profile_tags(candidate)
        score = candidate["score"]
        if "高年化" in tags:
            return f"年化 {score['cagr'] * 100:.1f}% 位于候选前列，适合作为收益上限参考。"
        if "低回撤" in tags and "高平均净值" in tags:
            return "回撤和平均净值同时靠前，适合作为均衡候选优先比较。"
        if "低回撤" in tags:
            return f"最大回撤 {score['mdd'] * 100:.1f}%，在候选中更稳健。"
        if "高平均净值" in tags:
            return "平均净值靠前，说明多数时间处在较高净值水平。"
        if "低波动" in tags:
            return "波动率处在候选低位，适合作为保守对照。"
        return "在收益、回撤和平均净值之间较均衡，适合作为对照候选。"

    def weight_distance(a, b):
        return sum(abs(a[i] - b[i]) for i in range(min(len(a), len(b))))

    selected = []
    selected_keys = set()

    def profile_key(row):
        return (
            tuple(round(w, 4) for w in row["weights"]),
            row["rebalance"]["mode"],
            round(row["rebalance"].get("threshold", 0), 4),
            row.get("cashflow", {}).get("mode", "none"),
            round(row.get("cashflow", {}).get("contributionRate", 0), 4),
        )

    def add_profile(kind, title, rows):
        for row in rows:
            key = profile_key(row)
            if key in selected_keys:
                continue
            selected.append({"key": key, "kind": kind, "title": title, **row})
            selected_keys.add(key)
            return

    def add_best_profile(kind, title, rows, sort_key, reverse=True):
        best_row = None
        best_value = None
        for row in rows:
            if profile_key(row) in selected_keys:
                continue
            value = sort_key(row)
            if best_row is None or (value > best_value if reverse else value < best_value):
                best_row = row
                best_value = value
        if best_row is not None:
            add_profile(kind, title, [best_row])

    def add_many(kind, title, rows, limit):
        added = 0
        for row in rows:
            key = profile_key(row)
            if key in selected_keys:
                continue
            selected.append({"key": key, "kind": kind, "title": title, **row})
            selected_keys.add(key)
            added += 1
            if added >= limit:
                return

    add_best_profile(
        "sharpe",
        "风险调整后最佳",
        candidates,
        lambda c: (c["score"]["sharpe0"], c["score"]["cagr"]),
    )
    add_best_profile(
        "calmar",
        "回撤效率最佳",
        candidates,
        lambda c: (c["score"]["calmar"], c["score"]["cagr"]),
    )
    add_best_profile(
        "return",
        "年化收益最高",
        candidates,
        lambda c: c["score"]["cagr"],
    )
    add_best_profile(
        "averageNav",
        "平均净值最高",
        candidates,
        lambda c: (c["score"]["averageNav"], c["score"]["cagr"]),
    )
    for limit in [0.20, 0.30, 0.40]:
        filtered = (c for c in candidates if c["score"]["mdd"] >= -limit)
        add_best_profile(
            f"mdd{int(limit*100)}",
            f"最大回撤不超过 {int(limit*100)}% 的最高年化",
            filtered,
            lambda c: c["score"]["cagr"],
        )
    add_best_profile(
        "lowvol",
        "正收益下最低波动",
        (c for c in candidates if c["score"]["cagr"] > 0),
        lambda c: (c["score"]["vol"], -c["score"]["cagr"]),
        reverse=False,
    )
    balanced_rows = sorted(
        candidates,
        key=lambda c: (c["score"]["composite"], c["score"]["cagr"]),
        reverse=True,
    )
    add_many(
        "balanced",
        "综合候选",
        balanced_rows,
        max(4, options["limit"] // 3),
    )
    add_many(
        "diverse",
        "差异候选",
        sorted(
            candidates,
            key=lambda c: min((weight_distance(c["weights"], s["weights"]) for s in selected), default=0),
            reverse=True,
        ),
        max(4, options["limit"] // 4),
    )
    add_many(
        "balanced",
        "综合候选",
        balanced_rows,
        options["limit"],
    )

    if progress:
        progress(0.97, "rank")
    for index, item in enumerate(selected, start=1):
        item.pop("key", None)
        item["rank"] = index
        item["tags"] = profile_tags(item)
        item["rankReason"] = profile_reason(item)
        item["score"]["composite"] = item["score"].get("composite", 0)
    result_profiles = selected[: options["limit"]]
    summary = {
        "scanned": evaluated_count,
        "eligible": len(candidates),
        "retained": len(result_profiles),
        "totalEvaluations": total_evaluations,
        "engine": scan_engine,
        "workers": worker_count,
        "step": step,
        "minWeight": options["minWeight"],
        "maxWeight": options["maxWeight"],
        "maxDrawdown": options["maxDrawdown"],
        "limit": options["limit"],
        "rebalanceModes": options["rebalanceModes"],
        "contributionRate": options["contributionRate"],
        "cashflowStrategies": options["cashflowStrategies"],
        "cagrRange": [min(cagr_values), max(cagr_values)],
        "drawdownRange": [min(mdd_values), max(mdd_values)],
        "averageNavRange": [min(avg_nav_values), max(avg_nav_values)],
        "volatilityRange": [min(vol_values), max(vol_values)],
    }
    result = {"profiles": result_profiles, "summary": summary}
    OPTIMIZE_CACHE[cache_key] = result
    if progress:
        progress(0.995, "finalize")
    return result


def parse_payload_assets(raw_assets):
    if not isinstance(raw_assets, list):
        raise ValueError("资产列表格式不正确。")
    asset_ids = []
    weights = []
    for item in raw_assets:
        if not isinstance(item, dict):
            raise ValueError("资产项格式不正确。")
        raw_id = item.get("id")
        if not isinstance(raw_id, str) or not raw_id.strip():
            raise ValueError("资产代码格式不正确。")
        asset_ids.append(raw_id.strip().upper())
        weights.append(float(item.get("weight", 0)))
    return asset_ids, weights


class PortfolioShareStore:
    def __init__(self, share_dir):
        self.share_dir = share_dir

    def create(self, portfolio):
        self.share_dir.mkdir(parents=True, exist_ok=True)
        record = {
            "version": 1,
            "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "portfolio": portfolio,
        }
        for _ in range(10):
            token = secrets.token_urlsafe(9)
            path = self._path(token)
            if path.exists():
                continue
            tmp_path = path.with_suffix(".tmp")
            tmp_path.write_text(json.dumps(record, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            tmp_path.replace(path)
            return token
        raise RuntimeError("生成分享链接失败，请稍后重试")

    def read(self, token):
        path = self._path(token)
        if not path.exists():
            raise ValueError("分享链接不存在或已失效")
        record = json.loads(path.read_text(encoding="utf-8"))
        portfolio = record.get("portfolio")
        if not isinstance(portfolio, dict):
            raise ValueError("分享内容无效")
        return portfolio

    def _path(self, token):
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,32}", str(token or "")):
            raise ValueError("分享链接无效")
        return self.share_dir / f"{token}.json"


SHARE_STORE = PortfolioShareStore(SHARE_DIR)


def clean_share_text(value, fallback="", limit=120):
    text = str(value or fallback).strip()
    return text[:limit]


def clean_share_date(value):
    text = str(value or "").strip()
    return text if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text) else ""


def clean_share_assets(raw_assets):
    if not isinstance(raw_assets, list) or not raw_assets:
        raise ValueError("分享组合至少需要一个标的")
    assets = []
    seen = set()
    for raw in raw_assets[:20]:
        asset_id = clean_share_text(raw.get("id"), limit=48)
        if not asset_id or asset_id in seen:
            continue
        seen.add(asset_id)
        assets.append({"id": asset_id, "weight": float(raw.get("weight", 0))})
    if not assets:
        raise ValueError("分享组合至少需要一个有效标的")
    return assets


def clean_share_rebalance(raw_rebalance):
    raw_rebalance = raw_rebalance if isinstance(raw_rebalance, dict) else {}
    mode = raw_rebalance.get("mode") if raw_rebalance.get("mode") in {"none", "monthly", "quarterly", "annual", "threshold"} else "none"
    threshold = float(raw_rebalance.get("threshold", 0.1) or 0.1)
    return {"mode": mode, "threshold": max(0.01, min(0.5, threshold))}


def clean_share_catalog(raw_catalog, assets):
    wanted = {asset["id"] for asset in assets}
    catalog = []
    if not isinstance(raw_catalog, list):
        return catalog
    for item in raw_catalog[:50]:
        asset_id = clean_share_text(item.get("id"), limit=48)
        if asset_id not in wanted:
            continue
        catalog.append(
            {
                "id": asset_id,
                "symbol": clean_share_text(item.get("symbol"), asset_id, 48),
                "name": clean_share_text(item.get("name"), asset_id, 120),
                "assetClass": clean_share_text(item.get("assetClass"), limit=48),
                "currency": clean_share_text(item.get("currency"), limit=12),
                "hintStart": clean_share_text(item.get("hintStart"), limit=16),
                "lastDate": clean_share_text(item.get("lastDate"), limit=16),
                "dataCount": int(item.get("dataCount") or 0),
                "disabledReason": clean_share_text(item.get("disabledReason"), limit=40),
                "exchange": clean_share_text(item.get("exchange"), limit=48),
                "dynamic": bool(item.get("dynamic")),
            }
        )
    return catalog


def clean_share_number(value, fallback=None):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def clean_share_number_list(values, limit=12000):
    if not isinstance(values, list):
        return []
    cleaned = []
    for value in values[:limit]:
        number = clean_share_number(value)
        if number is None:
            return []
        cleaned.append(number)
    return cleaned


def clean_share_date_list(values, limit=12000):
    if not isinstance(values, list):
        return []
    cleaned = []
    for value in values[:limit]:
        date = clean_share_date(value)
        if not date:
            return []
        cleaned.append(date)
    return cleaned


def clean_share_metrics(raw_metrics):
    if not isinstance(raw_metrics, dict):
        return {}
    cleaned = {}
    for key, value in raw_metrics.items():
        if key in {"start", "end", "drawdownPeak", "drawdownTrough"}:
            cleaned[key] = clean_share_text(value, limit=16)
        elif key == "withdrawal4" and isinstance(value, dict):
            cleaned[key] = {
                "cagr": clean_share_number(value.get("cagr")),
                "terminal": clean_share_number(value.get("terminal")),
                "depleted": bool(value.get("depleted")),
                "depletedDate": clean_share_text(value.get("depletedDate"), limit=16),
            }
        else:
            number = clean_share_number(value)
            if number is not None:
                cleaned[key] = number
    return cleaned


def clean_share_rebalance_events(raw_events, asset_count, limit=2000):
    if not isinstance(raw_events, list):
        return []
    events = []
    for raw in raw_events[:limit]:
        if not isinstance(raw, dict):
            continue
        before = clean_share_number_list(raw.get("before"), asset_count)
        if len(before) != asset_count:
            continue
        events.append(
            {
                "date": clean_share_date(raw.get("date")),
                "nav": clean_share_number(raw.get("nav"), 0),
                "before": before,
            }
        )
    return [event for event in events if event["date"]]


def clean_share_correlation(raw_correlation, asset_count):
    if not isinstance(raw_correlation, list):
        return []
    matrix = []
    for row in raw_correlation[:asset_count]:
        values = clean_share_number_list(row, asset_count)
        if len(values) != asset_count:
            return []
        matrix.append(values)
    return matrix if len(matrix) == asset_count else []


def clean_share_asset_series(raw_series, asset_count, date_count):
    if not isinstance(raw_series, list):
        return []
    series = []
    for row in raw_series[:asset_count]:
        values = clean_share_number_list(row, date_count)
        if len(values) != date_count:
            return []
        series.append(values)
    return series if len(series) == asset_count else []


def clean_share_result(raw_result, assets):
    if not isinstance(raw_result, dict):
        return None
    dates = clean_share_date_list(raw_result.get("dates"))
    nav = clean_share_number_list(raw_result.get("nav"), len(dates))
    drawdowns = clean_share_number_list(raw_result.get("drawdowns"), len(dates))
    if not dates or len(nav) != len(dates) or len(drawdowns) != len(dates):
        return None
    result_assets = clean_share_catalog(raw_result.get("assets"), assets)
    if not result_assets:
        result_assets = clean_share_catalog(raw_result.get("catalog"), assets)
    if not result_assets:
        result_assets = [{**asset, "weight": asset["weight"] / 100} for asset in assets]
    asset_count = len(assets)
    result = {
        "assets": result_assets,
        "dates": dates,
        "nav": nav,
        "drawdowns": drawdowns,
        "weightsTimeline": [],
        "rebalanceEvents": clean_share_rebalance_events(raw_result.get("rebalanceEvents"), asset_count),
        "metrics": clean_share_metrics(raw_result.get("metrics")),
        "correlation": clean_share_correlation(raw_result.get("correlation"), asset_count),
        "assetSeries": clean_share_asset_series(raw_result.get("assetSeries"), asset_count, len(dates)),
        "assetStats": [],
        "cashflow": clean_cashflow(raw_result.get("cashflow")),
    }
    return result


def sampled_share_curve_from_result(result, limit=160):
    if not result:
        return []
    dates = result.get("dates") or []
    nav = result.get("nav") or []
    if not dates or not nav:
        return []
    if len(dates) <= limit:
        indexes = range(len(dates))
    else:
        indexes = sorted({round(i * (len(dates) - 1) / (limit - 1)) for i in range(limit)})
    return [{"date": dates[index], "value": nav[index]} for index in indexes]


def clean_share_curve(raw_curve, limit=12000):
    if not isinstance(raw_curve, list):
        return []
    curve = []
    for raw in raw_curve[:limit]:
        if not isinstance(raw, dict):
            continue
        date = clean_share_date(raw.get("date"))
        value = clean_share_number(raw.get("value"))
        if date and value is not None:
            curve.append({"date": date, "value": value})
    return curve


def clean_share_portfolio(raw_portfolio):
    raw_portfolio = raw_portfolio if isinstance(raw_portfolio, dict) else {}
    assets = clean_share_assets(raw_portfolio.get("assets"))
    portfolio = {
        "name": clean_share_text(raw_portfolio.get("name"), "Shared Portfolio"),
        "createdAt": clean_share_text(raw_portfolio.get("createdAt"), "", 32)
        or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "assets": assets,
        "rebalance": clean_share_rebalance(raw_portfolio.get("rebalance")),
        "cashflow": clean_cashflow(raw_portfolio.get("cashflow")),
        "start": clean_share_date(raw_portfolio.get("start")),
        "end": clean_share_date(raw_portfolio.get("end")),
        "catalog": clean_share_catalog(raw_portfolio.get("catalog"), assets),
    }
    result = clean_share_result(raw_portfolio.get("result"), assets)
    if result:
        portfolio["result"] = result
        portfolio["cashflow"] = result.get("cashflow", portfolio["cashflow"])
        portfolio["metrics"] = result.get("metrics", {})
        portfolio["curve"] = sampled_share_curve_from_result(result)
        portfolio["catalog"] = clean_share_catalog(result.get("assets"), assets) or portfolio["catalog"]
    else:
        portfolio["metrics"] = clean_share_metrics(raw_portfolio.get("metrics"))
        curve = clean_share_curve(raw_portfolio.get("curve"))
        if curve:
            portfolio["curve"] = curve
    return portfolio


def json_response(handler, payload, status=200):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    add_share_cors_headers(handler)
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def add_share_cors_headers(handler):
    parsed = urllib.parse.urlparse(handler.path)
    if parsed.path != "/api/share":
        return
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, X-Access-Key, Authorization")
    handler.send_header("Access-Control-Max-Age", "86400")


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


class ClientDisconnected(RuntimeError):
    pass


def operation_error_payload(exc):
    if isinstance(exc, MarketDataUnavailable):
        return {
            "error": str(exc),
            "kind": "market_data_unavailable",
            "asset": exc.asset_id,
            "sourceStatus": exc.status,
            "status": 502,
        }
    if isinstance(exc, ValueError):
        return {"error": str(exc), "status": 400}
    return {"error": str(exc), "status": 500}


def stream_operation(handler, operation):
    handler.send_response(200)
    handler.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Accel-Buffering", "no")
    handler.send_header("Connection", "close")
    handler.end_headers()
    handler.close_connection = True

    def emit(payload):
        try:
            data = (json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
            handler.wfile.write(data)
            handler.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError) as exc:
            raise ClientDisconnected() from exc

    def progress(value, stage, detail=""):
        emit(
            {
                "type": "progress",
                "progress": max(0.0, min(1.0, float(value))),
                "stage": str(stage or ""),
                "detail": str(detail or ""),
            }
        )

    try:
        result = operation(progress)
        progress(1.0, "complete")
        emit({"type": "result", "data": result})
    except ClientDisconnected:
        return
    except Exception as exc:
        try:
            emit({"type": "error", **operation_error_payload(exc)})
        except ClientDisconnected:
            return


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def log_message(self, format, *args):
        print(f"[server] {self.address_string()} - {format % args}")

    def do_OPTIONS(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/share":
            self.send_response(204)
            add_share_cors_headers(self)
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path in ("", "/", "/index.html"):
                serve_index(self)
                return
            if parsed.path == "/api/share":
                token = urllib.parse.parse_qs(parsed.query).get("token", [""])[0].strip()
                json_response(self, {"portfolio": SHARE_STORE.read(token)})
                return
            if parsed.path.startswith("/api/") and not require_api_key(self):
                return
            if parsed.path == "/api/search":
                query = urllib.parse.parse_qs(parsed.query).get("q", [""])[0].lower().strip()
                json_response(self, {"items": search_assets(query)})
                return
            if parsed.path == "/api/catalog":
                json_response(self, {"items": [public_asset_meta(enrich_asset_market_profile(item)) for item in CATALOG]})
                return
            super().do_GET()
        except ValueError as exc:
            json_response(self, {"error": str(exc)}, 400)
        except MarketDataUnavailable as exc:
            json_response(
                self,
                {
                    "error": str(exc),
                    "kind": "market_data_unavailable",
                    "asset": exc.asset_id,
                    "sourceStatus": exc.status,
                },
                502,
            )
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
            if self.path == "/api/backtest/stream":
                asset_ids, weights = parse_payload_assets(payload.get("assets", []))
                stream_operation(
                    self,
                    lambda progress: backtest_portfolio(
                        asset_ids,
                        weights,
                        payload.get("rebalance", {"mode": "annual", "threshold": 0.10}),
                        payload.get("start") or None,
                        payload.get("end") or None,
                        payload.get("cashflow"),
                        progress,
                    ),
                )
                return
            if self.path == "/api/optimize/stream":
                asset_ids, _ = parse_payload_assets(payload.get("assets", []))
                stream_operation(
                    self,
                    lambda progress: optimize_portfolio(
                        asset_ids,
                        payload.get("start") or None,
                        payload.get("end") or None,
                        payload.get("optimize") or {},
                        progress,
                    ),
                )
                return
            if self.path == "/api/backtest":
                asset_ids, weights = parse_payload_assets(payload.get("assets", []))
                result = backtest_portfolio(
                    asset_ids,
                    weights,
                    payload.get("rebalance", {"mode": "annual", "threshold": 0.10}),
                    payload.get("start") or None,
                    payload.get("end") or None,
                    payload.get("cashflow"),
                )
                json_response(self, result)
                return
            if self.path == "/api/optimize":
                asset_ids, _ = parse_payload_assets(payload.get("assets", []))
                result = optimize_portfolio(
                    asset_ids,
                    payload.get("start") or None,
                    payload.get("end") or None,
                    payload.get("optimize") or {},
                )
                json_response(self, result)
                return
            if self.path == "/api/share":
                portfolio = clean_share_portfolio(payload.get("portfolio") or payload)
                token = SHARE_STORE.create(portfolio)
                json_response(self, {"token": token, "portfolio": portfolio})
                return
            json_response(self, {"error": "未知接口"}, 404)
        except ValueError as exc:
            json_response(self, {"error": str(exc)}, 400)
        except MarketDataUnavailable as exc:
            json_response(
                self,
                {
                    "error": str(exc),
                    "kind": "market_data_unavailable",
                    "asset": exc.asset_id,
                    "sourceStatus": exc.status,
                },
                502,
            )
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
    multiprocessing.freeze_support()
    main()
