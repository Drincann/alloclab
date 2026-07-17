import unittest
from datetime import date, timedelta
from unittest.mock import patch

import server


class CashflowSimulationTests(unittest.TestCase):
    def test_zero_rate_disables_cashflow(self):
        self.assertEqual(
            server.clean_cashflow({"mode": "underweight", "contributionRate": 0}),
            {"mode": "none", "contributionRate": 0.0, "frequency": "monthly"},
        )

    def test_full_initial_capital_monthly_rate_is_not_clamped(self):
        self.assertEqual(
            server.clean_cashflow({"mode": "drift", "contributionRate": 1}),
            {"mode": "drift", "contributionRate": 1.0, "frequency": "monthly"},
        )
        options = server.clean_optimize_options(
            {"contributionRate": 1, "cashflowStrategies": ["drift"]},
            2,
        )
        self.assertEqual(options["contributionRate"], 1.0)
        self.assertEqual(options["cashflowStrategies"], ["drift"])

    def test_underweight_strategy_buys_the_underweight_asset_first(self):
        allocations, cash = server.allocate_contribution(
            "underweight",
            0.1,
            [0.5, 0.5],
            [0.8, 0.2],
            [1.0, 1.0],
            0.0,
        )

        self.assertAlmostEqual(allocations[0], 0.0)
        self.assertAlmostEqual(allocations[1], 0.1)
        self.assertAlmostEqual(cash, 0.0)

    def test_cashflow_allocation_conserves_capital_with_leverage(self):
        target_allocations, target_cash = server.allocate_contribution(
            "target",
            0.1,
            [0.8, 0.4],
            [0.008, 0.004],
            [100.0, 100.0],
            -0.2,
        )
        drift_allocations, drift_cash = server.allocate_contribution(
            "drift",
            0.1,
            [0.8, 0.4],
            [0.008, 0.004],
            [100.0, 100.0],
            -0.2,
        )

        self.assertAlmostEqual(sum(target_allocations) + target_cash, 0.1)
        self.assertAlmostEqual(sum(drift_allocations) + drift_cash, 0.1)

    def test_flat_market_cashflows_do_not_inflate_time_weighted_return(self):
        dates = ["2020-01-31", "2020-02-28", "2020-03-31"]
        prices = [[1.0, 1.0, 1.0], [1.0, 1.0, 1.0]]

        metrics, _, nav, _, _ = server.simulate_portfolio(
            dates,
            prices,
            [0.5, 0.5],
            {"mode": "none", "threshold": 0.1},
            cashflow={"mode": "target", "contributionRate": 0.01},
        )

        self.assertEqual(nav, [1.0, 1.0, 1.0])
        self.assertEqual(metrics["cashflowCount"], 2)
        self.assertAlmostEqual(metrics["cashflowTotal"], 0.02)
        self.assertAlmostEqual(metrics["totalReturn"], 0.0)
        self.assertAlmostEqual(metrics["investedCapital"], 1.02)
        self.assertAlmostEqual(metrics["terminalValue"], 1.02)
        self.assertAlmostEqual(metrics["netProfit"], 0.0)
        self.assertAlmostEqual(metrics["moneyWeightedReturn"], 0.0)
        self.assertAlmostEqual(metrics["capitalEquivalentCagr"], 0.0)

    def test_drift_cashflow_preserves_strategy_return_but_changes_investor_outcome(self):
        dates = ["2020-01-02", "2020-01-31", "2020-02-28", "2020-03-31"]
        prices = [[100.0, 200.0, 100.0, 200.0]]
        rebalance = {"mode": "none", "threshold": 0.1}

        lump_sum_metrics, _, _, _, _ = server.simulate_portfolio(
            dates,
            prices,
            [1.0],
            rebalance,
        )
        cashflow_metrics, _, _, _, _ = server.simulate_portfolio(
            dates,
            prices,
            [1.0],
            rebalance,
            cashflow={"mode": "drift", "contributionRate": 1.0},
        )

        self.assertAlmostEqual(cashflow_metrics["cagr"], lump_sum_metrics["cagr"])
        self.assertAlmostEqual(cashflow_metrics["investedCapital"], 3.0)
        self.assertAlmostEqual(cashflow_metrics["terminalValue"], 5.0)
        self.assertAlmostEqual(cashflow_metrics["netProfit"], 2.0)
        self.assertNotAlmostEqual(
            cashflow_metrics["moneyWeightedReturn"],
            lump_sum_metrics["moneyWeightedReturn"],
        )

    def test_late_contribution_is_visible_in_total_invested_return(self):
        metrics = server.investor_metrics(
            "2020-01-01",
            "2020-12-31",
            1_000_000.2,
            [("2020-12-31", 999_999.0)],
        )

        self.assertAlmostEqual(metrics["investedCapital"], 1_000_000.0)
        self.assertAlmostEqual(metrics["netProfit"], 0.2)
        self.assertAlmostEqual(metrics["netProfitRate"], 0.0000002)
        self.assertGreater(metrics["moneyWeightedReturn"], 0.19)
        self.assertLess(metrics["capitalEquivalentCagr"], 0.000001)

    def test_backtest_compares_cashflow_with_true_lump_sum_run(self):
        start = date(2020, 1, 2)
        rows = [
            {
                "date": (start + timedelta(days=index)).isoformat(),
                "close": 100 * (1.001 ** index),
            }
            for index in range(90)
        ]
        metadata = {"id": "A", "symbol": "A", "name": "Asset A"}
        with (
            patch.object(server, "get_series", return_value=rows),
            patch.object(server, "get_asset_meta", return_value=metadata),
        ):
            result = server.backtest_portfolio(
                ["A"],
                [100],
                {"mode": "none", "threshold": 0.1},
                cashflow={"mode": "drift", "contributionRate": 1.0},
            )

        metrics = result["metrics"]
        self.assertAlmostEqual(metrics["investedCapital"], 3.0)
        expected_lump_sum_terminal = metrics["investedCapital"] * rows[-1]["close"] / rows[0]["close"]
        self.assertAlmostEqual(metrics["lumpSumTerminalValue"], expected_lump_sum_terminal)
        self.assertAlmostEqual(
            metrics["lumpSumDifference"],
            metrics["terminalValue"] / expected_lump_sum_terminal - 1,
        )

    def test_underweight_cashflow_can_avoid_a_threshold_rebalance(self):
        dates = ["2020-01-02", "2020-01-31", "2020-02-03"]
        prices = [[100.0, 150.0, 150.0], [100.0, 100.0, 100.0]]
        rebalance = {"mode": "threshold", "threshold": 0.08}

        target_metrics, _, _, _, _ = server.simulate_portfolio(
            dates,
            prices,
            [0.5, 0.5],
            rebalance,
            cashflow={"mode": "target", "contributionRate": 0.2},
        )
        underweight_metrics, _, _, _, _ = server.simulate_portfolio(
            dates,
            prices,
            [0.5, 0.5],
            rebalance,
            cashflow={"mode": "underweight", "contributionRate": 0.2},
        )

        self.assertEqual(target_metrics["rebalanceCount"], 1)
        self.assertEqual(underweight_metrics["rebalanceCount"], 0)

    def test_no_cashflow_preserves_lump_sum_nav(self):
        dates = ["2020-01-02", "2020-01-03", "2020-01-06"]
        prices = [[100.0, 110.0, 121.0], [100.0, 90.0, 81.0]]

        metrics, _, nav, _, _ = server.simulate_portfolio(
            dates,
            prices,
            [0.5, 0.5],
            {"mode": "none", "threshold": 0.1},
        )

        self.assertEqual(nav, [1.0, 1.0, 1.01])
        self.assertEqual(metrics["cashflowCount"], 0)

    def test_scan_defaults_include_no_rebalance(self):
        options = server.clean_optimize_options({}, 2)

        self.assertIn("none", options["rebalanceModes"])
        self.assertEqual(options["cashflowStrategies"], ["none"])

    def test_positive_contribution_scans_requested_cashflow_strategies(self):
        options = server.clean_optimize_options(
            {
                "contributionRate": 0.01,
                "cashflowStrategies": ["target", "underweight", "drift"],
            },
            2,
        )

        self.assertAlmostEqual(options["contributionRate"], 0.01)
        self.assertEqual(options["cashflowStrategies"], ["target", "underweight", "drift"])


if __name__ == "__main__":
    unittest.main()
