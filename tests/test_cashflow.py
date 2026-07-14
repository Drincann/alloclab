import unittest

import server


class CashflowSimulationTests(unittest.TestCase):
    def test_zero_rate_disables_cashflow(self):
        self.assertEqual(
            server.clean_cashflow({"mode": "underweight", "contributionRate": 0}),
            {"mode": "none", "contributionRate": 0.0, "frequency": "monthly"},
        )

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
