import io
import json
import os
import unittest
from datetime import date, timedelta
from unittest.mock import patch

import server


def synthetic_rows(multiplier=1.0):
    rows = []
    for index in range(90):
        month = 1 + index // 28
        day = 1 + index % 28
        rows.append(
            {
                "date": f"2020-{month:02d}-{day:02d}",
                "close": multiplier * (100 + index * 0.15 + ((index % 9) - 4) * 0.7),
            }
        )
    return rows


def synthetic_market_rows(asset_index, day_count=500):
    rows = []
    current = date(2019, 1, 2)
    trading_day = 0
    while trading_day < day_count:
        if current.weekday() < 5:
            cycle = ((trading_day * (asset_index + 5)) % 31) - 15
            close = 100 * (1 + 0.0002 * (asset_index + 1)) ** trading_day
            close *= 1 + cycle * 0.002
            rows.append({"date": current.isoformat(), "close": close})
            trading_day += 1
        current += timedelta(days=1)
    return rows


class ScanEquivalenceTests(unittest.TestCase):
    def test_fast_scan_metrics_match_full_metrics(self):
        dates = [row["date"] for row in synthetic_rows()]
        prices = [
            [row["close"] for row in synthetic_rows(1.0)],
            [row["close"] * (1 + ((index % 7) - 3) * 0.002) for index, row in enumerate(synthetic_rows(0.9))],
        ]
        context = server.build_simulation_context(dates, prices)
        metric_names = [
            "totalReturn",
            "cagr",
            "volatility",
            "maxDrawdown",
            "sharpe0",
            "calmar",
            "averageNav",
            "rebalanceCount",
            "cashflowCount",
            "cashflowTotal",
            "capitalEquivalentCagr",
        ]
        cases = [
            ({"mode": "none", "threshold": 0.1}, {"mode": "none", "contributionRate": 0}),
            ({"mode": "annual", "threshold": 0.1}, {"mode": "target", "contributionRate": 0.01}),
            ({"mode": "threshold", "threshold": 0.04}, {"mode": "underweight", "contributionRate": 0.01}),
            ({"mode": "quarterly", "threshold": 0.1}, {"mode": "drift", "contributionRate": 0.01}),
        ]

        for rebalance, cashflow in cases:
            with self.subTest(rebalance=rebalance["mode"], cashflow=cashflow["mode"]):
                full_metrics, _, full_nav, _, _ = server.simulate_portfolio(
                    dates,
                    prices,
                    [0.6, 0.4],
                    rebalance,
                    collect_details=False,
                    cashflow=cashflow,
                    simulation_context=context,
                )
                scan_metrics, _, scan_nav, _, _ = server.simulate_portfolio(
                    dates,
                    prices,
                    [0.6, 0.4],
                    rebalance,
                    collect_details=False,
                    cashflow=cashflow,
                    simulation_context=context,
                    metrics_mode="scan",
                )

                self.assertEqual(scan_nav, full_nav)
                for name in metric_names:
                    self.assertEqual(scan_metrics[name], full_metrics[name], name)

    def test_parallel_optimizer_matches_single_process_exactly(self):
        series = {
            "A": synthetic_rows(1.0),
            "B": synthetic_rows(0.9),
            "C": synthetic_rows(1.1),
        }
        options = {
            "step": 0.2,
            "rebalanceModes": ["none", "annual", "threshold"],
            "contributionRate": 0.01,
            "cashflowStrategies": ["target", "underweight"],
            "limit": 12,
        }
        original_cache = server.OPTIMIZE_CACHE.copy()
        try:
            with (
                patch.object(server, "get_series", side_effect=lambda symbol: series[symbol]),
                patch.object(server, "MIN_PARALLEL_SCAN_EVALUATIONS", 1),
            ):
                with patch.dict(
                    os.environ,
                    {server.SCAN_WORKERS_ENV: "1", server.SCAN_ENGINE_ENV: "python"},
                ):
                    server.OPTIMIZE_CACHE.clear()
                    sequential = server.optimize_portfolio(["A", "B", "C"], options=options)
                with patch.dict(
                    os.environ,
                    {server.SCAN_WORKERS_ENV: "2", server.SCAN_ENGINE_ENV: "python"},
                ):
                    server.OPTIMIZE_CACHE.clear()
                    parallel = server.optimize_portfolio(["A", "B", "C"], options=options)
        finally:
            server.OPTIMIZE_CACHE.clear()
            server.OPTIMIZE_CACHE.update(original_cache)

        self.assertEqual(sequential["summary"]["workers"], 1)
        self.assertEqual(parallel["summary"]["workers"], 2)
        self.assertEqual(sequential["profiles"], parallel["profiles"])
        self.assertEqual(
            {key: value for key, value in sequential["summary"].items() if key != "workers"},
            {key: value for key, value in parallel["summary"].items() if key != "workers"},
        )

    @unittest.skipIf(server.np is None, "NumPy is unavailable")
    def test_numpy_scan_matches_python_metrics(self):
        market_rows = [synthetic_market_rows(index) for index in range(3)]
        dates = [row["date"] for row in market_rows[0]]
        prices = [
            [row["close"] for row in rows]
            for rows in market_rows
        ]
        weights = server.generate_weight_grid(3, step=0.2)
        rules = [
            {"mode": "none", "threshold": 0.1},
            {"mode": "annual", "threshold": 0.1},
            {"mode": "quarterly", "threshold": 0.1},
            {"mode": "threshold", "threshold": 0.08},
            {"mode": "threshold", "threshold": 0.20},
        ]
        cashflows = [
            {"mode": "none", "contributionRate": 0},
            {"mode": "target", "contributionRate": 0.01},
            {"mode": "underweight", "contributionRate": 0.01},
            {"mode": "drift", "contributionRate": 0.01},
        ]
        context = server.build_simulation_context(dates, prices)
        python_result = server.evaluate_optimize_weight_chunk(
            dates, prices, weights, rules, cashflows, None, context
        )
        numpy_result = server.evaluate_optimize_numpy_chunk(
            dates, prices, weights, rules, cashflows, None, context
        )

        self.assertEqual(python_result[:2], numpy_result[:2])
        self.assertEqual(len(python_result[2]), len(numpy_result[2]))
        metric_names = [
            "totalReturn",
            "cagr",
            "volatility",
            "maxDrawdown",
            "sharpe0",
            "calmar",
            "averageNav",
            "rebalanceCount",
            "cashflowCount",
            "cashflowTotal",
            "capitalEquivalentCagr",
        ]
        for python_row, numpy_row in zip(python_result[2], numpy_result[2]):
            self.assertEqual(python_row[:3], numpy_row[:3])
            for name in metric_names:
                python_value = python_row[3][name]
                numpy_value = numpy_row[3][name]
                if isinstance(python_value, float):
                    self.assertAlmostEqual(python_value, numpy_value, places=12, msg=name)
                else:
                    self.assertEqual(python_value, numpy_value, name)

    @unittest.skipIf(server.np is None, "NumPy is unavailable")
    def test_numpy_optimizer_selects_same_profiles_as_python(self):
        series = {f"A{index}": synthetic_market_rows(index) for index in range(3)}
        options = {
            "step": 0.2,
            "rebalanceModes": ["none", "annual", "quarterly", "threshold"],
            "contributionRate": 0.01,
            "cashflowStrategies": ["target", "underweight", "drift"],
            "limit": 24,
        }
        original_cache = server.OPTIMIZE_CACHE.copy()
        try:
            with (
                patch.object(server, "get_series", side_effect=lambda symbol: series[symbol]),
                patch.object(server, "MIN_PARALLEL_SCAN_EVALUATIONS", 1),
            ):
                with patch.dict(
                    os.environ,
                    {server.SCAN_ENGINE_ENV: "python", server.SCAN_WORKERS_ENV: "1"},
                ):
                    server.OPTIMIZE_CACHE.clear()
                    python_result = server.optimize_portfolio(list(series), options=options)
                with patch.dict(
                    os.environ,
                    {server.SCAN_ENGINE_ENV: "numpy", server.SCAN_WORKERS_ENV: "1"},
                ):
                    server.OPTIMIZE_CACHE.clear()
                    numpy_result = server.optimize_portfolio(list(series), options=options)
        finally:
            server.OPTIMIZE_CACHE.clear()
            server.OPTIMIZE_CACHE.update(original_cache)

        def identity(profile):
            return (
                profile["weights"],
                profile["rebalance"],
                profile["cashflow"],
                profile["kind"],
                profile["rank"],
            )

        self.assertEqual(
            [identity(profile) for profile in python_result["profiles"]],
            [identity(profile) for profile in numpy_result["profiles"]],
        )
        for python_profile, numpy_profile in zip(
            python_result["profiles"], numpy_result["profiles"]
        ):
            for name, python_value in python_profile["metrics"].items():
                numpy_value = numpy_profile["metrics"][name]
                if isinstance(python_value, float):
                    self.assertAlmostEqual(python_value, numpy_value, places=12, msg=name)
                else:
                    self.assertEqual(python_value, numpy_value, name)


class ProgressTests(unittest.TestCase):
    def test_optimizer_progress_is_monotonic_and_reaches_result(self):
        series = {"A": synthetic_rows(1.0), "B": synthetic_rows(0.9)}
        progress_events = []
        original_cache = server.OPTIMIZE_CACHE.copy()
        server.OPTIMIZE_CACHE.clear()
        try:
            with patch.object(server, "get_series", side_effect=lambda symbol: series[symbol]):
                result = server.optimize_portfolio(
                    ["A", "B"],
                    options={
                        "step": 0.2,
                        "rebalanceModes": ["none", "annual", "threshold"],
                        "contributionRate": 0.01,
                        "cashflowStrategies": ["target", "underweight"],
                        "limit": 8,
                    },
                    progress=lambda value, stage, detail="": progress_events.append((value, stage, detail)),
                )
        finally:
            server.OPTIMIZE_CACHE.clear()
            server.OPTIMIZE_CACHE.update(original_cache)

        values = [event[0] for event in progress_events]
        stages = {event[1] for event in progress_events}
        self.assertTrue(result["profiles"])
        self.assertIn("equivalentCagrRange", result["summary"])
        for profile in result["profiles"]:
            self.assertAlmostEqual(
                profile["score"]["annualized"],
                profile["metrics"]["capitalEquivalentCagr"],
            )
        self.assertEqual(values, sorted(values))
        self.assertIn("scan", stages)
        self.assertIn("score", stages)
        self.assertGreaterEqual(values[-1], 0.99)

    def test_stream_operation_emits_progress_then_result(self):
        class FakeHandler:
            def __init__(self):
                self.wfile = io.BytesIO()
                self.headers = []
                self.status = None
                self.close_connection = False

            def send_response(self, status):
                self.status = status

            def send_header(self, name, value):
                self.headers.append((name, value))

            def end_headers(self):
                return None

        handler = FakeHandler()

        def operation(progress):
            progress(0.25, "market", "QQQ")
            progress(0.75, "simulate")
            return {"ok": True}

        server.stream_operation(handler, operation)
        events = [json.loads(line) for line in handler.wfile.getvalue().decode("utf-8").splitlines()]

        self.assertEqual(handler.status, 200)
        self.assertEqual(events[0]["type"], "progress")
        self.assertEqual(events[-1], {"type": "result", "data": {"ok": True}})
        self.assertEqual(events[-2]["stage"], "complete")


if __name__ == "__main__":
    unittest.main()
