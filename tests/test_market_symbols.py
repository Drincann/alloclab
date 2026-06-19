import unittest

import server


class MarketProviderSymbolTests(unittest.TestCase):
    def test_catalog_yahoo_assets_use_explicit_provider_symbols(self):
        spy = server.CATALOG_BY_ID["SPY"]

        self.assertEqual(server.provider_symbols(spy, "yahoo_chart"), ["SPY"])
        self.assertEqual(server.provider_symbols(spy, "stooq"), ["spy.us"])
        self.assertEqual(server.provider_symbols(spy, "eastmoney_us"), ["106.SPY", "105.SPY"])
        self.assertEqual(server.provider_symbols(spy, "sina_us"), ["SPY"])

    def test_dynamic_plain_us_yahoo_symbol_can_fallback(self):
        meta = server.get_dynamic_yahoo_meta("Y:AAPL")

        self.assertEqual(server.provider_symbols(meta, "stooq"), ["aapl.us"])
        self.assertEqual(server.provider_symbols(meta, "eastmoney_us"), ["105.AAPL", "106.AAPL"])
        self.assertEqual(server.provider_symbols(meta, "sina_us"), ["AAPL"])

    def test_dynamic_non_plain_yahoo_symbol_does_not_guess_fallback_symbols(self):
        for symbol in ["0700.HK", "BTC-USD", "^GSPC", "BRK-B", "SPY.US"]:
            meta = {"id": f"Y:{symbol}", "symbol": symbol, "source": "yahoo"}
            with self.subTest(symbol=symbol):
                self.assertEqual(server.provider_symbols(meta, "stooq"), [])
                self.assertEqual(server.provider_symbols(meta, "eastmoney_us"), [])
                self.assertEqual(server.provider_symbols(meta, "sina_us"), [])

    def test_stooq_fetch_wrapper_caches_by_native_symbol(self):
        original_cached_provider_fetch = server.cached_provider_fetch
        calls = []

        def fake_cached_provider_fetch(source, symbol, _fetcher):
            calls.append((source, symbol))
            return []

        try:
            server.cached_provider_fetch = fake_cached_provider_fetch

            server.fetch_stooq_daily("SPY")
            server.fetch_stooq_daily("spy.us")

            self.assertEqual(calls, [("stooq", "spy.us"), ("stooq", "spy.us")])
        finally:
            server.cached_provider_fetch = original_cached_provider_fetch

    def test_yahoo_fallback_uses_provider_native_symbol(self):
        original_fetch_yahoo_chart = server.fetch_yahoo_chart
        original_fallback_fetchers = server.YAHOO_FALLBACK_FETCHERS
        calls = []
        rows = [
            {"date": "2020-01-01", "close": 1.0},
            {"date": "2020-01-02", "close": 1.1},
        ]

        def raise_yahoo(_symbol):
            raise RuntimeError("yahoo unavailable")

        def fake_stooq(symbol):
            calls.append(symbol)
            return rows

        try:
            server.fetch_yahoo_chart = raise_yahoo
            server.YAHOO_FALLBACK_FETCHERS = {"stooq": fake_stooq}
            meta = {"id": "Y:AAPL", "symbol": "AAPL", "source": "yahoo", "hintStart": "2020-01-01"}

            self.assertEqual(server._yahoo_series_with_backfill(meta, meta["symbol"]), rows)
            self.assertEqual(calls, ["aapl.us"])
        finally:
            server.fetch_yahoo_chart = original_fetch_yahoo_chart
            server.YAHOO_FALLBACK_FETCHERS = original_fallback_fetchers

    def test_yahoo_fallback_skips_symbols_without_safe_provider_mapping(self):
        original_fetch_yahoo_chart = server.fetch_yahoo_chart
        original_fallback_fetchers = server.YAHOO_FALLBACK_FETCHERS
        calls = []

        def raise_yahoo(_symbol):
            raise RuntimeError("yahoo unavailable")

        def should_not_call(symbol):
            calls.append(symbol)
            return [{"date": "2020-01-01", "close": 1.0}]

        try:
            server.fetch_yahoo_chart = raise_yahoo
            server.YAHOO_FALLBACK_FETCHERS = {"stooq": should_not_call}
            meta = {"id": "Y:BTC-USD", "symbol": "BTC-USD", "source": "yahoo", "hintStart": "2020-01-01"}

            with self.assertRaises(server.MarketDataUnavailable):
                server._yahoo_series_with_backfill(meta, meta["symbol"])
            self.assertEqual(calls, [])
        finally:
            server.fetch_yahoo_chart = original_fetch_yahoo_chart
            server.YAHOO_FALLBACK_FETCHERS = original_fallback_fetchers


if __name__ == "__main__":
    unittest.main()
