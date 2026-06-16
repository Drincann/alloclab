const state = {
  catalog: [],
  assets: [
    { id: "QQQ", weight: 60 },
    { id: "GLD", weight: 40 },
  ],
  rebalance: { mode: "threshold", threshold: 0.2 },
  result: null,
  view: null,
  selection: null,
  hoverIndex: null,
  loading: false,
  pendingBacktestResetView: null,
  backtestDirty: false,
  optimizing: false,
  optimizerProfiles: [],
  favorites: [],
  extraCatalog: [],
  chartScale: "linear",
  visibleSeries: { portfolio: true, assets: {} },
  backtestError: null,
  bootstrapped: false,
  language: "zh",
  theme: "light",
  themePreference: "system",
  shareDialog: null,
};

const els = {
  authOverlay: document.getElementById("authOverlay"),
  authForm: document.getElementById("authForm"),
  authKeyInput: document.getElementById("authKeyInput"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  authError: document.getElementById("authError"),
  authHelpLink: document.getElementById("authHelpLink"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  assetList: document.getElementById("assetList"),
  favoriteNameInput: document.getElementById("favoriteNameInput"),
  favoriteList: document.getElementById("favoriteList"),
  saveFavoriteBtn: document.getElementById("saveFavoriteBtn"),
  runBtn: document.getElementById("runBtn"),
  normalizeBtn: document.getElementById("normalizeBtn"),
  thresholdInput: document.getElementById("thresholdInput"),
  startInput: document.getElementById("startInput"),
  endInput: document.getElementById("endInput"),
  modes: document.getElementById("rebalanceModes"),
  canvas: document.getElementById("equityCanvas"),
  tooltip: document.getElementById("tooltip"),
  chartLoading: document.getElementById("chartLoading"),
  metricsGrid: document.getElementById("metricsGrid"),
  corrMatrix: document.getElementById("corrMatrix"),
  rebalanceTable: document.getElementById("rebalanceTable"),
  optimizeBtn: document.getElementById("optimizeBtn"),
  optimizerResults: document.getElementById("optimizerResults"),
  resetZoomBtn: document.getElementById("resetZoomBtn"),
  chartScaleModes: document.getElementById("chartScaleModes"),
  languageModes: document.getElementById("languageModes"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  shareCurrentBtn: document.getElementById("shareCurrentBtn"),
  shareOverlay: document.getElementById("shareOverlay"),
  shareCloseBtn: document.getElementById("shareCloseBtn"),
  shareSubtitle: document.getElementById("shareSubtitle"),
  shareNameRow: document.getElementById("shareNameRow"),
  shareNameInput: document.getElementById("shareNameInput"),
  sharePrimaryMetric: document.getElementById("sharePrimaryMetric"),
  shareCurveCanvas: document.getElementById("shareCurveCanvas"),
  shareSummary: document.getElementById("shareSummary"),
  shareMetrics: document.getElementById("shareMetrics"),
  shareLinkInput: document.getElementById("shareLinkInput"),
  shareCopyBtn: document.getElementById("shareCopyBtn"),
  shareStatus: document.getElementById("shareStatus"),
  shareCreateBtn: document.getElementById("shareCreateBtn"),
  shareApplyBtn: document.getElementById("shareApplyBtn"),
  rangeLabel: document.getElementById("rangeLabel"),
  chartTitle: document.getElementById("chartTitle"),
};

const palette = ["#126c76", "#7d5a2f", "#4e6c9d", "#7a4e89", "#3a7d44", "#9b4d4d"];
const STORAGE_KEY = "portfolioLabState.v1";
const FAVORITES_KEY = "portfolioLabFavorites.v1";
const ACCESS_KEY_STORAGE_KEY = "portfolioLabAccessKey.v1";
const LANGUAGE_KEY = "portfolioLabLanguage.v1";
const THEME_KEY = "portfolioLabTheme.v1";
let debounceTimer = null;
let searchDebounceTimer = null;
let searchRequestSeq = 0;
let searchAbortController = null;

const I18N = {
  zh: {
    pageTitle: "AllocLab",
    appName: "AllocLab",
    authTitle: "需要访问密钥",
    authDescription: "请输入访问密钥后继续使用组合回测。",
    authPlaceholder: "访问密钥",
    verify: "验证",
    verifying: "验证中",
    getKey: "获取密钥",
    run: "运行",
    runPending: "运行更新",
    running: "运行中",
    backtesting: "回测中",
    searchPlaceholder: "搜索代码 / 指数 / ETF / 基金",
    assets: "标的",
    normalize: "归一化",
    favorites: "收藏组合",
    save: "保存",
    share: "分享",
    sharePreview: "发布分享",
    sharedViewTitle: "组合详情",
    shareReady: "分享链接已生成",
    shareLink: "分享链接",
    copy: "复制",
    copied: "已复制",
    close: "关闭",
    applyToView: "应用到当前视图",
    createShareLink: "生成分享链接",
    creatingShareLink: "生成中",
    sharedPortfolio: "分享组合",
    portfolioName: "组合名称",
    portfolioWeights: "组合比例",
    shareDraftHint: "确认展示效果后生成链接",
    shareCreatedHint: "复制链接后发给别人",
    createShareFailed: "生成分享链接失败",
    loadShareFailed: "分享链接读取失败",
    noShareMetrics: "暂无回测指标",
    favoriteName: "组合名称",
    rebalance: "再平衡",
    rebalanceNone: "不再平衡",
    rebalanceMonthly: "每月",
    rebalanceQuarterly: "每季",
    rebalanceAnnual: "每年",
    rebalanceThreshold: "阈值",
    threshold: "阈值",
    thresholdSuffix: "阈值",
    start: "开始",
    end: "结束",
    optimize: "参数优化",
    scan: "扫描",
    scanning: "扫描中",
    equityCurve: "净值曲线",
    chartUnavailableTitle: "行情数据不可用",
    marketDataIssueTitle: "服务端行情源不可用",
    marketDataIssueBody: "当前服务器访问 Yahoo/备用行情源受限，或备用数据存在明显断档。为避免误导，已停止本次回测并清空旧图。",
    marketDataIssueHint: "这通常是部署环境的出站网络或数据源限制，不是访问密钥问题。请稍后重试，或配置稳定行情源/代理。",
    languageGroup: "语言",
    themeGroup: "主题",
    scaleGroup: "坐标",
    scaleType: "坐标类型",
    themeType: "主题",
    lightTheme: "浅色",
    darkTheme: "深色",
    switchToLightTheme: "切换到浅色",
    switchToDarkTheme: "切换到深色",
    linearScale: "普通",
    logScale: "指数",
    resetRange: "重置区间",
    correlation: "相关性",
    rebalanceRecords: "再平衡记录",
    none: "无",
    unknown: "未知",
    searching: "搜索中",
    startSince: "起始",
    insufficientData: "数据不足",
    added: "已添加",
    add: "添加",
    remove: "移除",
    noFavorites: "暂无收藏",
    apply: "应用",
    delete: "删除",
    noRecords: "暂无记录",
    noResults: "暂无可用结果",
    date: "日期",
    nav: "净值",
    drawdown: "回撤",
    portfolio: "组合",
    drawdownLegend: "回撤 ≥10%",
    rebalanceLegend: "再平衡",
    currentView: "当前视图",
    to: "至",
    maxDrawdown: "最大回撤",
    fullRangeMaxDrawdown: "全区间最大回撤",
    cagr: "年化收益",
    totalReturn: "总收益",
    volatility: "年化波动",
    sharpe: "夏普(0)",
    calmar: "卡玛",
    winRate: "胜率",
    worstDay: "最差单日",
    bestDay: "最佳单日",
    ulcerIndex: "痛苦指数",
    years: "年数",
    rebalanceCount: "再平衡次数",
    withdrawal4Short: "4%取现后",
    depleted: "耗尽",
    cagrHelp: "主值公式：(期末净值/期初净值)^(1/年数)-1。副值按 FIRE 4% 规则近似：第一年取初始本金 4%，之后每满一年按 2.5% 通胀上调同一笔取现金额；显示扣除这些取现后剩余资产的 CAGR，不是每年取当前资产的 4%。",
    totalReturnHelp: "主值公式：期末净值/期初净值-1。副值按 FIRE 4% 规则近似：第一年取初始本金 4%，之后每满一年按 2.5% 通胀上调同一笔取现金额；展示扣除这些取现后剩余资产相对初始本金的总收益，不包含已取出的现金。",
    maxDrawdownHelp: "历史高点到后续低点的最大跌幅。-30% 表示某段时间里从峰值回撤到只剩 70%，之后可能才恢复。",
    volatilityHelp: "日收益率标准差乘以 √252。15% 大致表示一年内常见波动尺度约为正负 15%，不是最大亏损。",
    sharpeHelp: "公式：年化收益/年化波动，假设无风险利率为 0。1.0 表示每承受 1 单位波动，换来约 1 单位年化收益。",
    calmarHelp: "公式：年化收益/最大回撤绝对值。0.5 表示年化收益大约是历史最大回撤的一半；越高越好。",
    winRateHelp: "上涨交易日数量/全部交易日数量。55% 表示 100 个交易日里约 55 天上涨，但不说明涨跌幅大小。",
    worstDayHelp: "回测期间最差单日收益。-8% 表示最糟一天净值下跌约 8%，可用于感受极端日波动。",
    bestDayHelp: "回测期间最佳单日收益。+7% 表示最好一天净值上涨约 7%，通常也意味着该组合波动不小。",
    ulcerIndexHelp: "公式：每日回撤平方的平均值再开方。3% 可理解为回撤压力大致相当于长期处在约 3% 回撤附近；会同时惩罚深回撤和长时间不创新高。",
    yearsHelp: "回测起止日期之间的自然年长度，用于把总收益折算成年化收益和波动。",
    rebalanceCountHelp: "按当前规则实际调仓的次数。阈值再平衡下，次数越多通常代表权重漂移越频繁，也可能带来更多交易成本。",
    annualShort: "年化",
    drawdownShort: "回撤",
    sharpeShort: "夏普",
    averageNavShort: "平均净值",
    enterAccessKey: "请输入访问密钥",
    authInvalid: "访问密钥无效或尝试次数过多",
    requestFailed: "请求失败",
    assetClassUSEquity: "美股",
    assetClassUSBond: "美债",
    assetClassGold: "黄金",
    assetClassGoldETF: "黄金 ETF",
    assetClassChinaEquity: "中国权益",
    assetClassChinaEquityETF: "中国权益 ETF",
    assetClassQDIIEquity: "QDII 权益",
    assetClassChinaFund: "中国基金",
    assetClassEquity: "股票",
    assetClassETF: "ETF",
    assetClassMutualFund: "基金",
    assetClassIndex: "指数",
    assetClassYahoo: "美股标的",
    profileSharpe: "风险调整后最佳",
    profileCalmar: "回撤效率最佳",
    profileReturn: "年化收益最高",
    profileAverageNav: "平均净值最高",
    profileMdd20: "最大回撤不超过 20% 的最高年化",
    profileMdd30: "最大回撤不超过 30% 的最高年化",
    profileMdd40: "最大回撤不超过 40% 的最高年化",
    profileLowVol: "正收益下最低波动",
  },
  en: {
    pageTitle: "AllocLab",
    appName: "AllocLab",
    authTitle: "Access Key Required",
    authDescription: "Enter the access key to continue using the portfolio backtest.",
    authPlaceholder: "Access key",
    verify: "Verify",
    verifying: "Verifying",
    getKey: "Get key",
    run: "Run",
    runPending: "Run update",
    running: "Running",
    backtesting: "Backtesting",
    searchPlaceholder: "Search ticker / index / ETF / fund",
    assets: "Assets",
    normalize: "Normalize",
    favorites: "Saved portfolios",
    save: "Save",
    share: "Share",
    sharePreview: "Publish Share",
    sharedViewTitle: "Portfolio Details",
    shareReady: "Share Link Ready",
    shareLink: "Share link",
    copy: "Copy",
    copied: "Copied",
    close: "Close",
    applyToView: "Apply to current view",
    createShareLink: "Create share link",
    creatingShareLink: "Creating",
    sharedPortfolio: "Shared portfolio",
    portfolioName: "Portfolio name",
    portfolioWeights: "Weights",
    shareDraftHint: "Review the presentation, then create a link",
    shareCreatedHint: "Copy the link and send it",
    createShareFailed: "Failed to create share link",
    loadShareFailed: "Failed to load share link",
    noShareMetrics: "No backtest metrics yet",
    favoriteName: "Portfolio name",
    rebalance: "Rebalance",
    rebalanceNone: "No rebalance",
    rebalanceMonthly: "Monthly",
    rebalanceQuarterly: "Quarterly",
    rebalanceAnnual: "Annual",
    rebalanceThreshold: "Threshold",
    threshold: "Threshold",
    thresholdSuffix: "threshold",
    start: "Start",
    end: "End",
    optimize: "Optimize",
    scan: "Scan",
    scanning: "Scanning",
    equityCurve: "Equity Curve",
    chartUnavailableTitle: "Market Data Unavailable",
    marketDataIssueTitle: "Server market data source unavailable",
    marketDataIssueBody: "This server cannot reach Yahoo or usable fallback data. Fallback data may be incomplete, so this backtest was stopped and the old chart was cleared.",
    marketDataIssueHint: "This is usually an outbound network or data-source limit in the deployment environment, not an access-key problem. Try later or configure a stable market data source/proxy.",
    languageGroup: "Language",
    themeGroup: "Theme",
    scaleGroup: "Scale",
    scaleType: "Scale type",
    themeType: "Theme",
    lightTheme: "Light",
    darkTheme: "Dark",
    switchToLightTheme: "Switch to light",
    switchToDarkTheme: "Switch to dark",
    linearScale: "Linear",
    logScale: "Log",
    resetRange: "Reset Range",
    correlation: "Correlation",
    rebalanceRecords: "Rebalance Records",
    none: "N/A",
    unknown: "Unknown",
    searching: "Searching",
    startSince: "Start",
    insufficientData: "Insufficient data",
    added: "Added",
    add: "Add",
    remove: "Remove",
    noFavorites: "No saved portfolios",
    apply: "Apply",
    delete: "Delete",
    noRecords: "No records",
    noResults: "No available results",
    date: "Date",
    nav: "NAV",
    drawdown: "Drawdown",
    portfolio: "Portfolio",
    drawdownLegend: "Drawdown >=10%",
    rebalanceLegend: "Rebalance",
    currentView: "Current view",
    to: "to",
    maxDrawdown: "Max drawdown",
    fullRangeMaxDrawdown: "Full-range max drawdown",
    cagr: "CAGR",
    totalReturn: "Total return",
    volatility: "Volatility",
    sharpe: "Sharpe(0)",
    calmar: "Calmar",
    winRate: "Win rate",
    worstDay: "Worst day",
    bestDay: "Best day",
    ulcerIndex: "Ulcer index",
    years: "Years",
    rebalanceCount: "Rebalances",
    withdrawal4Short: "After 4% withdrawal",
    depleted: "Depleted",
    cagrHelp: "Main value: (ending NAV / starting NAV)^(1 / years) - 1. Secondary value approximates the FIRE 4% rule: withdraw 4% of initial capital in year 1, then raise that same cash amount by 2.5% inflation after each full year. It shows CAGR of remaining capital after withdrawals, not 4% of current assets every year.",
    totalReturnHelp: "Main value: ending NAV / starting NAV - 1. Secondary value approximates the FIRE 4% rule: withdraw 4% of initial capital in year 1, then raise that same cash amount by 2.5% inflation after each full year. It shows remaining capital return versus initial capital, excluding cash already withdrawn.",
    maxDrawdownHelp: "Largest peak-to-trough decline. A -30% drawdown means the portfolio fell from a high to 70% of that high before recovering.",
    volatilityHelp: "Daily return standard deviation multiplied by sqrt(252). A 15% value is a typical annual fluctuation scale, not a max loss.",
    sharpeHelp: "Formula: CAGR / annualized volatility, using a 0% risk-free rate. A 1.0 value means roughly 1 unit of return per 1 unit of volatility.",
    calmarHelp: "Formula: CAGR / absolute max drawdown. A 0.5 value means CAGR was about half of the worst historical drawdown.",
    winRateHelp: "Positive-return trading days divided by all trading days. 55% means about 55 up days per 100 days, regardless of move size.",
    worstDayHelp: "Worst single-day return. A -8% value means the portfolio lost about 8% on its worst day.",
    bestDayHelp: "Best single-day return. A +7% value means the portfolio gained about 7% on its best day, often a sign of sizable volatility.",
    ulcerIndexHelp: "Formula: square root of the average squared drawdown. A 3% value feels roughly like staying around a 3% drawdown, penalizing both deep and persistent drawdowns.",
    yearsHelp: "Calendar-year length between the start and end dates, used to annualize return and volatility.",
    rebalanceCountHelp: "Actual number of rebalances triggered. Under threshold rules, more events usually mean more weight drift and potentially more trading cost.",
    annualShort: "CAGR",
    drawdownShort: "MDD",
    sharpeShort: "Sharpe",
    averageNavShort: "Avg NAV",
    enterAccessKey: "Enter the access key",
    authInvalid: "Invalid access key or too many attempts",
    requestFailed: "Request failed",
    assetClassUSEquity: "US equity",
    assetClassUSBond: "US bond",
    assetClassGold: "Gold",
    assetClassGoldETF: "Gold ETF",
    assetClassChinaEquity: "China equity",
    assetClassChinaEquityETF: "China equity ETF",
    assetClassQDIIEquity: "QDII equity",
    assetClassChinaFund: "China fund",
    assetClassEquity: "Equity",
    assetClassETF: "ETF",
    assetClassMutualFund: "Fund",
    assetClassIndex: "Index",
    assetClassYahoo: "US ticker",
    profileSharpe: "Best risk-adjusted",
    profileCalmar: "Best drawdown efficiency",
    profileReturn: "Highest CAGR",
    profileAverageNav: "Highest avg NAV",
    profileMdd20: "Highest CAGR with max drawdown <= 20%",
    profileMdd30: "Highest CAGR with max drawdown <= 30%",
    profileMdd40: "Highest CAGR with max drawdown <= 40%",
    profileLowVol: "Lowest volatility with positive CAGR",
  },
};

function t(key) {
  return I18N[state.language]?.[key] || I18N.zh[key] || key;
}

function normalizeErrorMessage(message) {
  if (!message) return t("authInvalid");
  if (message === I18N.zh.authInvalid || message === I18N.en.authInvalid) return t("authInvalid");
  if (/HTTP Error (403|429)|Too Many Requests|Forbidden/i.test(message)) {
    return t("marketDataIssueTitle");
  }
  return message;
}

function captureScrollState() {
  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    sidebarTop: document.querySelector(".sidebar")?.scrollTop ?? 0,
    searchTop: els.searchResults?.scrollTop ?? 0,
    favoriteTop: els.favoriteList?.scrollTop ?? 0,
    optimizerTop: els.optimizerResults?.scrollTop ?? 0,
    rebalanceTop: els.rebalanceTable?.scrollTop ?? 0,
  };
}

function restoreScrollState(snapshot) {
  const apply = () => {
    window.scrollTo(snapshot.windowX, snapshot.windowY);
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.scrollTop = snapshot.sidebarTop;
    if (els.searchResults) els.searchResults.scrollTop = snapshot.searchTop;
    if (els.favoriteList) els.favoriteList.scrollTop = snapshot.favoriteTop;
    if (els.optimizerResults) els.optimizerResults.scrollTop = snapshot.optimizerTop;
    if (els.rebalanceTable) els.rebalanceTable.scrollTop = snapshot.rebalanceTop;
  };
  apply();
  requestAnimationFrame(apply);
}

function preserveScroll(action) {
  const snapshot = captureScrollState();
  const value = action();
  restoreScrollState(snapshot);
  return value;
}

function loadLanguage() {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === "en" || stored === "zh") {
    state.language = stored;
  }
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  state.themePreference = stored === "dark" || stored === "light" ? stored : "system";
  state.theme = effectiveTheme();
}

function saveLanguage() {
  localStorage.setItem(LANGUAGE_KEY, state.language);
}

function saveTheme() {
  localStorage.setItem(THEME_KEY, state.themePreference);
}

function systemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function effectiveTheme() {
  return state.themePreference === "system" ? systemTheme() : state.themePreference;
}

function refreshSystemTheme() {
  if (state.themePreference !== "system") return;
  const nextTheme = effectiveTheme();
  if (nextTheme === state.theme) return;
  state.theme = nextTheme;
  applyTheme();
  if (state.result) {
    renderChart();
    renderLegend();
  }
}

function watchSystemTheme() {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!media) return;
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", refreshSystemTheme);
  } else if (typeof media.addListener === "function") {
    media.addListener(refreshSystemTheme);
  }
}

function renderLanguageMode() {
  for (const button of els.languageModes.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.lang === state.language);
  }
}

function renderThemeMode() {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  const label = nextTheme === "dark" ? t("switchToDarkTheme") : t("switchToLightTheme");
  els.themeToggleBtn.textContent = state.theme === "dark" ? "☾" : "☀";
  els.themeToggleBtn.setAttribute("aria-label", label);
  els.themeToggleBtn.setAttribute("title", label);
  els.themeToggleBtn.classList.toggle("active", state.theme === "dark");
}

function applyTheme() {
  state.theme = effectiveTheme();
  document.documentElement.dataset.theme = state.theme;
  renderThemeMode();
}

function applyI18n() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  document.title = t("pageTitle");
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  }
  for (const node of document.querySelectorAll("[data-i18n-aria-label]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  }
  for (const node of document.querySelectorAll("[data-i18n-title]")) {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  }
  renderLanguageMode();
  renderThemeMode();
}

function rerenderLocalizedContent() {
  applyI18n();
  applyTheme();
  renderModes();
  renderScaleMode();
  renderAssets();
  renderFavorites();
  refreshSearchSelectionState();
  renderSearch(els.searchInput.value, { preserveScroll: true });
  if (state.optimizerProfiles.length) {
    renderOptimizer(state.optimizerProfiles);
  }
  if (state.result) {
    renderAll();
  } else if (state.bootstrapped) {
    els.chartTitle.textContent = t("equityCurve");
  }
  renderShareDialog();
  updateInteractionLocks();
}

function storedAccessKey() {
  return localStorage.getItem(ACCESS_KEY_STORAGE_KEY) || "";
}

function setStoredAccessKey(key) {
  localStorage.setItem(ACCESS_KEY_STORAGE_KEY, key);
}

function clearStoredAccessKey() {
  localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
}

function authRequired() {
  return window.ALLOCLAB_AUTH_REQUIRED !== false;
}

function configureAuthHelpLink() {
  const url = window.PORTFOLIO_KEY_HELP_URL;
  if (typeof url === "string" && url && !url.includes("__PORTFOLIO_KEY_HELP_URL__")) {
    els.authHelpLink.href = url;
    els.authHelpLink.style.display = "inline-block";
  } else {
    els.authHelpLink.style.display = "none";
  }
}

function showAuthOverlay(message = "") {
  els.authError.textContent = message ? normalizeErrorMessage(message) : "";
  els.authSubmitBtn.disabled = false;
  els.authSubmitBtn.textContent = t("verify");
  els.authOverlay.classList.add("active");
  setTimeout(() => els.authKeyInput.focus(), 0);
}

function hideAuthOverlay() {
  els.authOverlay.classList.remove("active");
  els.authError.textContent = "";
  els.authKeyInput.value = "";
}

async function verifyAccessKey(key) {
  const response = await fetch("/api/verify-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(normalizeErrorMessage(data.error || t("authInvalid")));
  }
  return data;
}

function fmtPct(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return t("none");
  return `${(value * 100).toFixed(digits)}%`;
}

function fmtNum(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return t("none");
  return Number(value).toFixed(digits);
}

function fmtMultiple(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return t("none");
  return `${Number(value).toFixed(digits)}x`;
}

function assetClassLabel(value) {
  const labels = {
    "US Equity": t("assetClassUSEquity"),
    "US Bond": t("assetClassUSBond"),
    Gold: t("assetClassGold"),
    "Gold ETF": t("assetClassGoldETF"),
    "China Equity": t("assetClassChinaEquity"),
    "China Equity ETF": t("assetClassChinaEquityETF"),
    "QDII Equity": t("assetClassQDIIEquity"),
    "China Fund": t("assetClassChinaFund"),
    EQUITY: t("assetClassEquity"),
    ETF: t("assetClassETF"),
    MUTUALFUND: t("assetClassMutualFund"),
    INDEX: t("assetClassIndex"),
    Yahoo: t("assetClassYahoo"),
  };
  return labels[value] || value || "";
}

function rebalanceLabel(rule) {
  const mode = typeof rule === "string" ? rule : rule?.mode;
  const threshold = typeof rule === "object" ? rule?.threshold : null;
  if (mode === "threshold") return `${Math.round(Number(threshold || 0.1) * 100)}% ${t("thresholdSuffix")}`;
  if (mode === "monthly") return t("rebalanceMonthly");
  if (mode === "quarterly") return t("rebalanceQuarterly");
  if (mode === "annual") return t("rebalanceAnnual");
  if (mode === "none") return t("rebalanceNone");
  return mode || t("rebalanceNone");
}

function profileTitle(profile) {
  const keyByKind = {
    sharpe: "profileSharpe",
    calmar: "profileCalmar",
    return: "profileReturn",
    averageNav: "profileAverageNav",
    mdd20: "profileMdd20",
    mdd30: "profileMdd30",
    mdd40: "profileMdd40",
    lowvol: "profileLowVol",
  };
  return t(keyByKind[profile.kind]) || profile.title || "";
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function assetMeta(id) {
  return state.catalog.find((item) => item.id === id) || { id, name: id, hintStart: "" };
}

function mergeCatalogItems(items) {
  for (const item of items || []) {
    if (!item?.id) continue;
    const existingIndex = state.catalog.findIndex((known) => known.id === item.id);
    if (existingIndex >= 0) {
      state.catalog[existingIndex] = { ...state.catalog[existingIndex], ...item };
    } else {
      state.catalog.push(item);
    }
    if (item.dynamic) {
      const extraIndex = state.extraCatalog.findIndex((known) => known.id === item.id);
      if (extraIndex >= 0) {
        state.extraCatalog[extraIndex] = { ...state.extraCatalog[extraIndex], ...item };
      } else {
        state.extraCatalog.push(item);
      }
    }
  }
}

function snapshotCatalogForAssets(assets) {
  return assets
    .map((asset) => assetMeta(asset.id))
    .filter((meta) => meta && meta.id)
    .map((meta) => ({
      id: meta.id,
      symbol: meta.symbol || meta.id,
      name: meta.name || meta.id,
      assetClass: meta.assetClass || "",
      currency: meta.currency || "",
      hintStart: meta.hintStart || "",
      lastDate: meta.lastDate || "",
      dataCount: Number(meta.dataCount || 0),
      disabledReason: meta.disabledReason || "",
      exchange: meta.exchange || "",
      dynamic: Boolean(meta.dynamic),
    }));
}

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    if (Array.isArray(favorites)) state.favorites = favorites;
    if (!saved || typeof saved !== "object") return;
    if (Array.isArray(saved.assets) && saved.assets.length) {
      state.assets = saved.assets.map((asset) => ({
        id: String(asset.id),
        weight: Number(asset.weight || 0),
      }));
    }
    if (saved.rebalance?.mode) {
      state.rebalance = {
        mode: saved.rebalance.mode,
        threshold: Number(saved.rebalance.threshold || 0.1),
      };
    }
    if (Array.isArray(saved.extraCatalog)) {
      state.extraCatalog = saved.extraCatalog;
    }
    if (saved.chartScale === "log" || saved.chartScale === "linear") {
      state.chartScale = saved.chartScale;
    }
    if (saved.visibleSeries && typeof saved.visibleSeries === "object") {
      state.visibleSeries = {
        portfolio: saved.visibleSeries.portfolio !== false,
        assets: saved.visibleSeries.assets || {},
      };
    }
    els.startInput.value = saved.start || "";
    els.endInput.value = saved.end || "";
  } catch {
    state.favorites = [];
    state.extraCatalog = [];
  }
}

function saveState() {
  try {
    const statePayload = {
      assets: state.assets.map((asset) => ({ id: asset.id, weight: Number(asset.weight || 0) })),
      rebalance: state.rebalance,
      start: els.startInput.value || "",
      end: els.endInput.value || "",
      chartScale: state.chartScale,
      visibleSeries: state.visibleSeries,
      extraCatalog: snapshotCatalogForAssets(state.assets).filter((item) => item.dynamic),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statePayload));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
  } catch {
    // Ignore quota or privacy-mode storage failures; the app remains usable.
  }
}

function defaultFavoriteName() {
  return state.assets
    .map((asset) => `${asset.id} ${Math.round(Number(asset.weight || 0))}%`)
    .join(" / ");
}

function currentFavoriteSnapshot(name) {
  return {
    id: String(Date.now()),
    name: name.trim() || defaultFavoriteName(),
    createdAt: new Date().toISOString(),
    assets: state.assets.map((asset) => ({ id: asset.id, weight: Number(asset.weight || 0) })),
    rebalance: { ...state.rebalance },
    start: els.startInput.value || "",
    end: els.endInput.value || "",
    catalog: snapshotCatalogForAssets(state.assets),
  };
}

function currentMetricSnapshot() {
  if (!state.result?.metrics) return null;
  const m = state.result.metrics;
  return {
    start: m.start || "",
    end: m.end || "",
    cagr: m.cagr,
    totalReturn: m.totalReturn,
    maxDrawdown: m.maxDrawdown,
    volatility: m.volatility,
    sharpe0: m.sharpe0,
    calmar: m.calmar,
    averageNav: m.averageNav,
    years: m.years,
  };
}

function sampledCurveFromResult(result, limit = 96) {
  if (!result?.dates?.length || !result?.nav?.length) return [];
  if (result.dates.length <= limit) {
    return result.dates.map((date, index) => ({ date, value: result.nav[index] }));
  }
  const indexes = new Set();
  for (let i = 0; i < limit; i += 1) {
    indexes.add(Math.round((i * (result.dates.length - 1)) / (limit - 1)));
  }
  return Array.from(indexes)
    .sort((a, b) => a - b)
    .map((index) => ({ date: result.dates[index], value: result.nav[index] }));
}

function currentShareSnapshot(name = "") {
  const snapshot = currentFavoriteSnapshot(name || t("sharedPortfolio"));
  const metrics = currentMetricSnapshot();
  if (metrics) snapshot.metrics = metrics;
  const curve = sampledCurveFromResult(state.result);
  if (curve.length) snapshot.curve = curve;
  return snapshot;
}

function shareUrlForToken(token) {
  const url = new URL(window.location.href);
  url.search = `?share=${encodeURIComponent(token)}`;
  url.hash = "";
  return url.toString();
}

function shareTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("share") || "";
}

function shareDateText(portfolio) {
  if (portfolio.start && portfolio.end) return `${portfolio.start} ${t("to")} ${portfolio.end}`;
  if (portfolio.start) return `${t("start")} ${portfolio.start}`;
  if (portfolio.end) return `${t("end")} ${portfolio.end}`;
  const metrics = portfolio.metrics || {};
  if (metrics.start && metrics.end) return `${metrics.start} ${t("to")} ${metrics.end}`;
  return t("none");
}

function shareMetricRows(portfolio) {
  const metrics = portfolio.metrics || {};
  if (!Object.keys(metrics).length) return [];
  return [
    [t("sharpe"), fmtNum(metrics.sharpe0)],
    [t("maxDrawdown"), fmtPct(metrics.maxDrawdown)],
    [t("volatility"), fmtPct(metrics.volatility)],
  ];
}

function shareTitleForMode(mode) {
  if (mode === "received") return t("sharedViewTitle");
  if (mode === "created") return t("shareReady");
  return t("sharePreview");
}

function shareSubtitleForMode(mode) {
  if (mode === "created") return t("shareCreatedHint");
  return t("shareDraftHint");
}

function receivedShareSubtitle(portfolio) {
  return `${shareDateText(portfolio)} · ${rebalanceLabel(portfolio.rebalance)}`;
}

function drawShareCurve(portfolio) {
  const canvas = els.shareCurveCanvas;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  canvas.width = width;
  canvas.height = height;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const curve = portfolio.curve || [];
  if (curve.length < 2) {
    ctx.fillStyle = cssVar("--muted");
    ctx.font = "12px sans-serif";
    ctx.fillText(t("noShareMetrics"), 12, 28);
    return;
  }
  const values = curve.map((point) => Number(point.value)).filter((value) => Number.isFinite(value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = { left: 10, right: 10, top: 12, bottom: 20 };
  const x = (index) => pad.left + (index / (curve.length - 1)) * (rect.width - pad.left - pad.right);
  const y = (value) => pad.top + ((max - value) / span) * (rect.height - pad.top - pad.bottom);
  const gradient = ctx.createLinearGradient(0, pad.top, 0, rect.height - pad.bottom);
  gradient.addColorStop(0, "rgba(18, 108, 118, 0.28)");
  gradient.addColorStop(1, "rgba(18, 108, 118, 0.02)");
  ctx.beginPath();
  curve.forEach((point, index) => {
    const px = x(index);
    const py = y(Number(point.value));
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.lineTo(rect.width - pad.right, rect.height - pad.bottom);
  ctx.lineTo(pad.left, rect.height - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  curve.forEach((point, index) => {
    const px = x(index);
    const py = y(Number(point.value));
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = cssVar("--accent");
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = cssVar("--muted");
  ctx.font = "11px sans-serif";
  ctx.fillText(curve[0].date || "", pad.left, rect.height - 5);
  const lastDate = curve[curve.length - 1].date || "";
  const textWidth = ctx.measureText(lastDate).width;
  ctx.fillText(lastDate, rect.width - pad.right - textWidth, rect.height - 5);
}

function renderShareDialog() {
  const dialog = state.shareDialog;
  if (!dialog) {
    els.shareOverlay.classList.remove("active");
    els.shareOverlay.setAttribute("aria-hidden", "true");
    return;
  }
  const portfolio = dialog.portfolio;
  const metrics = portfolio.metrics || {};
  els.shareOverlay.dataset.mode = dialog.mode;
  document.getElementById("shareTitle").textContent =
    dialog.mode === "received" ? portfolio.name || t("sharedPortfolio") : shareTitleForMode(dialog.mode);
  els.shareSubtitle.textContent =
    dialog.mode === "received" ? receivedShareSubtitle(portfolio) : shareSubtitleForMode(dialog.mode);
  els.shareSubtitle.style.display = "";
  els.shareNameRow.style.display = dialog.mode === "draft" ? "grid" : "none";
  if (dialog.mode === "draft" && els.shareNameInput.value !== portfolio.name) {
    els.shareNameInput.value = portfolio.name || "";
  }
  els.sharePrimaryMetric.innerHTML = `
    <span>${escapeHtml(t("cagr"))}</span>
    <strong>${escapeHtml(fmtPct(metrics.cagr))}</strong>
    <em>${escapeHtml(shareDateText(portfolio))}</em>
  `;
  els.shareSummary.innerHTML = `
    <div class="share-weight-card">
      <span>${escapeHtml(t("portfolioWeights"))}</span>
      <div class="share-weight-list">
        ${(portfolio.assets || [])
          .map((asset) => `<strong>${escapeHtml(asset.id)} <b>${Math.round(Number(asset.weight || 0))}%</b></strong>`)
          .join("")}
      </div>
    </div>
    <div class="share-rule-card">
      <span>${escapeHtml(t("rebalance"))}</span>
      <strong>${escapeHtml(rebalanceLabel(portfolio.rebalance))}</strong>
    </div>
  `;
  const metricRows = shareMetricRows(portfolio);
  els.shareMetrics.innerHTML = metricRows.length
    ? metricRows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")
    : `<div class="status">${t("noShareMetrics")}</div>`;
  els.shareLinkInput.value = dialog.url || "";
  els.shareLinkInput.parentElement.style.display = dialog.mode === "created" ? "grid" : "none";
  els.shareCopyBtn.style.display = dialog.mode === "created" ? "" : "none";
  els.shareStatus.textContent = dialog.status || "";
  els.shareStatus.style.display = dialog.status ? "" : "none";
  els.shareCreateBtn.style.display = dialog.mode === "draft" ? "" : "none";
  els.shareCreateBtn.disabled = state.loading || dialog.generating;
  els.shareCreateBtn.textContent = dialog.generating ? t("creatingShareLink") : t("createShareLink");
  els.shareApplyBtn.style.display = dialog.mode === "received" ? "" : "none";
  els.shareApplyBtn.disabled = state.loading;
  els.shareOverlay.classList.add("active");
  els.shareOverlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => drawShareCurve(portfolio));
}

function showShareDialog(portfolio, options = {}) {
  mergeCatalogItems(portfolio.catalog || []);
  state.shareDialog = {
    mode: options.mode || "draft",
    portfolio,
    url: options.url || "",
    status: options.status || "",
    generating: false,
  };
  renderShareDialog();
}

function closeShareDialog() {
  state.shareDialog = null;
  renderShareDialog();
}

async function createShare(portfolio) {
  const data = await api("/api/share", {
    method: "POST",
    body: JSON.stringify({ portfolio }),
  });
  return {
    portfolio: data.portfolio || portfolio,
    url: shareUrlForToken(data.token),
  };
}

function backtestMetricsFromResult(result) {
  const m = result.metrics || {};
  return {
    start: m.start || "",
    end: m.end || "",
    cagr: m.cagr,
    totalReturn: m.totalReturn,
    maxDrawdown: m.maxDrawdown,
    volatility: m.volatility,
    sharpe0: m.sharpe0,
    calmar: m.calmar,
    averageNav: m.averageNav,
    years: m.years,
  };
}

async function enrichShareDraft(portfolio) {
  if (portfolio.metrics && portfolio.curve?.length) return portfolio;
  try {
    const result = await api("/api/backtest", {
      method: "POST",
      body: JSON.stringify({
        assets: portfolio.assets,
        rebalance: portfolio.rebalance,
        start: portfolio.start || null,
        end: portfolio.end || null,
      }),
    });
    return {
      ...portfolio,
      metrics: backtestMetricsFromResult(result),
      curve: sampledCurveFromResult(result),
      catalog: result.assets || portfolio.catalog || [],
    };
  } catch {
    return portfolio;
  }
}

async function sharePortfolio(portfolio) {
  const draft = {
    ...portfolio,
    name: portfolio.name || t("sharedPortfolio"),
  };
  showShareDialog(draft, { mode: "draft" });
  const enriched = await enrichShareDraft(draft);
  if (!state.shareDialog || state.shareDialog.mode !== "draft") return;
  state.shareDialog.portfolio = {
    ...enriched,
    name: els.shareNameInput.value.trim() || enriched.name,
  };
  renderShareDialog();
}

async function createShareFromDialog() {
  const dialog = state.shareDialog;
  if (!dialog || dialog.mode !== "draft" || dialog.generating) return;
  const portfolio = {
    ...dialog.portfolio,
    name: els.shareNameInput.value.trim() || dialog.portfolio.name || t("sharedPortfolio"),
  };
  state.shareDialog = { ...dialog, portfolio, generating: true, status: "" };
  renderShareDialog();
  try {
    const created = await createShare(portfolio);
    showShareDialog(created.portfolio, { mode: "created", url: created.url });
  } catch (error) {
    state.shareDialog = { mode: "draft", portfolio, url: "", status: error.message || t("createShareFailed"), generating: false };
    renderShareDialog();
  }
}

async function copyShareLink() {
  const link = els.shareLinkInput.value;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    els.shareLinkInput.select();
    document.execCommand("copy");
  }
  els.shareStatus.textContent = t("copied");
}

async function loadSharedPortfolioFromUrl() {
  const token = shareTokenFromUrl();
  if (!token) return;
  try {
    const data = await api(`/api/share?token=${encodeURIComponent(token)}`);
    showShareDialog(data.portfolio, { mode: "received", url: window.location.href });
  } catch (error) {
    setStatus(error.message || t("loadShareFailed"), true);
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const key = storedAccessKey();
  if (key) {
    headers["X-Access-Key"] = key;
  }
  const response = await fetch(path, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearStoredAccessKey();
    const message = normalizeErrorMessage(data.error || t("authInvalid"));
    showAuthOverlay(message);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (!response.ok || data.error) {
    const error = new Error(normalizeErrorMessage(data.error || `${t("requestFailed")}: ${response.status}`));
    error.status = response.status;
    error.kind = data.kind || "";
    error.asset = data.asset || "";
    error.sourceStatus = data.sourceStatus || "";
    error.rawMessage = data.error || "";
    throw error;
  }
  return data;
}

function scheduleRun() {
  clearTimeout(debounceTimer);
  markBacktestDirty();
}

function markBacktestDirty() {
  state.backtestDirty = true;
  updateInteractionLocks();
}

function scheduleSearch(query) {
  clearTimeout(searchDebounceTimer);
  if (!query.trim()) {
    renderSearch("");
    return;
  }
  els.searchResults.innerHTML = `<div class="status">${t("searching")}</div>`;
  searchDebounceTimer = setTimeout(() => renderSearch(query), 450);
}

function isSearchItemDisabled(item) {
  return Boolean(item?.disabledReason);
}

function searchAssetStartMarkup(item) {
  const start = escapeHtml(item.hintStart || t("unknown"));
  if (item.disabledReason) {
    return `${start} · ${escapeHtml(item.disabledReason)}`;
  }
  return start;
}

function searchAssetMetaMarkup(item) {
  return [
    escapeHtml(assetClassLabel(item.assetClass)),
    item.currency ? escapeHtml(item.currency) : "",
    `${t("startSince")} ${searchAssetStartMarkup(item)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function canAddSearchItem(item, selected) {
  return !state.loading && !selected.has(item.id) && !isSearchItemDisabled(item);
}

function renderSearchItems(items, options = {}) {
  const selected = new Set(state.assets.map((asset) => asset.id));
  const previousScrollTop = options.previousScrollTop || 0;
  els.searchResults.innerHTML = "";
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.dataset.assetId = item.id;
    button.dataset.disabledReason = item.disabledReason || "";
    button.disabled = !canAddSearchItem(item, selected);
    button.innerHTML = `
      <div>
        <strong>${escapeHtml(item.id)} · ${escapeHtml(item.name)}</strong>
        <div class="meta">${searchAssetMetaMarkup(item)}</div>
      </div>
      <span>${selected.has(item.id) ? t("added") : item.disabledReason ? escapeHtml(item.disabledReason) : t("add")}</span>
    `;
    button.addEventListener("click", () => addAsset(item.id));
    els.searchResults.appendChild(button);
  }
  if (options.preserveScroll) {
    els.searchResults.scrollTop = previousScrollTop;
  }
}

async function loadCatalog() {
  const data = await api("/api/catalog");
  state.catalog = data.items;
  mergeCatalogItems(state.extraCatalog);
  for (const favorite of state.favorites) {
    mergeCatalogItems(favorite.catalog);
  }
  await renderSearch("");
}

async function renderSearch(query, options = {}) {
  const requestSeq = ++searchRequestSeq;
  if (searchAbortController) {
    searchAbortController.abort();
    searchAbortController = null;
  }
  const previousScrollTop = options.preserveScroll ? els.searchResults.scrollTop : 0;
  const q = query.trim().toLowerCase();
  let items = [];
  const controller = q ? new AbortController() : null;
  if (controller) {
    searchAbortController = controller;
  }
  if (q) {
    els.searchResults.innerHTML = `<div class="status">${t("searching")}</div>`;
    try {
      const data = await api(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      if (requestSeq !== searchRequestSeq) return;
      items = data.items;
      mergeCatalogItems(items);
    } catch (error) {
      if (error.name === "AbortError" || requestSeq !== searchRequestSeq) return;
      els.searchResults.innerHTML = `<div class="status error">${error.message}</div>`;
      return;
    } finally {
      if (searchAbortController === controller) {
        searchAbortController = null;
      }
    }
  } else {
    items = state.catalog.slice(0, 12);
  }
  if (requestSeq !== searchRequestSeq) return;
  renderSearchItems(items, { preserveScroll: options.preserveScroll, previousScrollTop });
}

function refreshSearchSelectionState() {
  const selected = new Set(state.assets.map((asset) => asset.id));
  for (const button of els.searchResults.querySelectorAll(".search-result")) {
    const isSelected = selected.has(button.dataset.assetId);
    const disabledReason = button.dataset.disabledReason || "";
    button.disabled = state.loading || isSelected || Boolean(disabledReason);
    const label = button.querySelector("span");
    if (label) label.textContent = isSelected ? t("added") : disabledReason || t("add");
  }
}

function addAsset(id) {
  if (state.loading) return;
  if (state.assets.some((asset) => asset.id === id)) return;
  const meta = assetMeta(id);
  if (isSearchItemDisabled(meta)) return;
  state.assets.push({ id, weight: Math.round(100 / (state.assets.length + 1)) });
  preserveScroll(() => {
    renderAssets();
    refreshSearchSelectionState();
  });
  saveState();
  scheduleRun();
}

function removeAsset(id) {
  if (state.loading) return;
  if (state.assets.length < 1) return;
  state.assets = state.assets.filter((asset) => asset.id !== id);
  preserveScroll(() => {
    renderAssets();
    refreshSearchSelectionState();
  });
  saveState();
  scheduleRun();
}

function normalizeWeights() {
  if (state.assets.length < 1) {
    return;
  }

  const total = state.assets.reduce((sum, asset) => sum + Number(asset.weight || 0), 0);
  if (total <= 0) {
    const equal = 100 / state.assets.length;
    state.assets.forEach((asset) => (asset.weight = equal));
    return;
  }
  state.assets.forEach((asset) => (asset.weight = (Number(asset.weight || 0) / total) * 100));
}

function renderAssets() {
  els.assetList.innerHTML = "";
  for (const asset of state.assets) {
    const meta = assetMeta(asset.id);
    const startDetail = meta.hintStart ? `${t("startSince")} ${meta.hintStart}` : "";
    const assetDetail = [meta.currency || "", startDetail].filter(Boolean).join(" · ");
    const row = document.createElement("div");
    row.className = "asset-row";
    row.innerHTML = `
      <div class="asset-name">
        <strong>${escapeHtml(meta.id)} · ${escapeHtml(meta.name)}</strong>
        <span>${escapeHtml(assetDetail)}</span>
      </div>
      <input type="number" min="0" step="1" value="${Number(asset.weight).toFixed(0)}" />
      <button class="icon-btn" type="button" title="${t("remove")}">×</button>
    `;
    row.querySelector("input").disabled = state.loading;
    row.querySelector("button").disabled = state.loading;
    row.querySelector("input").addEventListener("input", (event) => {
      asset.weight = Number(event.target.value);
      saveState();
      scheduleRun();
    });
    row.querySelector("button").addEventListener("click", () => removeAsset(asset.id));
    els.assetList.appendChild(row);
  }
}

function renderFavorites() {
  els.favoriteList.innerHTML = "";
  if (!state.favorites.length) {
    els.favoriteList.innerHTML = `<div class="status">${t("noFavorites")}</div>`;
    return;
  }
  for (const favorite of state.favorites) {
    const row = document.createElement("div");
    row.className = "favorite-row";
    const assetText = favorite.assets
      .map((asset) => `${asset.id} ${Math.round(Number(asset.weight || 0))}%`)
      .join(" / ");
    const rule = rebalanceLabel(favorite.rebalance);
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(favorite.name)}</strong>
        <span>${escapeHtml(assetText)} · ${escapeHtml(rule)}</span>
      </div>
      <button class="ghost-btn" type="button">${t("apply")}</button>
      <button class="icon-btn share-favorite-btn" type="button" title="${t("share")}">↗</button>
      <button class="icon-btn" type="button" title="${t("delete")}">×</button>
    `;
    for (const button of row.querySelectorAll("button")) {
      button.disabled = state.loading;
    }
    row.querySelector(".ghost-btn").addEventListener("click", () => applyFavorite(favorite.id));
    row.querySelector(".share-favorite-btn").addEventListener("click", () => sharePortfolio(favorite));
    row.querySelector(".icon-btn:not(.share-favorite-btn)").addEventListener("click", () => deleteFavorite(favorite.id));
    els.favoriteList.appendChild(row);
  }
}

function saveFavorite() {
  const favorite = currentFavoriteSnapshot(els.favoriteNameInput.value);
  const existingIndex = state.favorites.findIndex((item) => item.name === favorite.name);
  if (existingIndex >= 0) {
    state.favorites[existingIndex] = { ...favorite, id: state.favorites[existingIndex].id };
  } else {
    state.favorites.unshift(favorite);
  }
  els.favoriteNameInput.value = "";
  mergeCatalogItems(favorite.catalog);
  preserveScroll(renderFavorites);
  saveState();
}

function applyFavorite(id) {
  if (state.loading) return;
  const favorite = state.favorites.find((item) => item.id === id);
  if (!favorite) return;
  applyPortfolioSnapshot(favorite);
}

function applyPortfolioSnapshot(portfolio, options = {}) {
  if (state.loading || !portfolio) return;
  const shouldRun = options.autoRun !== false;
  mergeCatalogItems(portfolio.catalog || []);
  state.assets = (portfolio.assets || []).map((asset) => ({
    id: asset.id,
    weight: Number(asset.weight || 0),
  }));
  state.rebalance = {
    mode: portfolio.rebalance?.mode || "none",
    threshold: Number(portfolio.rebalance?.threshold || 0.1),
  };
  els.startInput.value = portfolio.start || "";
  els.endInput.value = portfolio.end || "";
  els.thresholdInput.value = Math.round((state.rebalance.threshold || 0.1) * 100);
  state.view = null;
  preserveScroll(() => {
    renderAssets();
    renderModes();
    refreshSearchSelectionState();
  });
  closeShareDialog();
  saveState();
  if (shouldRun) {
    runBacktest(true);
    return;
  }
  markBacktestDirty();
}

function deleteFavorite(id) {
  if (state.loading) return;
  state.favorites = state.favorites.filter((item) => item.id !== id);
  preserveScroll(renderFavorites);
  saveState();
}

function renderModes() {
  for (const button of els.modes.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mode === state.rebalance.mode);
    button.disabled = state.loading;
  }
  els.thresholdInput.disabled = state.loading || state.rebalance.mode !== "threshold";
}

function renderScaleMode() {
  for (const button of els.chartScaleModes.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.scale === state.chartScale);
  }
}

function requestPayload() {
  return {
    assets: state.assets.map((asset) => ({
      id: asset.id,
      weight: Number(asset.weight || 0),
    })),
    rebalance: state.rebalance,
    start: els.startInput.value || null,
    end: els.endInput.value || null,
  };
}

function setStatus(text, isError = false) {
  if (!state.result) {
    els.metricsGrid.innerHTML = `<div class="status ${isError ? "error" : ""}">${text}</div>`;
  }
}

function clearChartLegend() {
  const legend = document.getElementById("chartLegend");
  if (legend) legend.remove();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawChartMessage(title, lines = [], isError = false) {
  const { canvas, dpr, width, height } = canvasGeometry();
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(dpr, dpr);
  const cssWidth = width / dpr;
  const cssHeight = height / dpr;
  ctx.fillStyle = cssVar("--canvas-bg");
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isError ? cssVar("--danger") : cssVar("--ink");
  ctx.font = "700 18px system-ui";
  ctx.fillText(title, cssWidth / 2, cssHeight / 2 - 42);
  ctx.fillStyle = cssVar("--muted");
  ctx.font = "13px system-ui";
  const wrapped = lines.flatMap((line) => wrapCanvasText(ctx, line, Math.min(620, cssWidth - 48)));
  wrapped.slice(0, 5).forEach((line, index) => {
    ctx.fillText(line, cssWidth / 2, cssHeight / 2 - 8 + index * 22);
  });
  ctx.restore();
}

function renderBacktestError(error) {
  const isMarketDataIssue = error?.kind === "market_data_unavailable";
  const title = isMarketDataIssue ? t("marketDataIssueTitle") : t("chartUnavailableTitle");
  const detail = isMarketDataIssue ? t("marketDataIssueBody") : error.message;
  const hint = isMarketDataIssue ? t("marketDataIssueHint") : "";
  const assetText = error?.asset ? `${error.asset}${error.sourceStatus ? ` · HTTP ${error.sourceStatus}` : ""}` : "";
  state.result = null;
  state.view = null;
  state.hoverIndex = null;
  state.selection = null;
  state.backtestError = { title, detail, hint, assetText, isMarketDataIssue };
  els.chartTitle.textContent = title;
  els.rangeLabel.textContent = assetText || "";
  els.tooltip.style.display = "none";
  clearChartLegend();
  drawChartMessage(title, [detail, hint].filter(Boolean), true);
  els.metricsGrid.innerHTML = `
    <div class="status error backtest-error">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
      ${assetText ? `<em>${escapeHtml(assetText)}</em>` : ""}
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;
  els.corrMatrix.innerHTML = `<div class="status">${escapeHtml(t("noResults"))}</div>`;
  els.rebalanceTable.innerHTML = `<div class="status">${escapeHtml(t("noRecords"))}</div>`;
}

function updateInteractionLocks() {
  const busy = state.loading;
  els.runBtn.disabled = busy || state.assets.length < 1;
  els.runBtn.textContent = busy ? t("running") : state.backtestDirty ? t("runPending") : t("run");
  els.runBtn.classList.toggle("needs-run", state.backtestDirty && !busy);
  els.shareCurrentBtn.disabled = busy;
  els.normalizeBtn.disabled = busy;
  els.startInput.disabled = busy;
  els.endInput.disabled = busy;
  els.resetZoomBtn.disabled = busy || !state.result;
  els.optimizeBtn.disabled = busy || state.optimizing;
  els.optimizeBtn.textContent = state.optimizing ? t("scanning") : t("scan");
  if (els.chartLoading) {
    els.chartLoading.textContent = t("backtesting");
    els.chartLoading.classList.toggle("active", busy);
  }
  renderModes();
  refreshSearchSelectionState();
  for (const input of els.assetList.querySelectorAll("input")) {
    input.disabled = busy;
  }
  for (const button of els.assetList.querySelectorAll("button")) {
    button.disabled = busy;
  }
  for (const button of els.favoriteList.querySelectorAll("button")) {
    button.disabled = busy;
  }
  for (const button of els.optimizerResults.querySelectorAll("button")) {
    button.disabled = busy || state.optimizing;
  }
  if (state.shareDialog) {
    els.shareCreateBtn.disabled = busy || state.shareDialog.generating;
    els.shareApplyBtn.disabled = busy;
  }
}

function syncVisibleSeries(result) {
  if (typeof state.visibleSeries.portfolio !== "boolean") {
    state.visibleSeries.portfolio = true;
  }
  const nextAssets = {};
  for (const asset of result.assets) {
    nextAssets[asset.id] = state.visibleSeries.assets[asset.id] !== false;
  }
  state.visibleSeries.assets = nextAssets;
}

async function runBacktest(resetView = true) {
  if (state.assets.length < 1) return;
  if (state.loading) {
    state.pendingBacktestResetView = resetView;
    updateInteractionLocks();
    return;
  }
  const scrollSnapshot = captureScrollState();
  state.loading = true;
  state.pendingBacktestResetView = null;
  updateInteractionLocks();
  while (true) {
    const shouldResetView = resetView;
    saveState();
    try {
      const result = await api("/api/backtest", {
        method: "POST",
        body: JSON.stringify(requestPayload()),
      });
      state.result = result;
      state.backtestError = null;
      state.backtestDirty = false;
      syncVisibleSeries(result);
      mergeCatalogItems(result.assets);
      saveState();
      if (shouldResetView || !state.view) {
        state.view = { start: 0, end: result.dates.length - 1 };
      } else {
        state.view.end = Math.min(state.view.end, result.dates.length - 1);
      }
      renderAll();
      restoreScrollState(scrollSnapshot);
    } catch (error) {
      if (error.status === 401) {
        state.loading = false;
        state.pendingBacktestResetView = null;
        updateInteractionLocks();
        throw error;
      }
      renderBacktestError(error);
      restoreScrollState(scrollSnapshot);
    }
    if (state.pendingBacktestResetView === null) {
      break;
    }
    resetView = state.pendingBacktestResetView;
    state.pendingBacktestResetView = null;
  }
  state.loading = false;
  updateInteractionLocks();
  restoreScrollState(scrollSnapshot);
}

function renderAll() {
  if (!state.result) {
    if (state.backtestError) {
      drawChartMessage(
        state.backtestError.title,
        [state.backtestError.detail, state.backtestError.hint].filter(Boolean),
        true,
      );
    } else {
      drawChartMessage(t("equityCurve"), [], false);
    }
    clearChartLegend();
    return;
  }
  renderMetrics();
  renderCorrelation();
  renderRebalanceTable();
  renderChart();
  renderLegend();
}

function renderMetrics() {
  const m = state.result.metrics;
  const withdrawal4 = m.withdrawal4 || {};
  const withdrawalDepleted = Boolean(withdrawal4.depleted);
  const withdrawal4CagrText = withdrawalDepleted ? t("depleted") : fmtPct(withdrawal4.cagr);
  const withdrawal4ReturnText = withdrawalDepleted
    ? (withdrawal4.depletedDate || t("depleted"))
    : fmtPct((withdrawal4.terminal ?? 1) - 1);
  const withdrawal4CagrClass = withdrawalDepleted || (withdrawal4.cagr ?? 0) < 0 ? "negative" : "positive";
  const withdrawal4ReturnClass = withdrawalDepleted || ((withdrawal4.terminal ?? 1) - 1) < 0 ? "negative" : "positive";
  const cards = [
    [t("cagr"), fmtPct(m.cagr), m.cagr >= 0 ? "positive" : "negative", t("cagrHelp"), withdrawal4CagrText, withdrawal4CagrClass],
    [t("totalReturn"), fmtPct(m.totalReturn), m.totalReturn >= 0 ? "positive" : "negative", t("totalReturnHelp"), withdrawal4ReturnText, withdrawal4ReturnClass],
    [t("maxDrawdown"), fmtPct(m.maxDrawdown), "negative", t("maxDrawdownHelp")],
    [t("volatility"), fmtPct(m.volatility), "", t("volatilityHelp")],
    [t("sharpe"), fmtNum(m.sharpe0), "", t("sharpeHelp")],
    [t("calmar"), fmtNum(m.calmar), "", t("calmarHelp")],
    [t("winRate"), fmtPct(m.winRate), "", t("winRateHelp")],
    [t("worstDay"), fmtPct(m.worstDay), "negative", t("worstDayHelp")],
    [t("bestDay"), fmtPct(m.bestDay), "positive", t("bestDayHelp")],
    [t("ulcerIndex"), fmtPct(m.ulcerIndex), "", t("ulcerIndexHelp")],
    [t("years"), fmtNum(m.years, 1), "", t("yearsHelp")],
    [t("rebalanceCount"), String(m.rebalanceCount), "", t("rebalanceCountHelp")],
  ];
  els.metricsGrid.innerHTML = cards
    .map(
      ([label, value, klass, help, withdrawalValue, withdrawalKlass]) => `
        <div class="metric-card ${klass}">
          <div class="metric-label">
            <span>${escapeHtml(label)}</span>
            <span class="metric-help" tabindex="0" role="note" aria-label="${escapeHtml(help)}" data-tooltip="${escapeHtml(help)}">?</span>
          </div>
          <strong>${value}</strong>
          ${withdrawalValue ? `<div class="metric-sub"><span>${escapeHtml(t("withdrawal4Short"))}</span><b class="${escapeHtml(withdrawalKlass)}">${escapeHtml(withdrawalValue)}</b></div>` : ""}
        </div>
      `,
    )
    .join("");
  els.rangeLabel.textContent = `${m.start} ${t("to")} ${m.end} · ${t("maxDrawdown")} ${m.drawdownPeak} ${t("to")} ${m.drawdownTrough}`;
  els.chartTitle.textContent = state.result.assets
    .map((asset) => `${asset.id} ${Math.round(asset.weight * 100)}%`)
    .join(" / ");
}

function renderCorrelation() {
  const result = state.result;
  const headers = result.assets.map((asset) => asset.id);
  let html = `<table class="corr-table"><thead><tr><th></th>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr></thead><tbody>`;
  result.correlation.forEach((row, i) => {
    html += `<tr><td>${headers[i]}</td>`;
    row.forEach((value) => {
      const intensity = Math.min(1, Math.abs(value));
      const hue = value >= 0 ? "190" : "4";
      html += `<td class="corr-cell" style="background: hsla(${hue}, 55%, 62%, ${0.16 + intensity * 0.46})">${value.toFixed(2)}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  els.corrMatrix.innerHTML = html;
}

function renderRebalanceTable() {
  const rows = state.result.rebalanceEvents;
  if (!rows.length) {
    els.rebalanceTable.innerHTML = `<div class="status">${t("noRecords")}</div>`;
    return;
  }
  const assets = state.result.assets.map((asset) => asset.id);
  let html = `<table class="events"><thead><tr><th>${t("date")}</th><th>${t("nav")}</th>${assets
    .map((id) => `<th>${id}</th>`)
    .join("")}</tr></thead><tbody>`;
  for (const row of rows.slice().reverse()) {
    html += `<tr><td>${row.date}</td><td>${row.nav.toFixed(2)}</td>${row.before
      .map((w) => `<td>${fmtPct(w, 0)}</td>`)
      .join("")}</tr>`;
  }
  html += "</tbody></table>";
  els.rebalanceTable.innerHTML = html;
}

function renderLegend() {
  if (!state.result) return;
  let legend = document.getElementById("chartLegend");
  if (!legend) {
    legend = document.createElement("div");
    legend.id = "chartLegend";
    legend.className = "chart-legend";
    document.querySelector(".chart-panel").appendChild(legend);
    legend.addEventListener("click", (event) => {
      const item = event.target.closest("button[data-series]");
      if (!item || !state.result) return;
      const series = item.dataset.series;
      if (series === "portfolio") {
        state.visibleSeries.portfolio = !state.visibleSeries.portfolio;
      } else if (series.startsWith("asset:")) {
        const assetId = series.slice("asset:".length);
        state.visibleSeries.assets[assetId] = state.visibleSeries.assets[assetId] === false;
      }
      saveState();
      renderChart();
      renderLegend();
    });
  }
  const assetItems = state.result.assets
    .map(
      (asset, idx) =>
        `<button type="button" data-series="asset:${escapeHtml(asset.id)}" class="${state.visibleSeries.assets[asset.id] === false ? "muted-item" : ""}">
          <i style="background:${palette[(idx + 1) % palette.length]}"></i>${escapeHtml(asset.id)}
        </button>`,
    )
    .join("");
  legend.innerHTML = `
    <div class="chart-legend-series">
      <button type="button" data-series="portfolio" class="${state.visibleSeries.portfolio === false ? "muted-item" : ""}">
        <i style="background:var(--accent-2)"></i>${t("portfolio")}
      </button>
      ${assetItems}
    </div>
    <div class="chart-legend-events">
      <span><i style="background:var(--danger)"></i>${t("drawdownLegend")}</span>
      <span><i style="background:var(--warning)"></i>${t("rebalanceLegend")}</span>
    </div>
  `;
}

function canvasGeometry() {
  const canvas = els.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { canvas, rect, dpr, width, height };
}

function getViewData() {
  const result = state.result;
  const start = Math.max(0, state.view?.start ?? 0);
  const end = Math.min(result.dates.length - 1, state.view?.end ?? result.dates.length - 1);
  return { start, end };
}

function renderChart() {
  if (!state.result) return;
  const { canvas, dpr, width, height } = canvasGeometry();
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(dpr, dpr);
  const chartColors = {
    bg: cssVar("--canvas-bg"),
    grid: cssVar("--grid"),
    axis: cssVar("--axis"),
    portfolio: cssVar("--accent-2"),
    danger: cssVar("--danger"),
    warning: cssVar("--warning"),
    baseline: cssVar("--legend-muted"),
    selectionBg: cssVar("--selection-bg"),
    selectionBorder: cssVar("--selection-border"),
    crosshair: cssVar("--crosshair"),
    crosshairDot: cssVar("--crosshair-dot"),
    drawdownSoftStroke: cssVar("--drawdown-soft-stroke"),
    drawdownSoftFill: cssVar("--drawdown-soft-fill"),
  };

  const cssWidth = width / dpr;
  const cssHeight = height / dpr;
  const drawdownHeight = 80;
  const drawdownBottomMargin = 20;
  const drawdownTop = cssHeight - drawdownBottomMargin - drawdownHeight;
  const pad = { left: 58, right: 18, top: 22, bottom: cssHeight - drawdownTop + 56 };
  const plotW = cssWidth - pad.left - pad.right;
  const plotH = cssHeight - pad.top - pad.bottom;
  const { start, end } = getViewData();
  const nav = state.result.nav.slice(start, end + 1);
  const drawdowns = state.result.drawdowns.slice(start, end + 1);
  const dates = state.result.dates.slice(start, end + 1);
  const full = state.result.metrics;
  els.rangeLabel.textContent = `${t("currentView")} ${state.result.dates[start]} ${t("to")} ${state.result.dates[end]} · ${t("fullRangeMaxDrawdown")} ${full.drawdownPeak} ${t("to")} ${full.drawdownTrough}`;
  const assetSeries = state.result.assetSeries.map((series) => series.slice(start, end + 1));
  const portfolioVisible = state.visibleSeries.portfolio !== false;
  const visibleAssetSeries = assetSeries.filter(
    (_, idx) => state.visibleSeries.assets[state.result.assets[idx].id] !== false,
  );
  const allValues = [
    ...(portfolioVisible ? nav : []),
    ...visibleAssetSeries.flat(),
  ];
  if (!allValues.length) {
    allValues.push(...nav);
  }
  const useLogScale = state.chartScale === "log" && allValues.every((value) => value > 0);
  const plottedValues = useLogScale ? allValues.map((value) => Math.log(value)) : allValues;
  let plotMin = Math.min(...plottedValues);
  let plotMax = Math.max(...plottedValues);
  if (plotMin === plotMax) {
    plotMin *= 0.95;
    plotMax *= 1.05;
  }
  const yPad = (plotMax - plotMin) * 0.08;
  plotMin -= yPad;
  plotMax += yPad;
  const scaleValue = (value) => (useLogScale ? Math.log(value) : value);
  const displayValue = (scaledValue) => (useLogScale ? Math.exp(scaledValue) : scaledValue);
  const x = (i) => pad.left + (i / Math.max(1, nav.length - 1)) * plotW;
  const y = (value) => pad.top + (1 - (scaleValue(value) - plotMin) / (plotMax - plotMin)) * plotH;
  const localHoverIndex =
    state.hoverIndex === null
      ? null
      : Math.max(0, Math.min(nav.length - 1, state.hoverIndex - start));

  ctx.fillStyle = chartColors.bg;
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.strokeStyle = chartColors.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const gy = pad.top + (plotH / 4) * i;
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(pad.left + plotW, gy);
  }
  ctx.stroke();

  ctx.fillStyle = chartColors.axis;
  ctx.font = "12px system-ui";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const scaledValue = plotMax - ((plotMax - plotMin) / 4) * i;
    const value = displayValue(scaledValue);
    ctx.fillText(value.toFixed(2), pad.left - 8, pad.top + (plotH / 4) * i + 4);
  }

  assetSeries.forEach((series, idx) => {
    if (state.visibleSeries.assets[state.result.assets[idx].id] === false) return;
    ctx.strokeStyle = palette[(idx + 1) % palette.length] + "88";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    series.forEach((value, i) => {
      if (i === 0) ctx.moveTo(x(i), y(value));
      else ctx.lineTo(x(i), y(value));
    });
    ctx.stroke();
  });

  if (portfolioVisible) {
    ctx.strokeStyle = chartColors.portfolio;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    nav.forEach((value, i) => {
      if (i === 0) ctx.moveTo(x(i), y(value));
      else ctx.lineTo(x(i), y(value));
    });
    ctx.stroke();

    const drawdownHighlight = 0.10;
    ctx.strokeStyle = chartColors.danger;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    let active = false;
    for (let i = 1; i < nav.length; i++) {
      if (drawdowns[i] <= -drawdownHighlight) {
        if (!active) {
          ctx.moveTo(x(i - 1), y(nav[i - 1]));
          active = true;
        }
        ctx.lineTo(x(i), y(nav[i]));
      } else {
        active = false;
      }
    }
    ctx.stroke();
  }

  const eventDates = new Set(state.result.rebalanceEvents.map((event) => event.date));
  ctx.strokeStyle = chartColors.warning;
  ctx.fillStyle = chartColors.warning;
  ctx.lineWidth = 1;
  dates.forEach((date, i) => {
    if (!portfolioVisible || !eventDates.has(date)) return;
    const px = x(i);
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(px, pad.top);
    ctx.lineTo(px, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(px, y(nav[i]), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  const bottomY = pad.top + plotH + 26;
  ctx.textAlign = "center";
  ctx.fillStyle = chartColors.axis;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  ticks.forEach((tick) => {
    const idx = Math.min(dates.length - 1, Math.round(tick * (dates.length - 1)));
    ctx.fillText(dates[idx], x(idx), bottomY);
  });

  if (portfolioVisible) {
    const ddTop = drawdownTop;
    const ddHeight = drawdownHeight;
    const ddBottom = ddTop + ddHeight;
    const ddY = (dd) => ddTop + Math.min(1, Math.max(0, Math.abs(dd))) * ddHeight;

    ctx.save();
    ctx.strokeStyle = chartColors.grid;
    ctx.fillStyle = chartColors.axis;
    ctx.lineWidth = 1;
    ctx.font = "11px system-ui";
    ctx.textAlign = "right";
    [0, 0.25, 0.5, 0.75, 1].forEach((level) => {
      const gy = ddTop + level * ddHeight;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(pad.left + plotW, gy);
      ctx.stroke();
      ctx.fillText(`${Math.round(-level * 100)}%`, pad.left - 8, gy + 4);
    });
    ctx.textAlign = "left";
    ctx.fillText(t("drawdown"), pad.left, ddTop - 6);

    ctx.strokeStyle = chartColors.drawdownSoftStroke;
    ctx.fillStyle = chartColors.drawdownSoftFill;
    ctx.beginPath();
    ctx.moveTo(pad.left, ddTop);
    drawdowns.forEach((dd, i) => {
      ctx.lineTo(x(i), ddY(dd));
    });
    ctx.lineTo(pad.left + plotW, ddTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = chartColors.danger;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    drawdowns.forEach((dd, i) => {
      if (i === 0) ctx.moveTo(x(i), ddY(dd));
      else ctx.lineTo(x(i), ddY(dd));
    });
    ctx.stroke();
    ctx.strokeStyle = chartColors.baseline;
    ctx.beginPath();
    ctx.moveTo(pad.left, ddBottom);
    ctx.lineTo(pad.left + plotW, ddBottom);
    ctx.stroke();
    ctx.restore();
  }

  if (state.selection) {
    const sx = Math.min(state.selection.x0, state.selection.x1);
    const sw = Math.abs(state.selection.x1 - state.selection.x0);
    ctx.fillStyle = chartColors.selectionBg;
    ctx.strokeStyle = chartColors.selectionBorder;
    ctx.fillRect(sx, pad.top, sw, plotH);
    ctx.strokeRect(sx, pad.top, sw, plotH);
  }

  if (localHoverIndex !== null && !state.selection) {
    const hx = x(localHoverIndex);
    const hoverValue = state.visibleSeries.portfolio === false ? nav[localHoverIndex] : nav[localHoverIndex];
    const hy = y(hoverValue);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = chartColors.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, pad.top);
    ctx.lineTo(hx, pad.top + plotH);
    ctx.moveTo(pad.left, hy);
    ctx.lineTo(pad.left + plotW, hy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = chartColors.crosshairDot;
    ctx.beginPath();
    ctx.arc(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function pointToIndex(clientX) {
  const { rect } = canvasGeometry();
  const { start, end } = getViewData();
  const padLeft = 58;
  const padRight = 18;
  const plotW = rect.width - padLeft - padRight;
  const localX = clientX - rect.left;
  const ratio = Math.min(1, Math.max(0, (localX - padLeft) / plotW));
  return Math.round(start + ratio * (end - start));
}

function showTooltip(event) {
  if (!state.result || state.selection) return;
  const canvasRect = els.canvas.getBoundingClientRect();
  const insideCanvas =
    event.clientX >= canvasRect.left &&
    event.clientX <= canvasRect.right &&
    event.clientY >= canvasRect.top &&
    event.clientY <= canvasRect.bottom;
  if (!insideCanvas) {
    hideTooltip();
    return;
  }
  const idx = pointToIndex(event.clientX);
  state.hoverIndex = idx;
  const date = state.result.dates[idx];
  const nav = state.result.nav[idx];
  const dd = state.result.drawdowns[idx];
  const weights = state.result.weightsTimeline[idx] || [];
  els.tooltip.innerHTML = `
    <strong>${date}</strong><br>
    ${t("nav")} ${nav.toFixed(3)}<br>
    ${t("drawdown")} ${fmtPct(dd)}<br>
    ${weights
      .map((weight, i) => `${state.result.assets[i].id} ${fmtPct(weight, 1)}`)
      .join("<br>")}
  `;
  els.tooltip.style.display = "block";

  const panel = els.tooltip.parentElement;
  const panelRect = panel.getBoundingClientRect();
  const localX = event.clientX - panelRect.left;
  const localY = event.clientY - panelRect.top;
  const gap = 14;
  const margin = 8;
  const tipW = els.tooltip.offsetWidth;
  const tipH = els.tooltip.offsetHeight;
  let left = localX + gap;
  let top = localY + gap;

  if (left + tipW + margin > panel.clientWidth) {
    left = localX - tipW - gap;
  }
  if (top + tipH + margin > panel.clientHeight) {
    top = localY - tipH - gap;
  }
  left = Math.max(margin, Math.min(left, panel.clientWidth - tipW - margin));
  top = Math.max(margin, Math.min(top, panel.clientHeight - tipH - margin));
  els.tooltip.style.left = `${left}px`;
  els.tooltip.style.top = `${top}px`;
  renderChart();
}

function hideTooltip() {
  if (state.hoverIndex === null && els.tooltip.style.display === "none") return;
  state.hoverIndex = null;
  els.tooltip.style.display = "none";
  renderChart();
}

async function optimize() {
  if (state.assets.length < 2 || state.loading || state.optimizing) return;
  const scrollSnapshot = captureScrollState();
  state.optimizing = true;
  updateInteractionLocks();
  els.optimizerResults.innerHTML = `<div class="status">${t("scanning")}</div>`;
  restoreScrollState(scrollSnapshot);
  try {
    const data = await api("/api/optimize", {
      method: "POST",
      body: JSON.stringify(requestPayload()),
    });
    renderOptimizer(data.profiles);
    restoreScrollState(scrollSnapshot);
  } catch (error) {
    els.optimizerResults.innerHTML = `<div class="status error">${error.message}</div>`;
    restoreScrollState(scrollSnapshot);
  } finally {
    state.optimizing = false;
    updateInteractionLocks();
    restoreScrollState(scrollSnapshot);
  }
}

function renderOptimizer(profiles) {
  state.optimizerProfiles = profiles || [];
  if (!profiles.length) {
    els.optimizerResults.innerHTML = `<div class="status">${t("noResults")}</div>`;
    return;
  }
  els.optimizerResults.innerHTML = "";
  for (const profile of profiles) {
    const card = document.createElement("div");
    card.className = "optimizer-card";
    const m = profile.metrics;
    const weightsText = profile.weights
      .map((weight, i) => `${state.assets[i].id} ${Math.round(weight * 100)}%`)
      .join(" / ");
    const rule =
      rebalanceLabel(profile.rebalance);
    card.innerHTML = `
      <div class="opt-head">
        <strong>${profileTitle(profile)}</strong>
        <span class="muted">${rule}</span>
      </div>
      <div class="muted">${weightsText}</div>
      <div class="opt-grid">
        <span>${t("annualShort")} ${fmtPct(m.cagr)}</span>
        <span>${t("drawdownShort")} ${fmtPct(m.maxDrawdown)}</span>
        <span>${t("sharpeShort")} ${fmtNum(m.sharpe0)}</span>
        <span>${t("averageNavShort")} ${fmtMultiple(m.averageNav)}</span>
      </div>
      <button type="button">${t("apply")}</button>
    `;
    card.querySelector("button").disabled = state.loading || state.optimizing;
    card.querySelector("button").addEventListener("click", async () => {
      if (state.loading || state.optimizing) return;
      const scrollSnapshot = captureScrollState();
      profile.weights.forEach((weight, i) => {
        state.assets[i].weight = weight * 100;
      });
      state.rebalance = {
        mode: profile.rebalance.mode,
        threshold: profile.rebalance.threshold,
      };
      els.thresholdInput.value = Math.round((state.rebalance.threshold || 0.1) * 100);
      renderAssets();
      renderModes();
      refreshSearchSelectionState();
      saveState();
      await runBacktest(true);
      restoreScrollState(scrollSnapshot);
    });
    els.optimizerResults.appendChild(card);
  }
}

function bindEvents() {
  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = els.authKeyInput.value.trim();
    if (!key) {
      els.authError.textContent = t("enterAccessKey");
      return;
    }
    els.authSubmitBtn.disabled = true;
    els.authSubmitBtn.textContent = t("verifying");
    els.authError.textContent = "";
    try {
      await verifyAccessKey(key);
      setStoredAccessKey(key);
      hideAuthOverlay();
      if (!state.bootstrapped) {
        await bootstrapApp();
      } else {
        await runBacktest(true);
      }
    } catch (error) {
      clearStoredAccessKey();
      showAuthOverlay(error.message || t("authInvalid"));
    }
  });
  els.searchInput.addEventListener("input", () => scheduleSearch(els.searchInput.value));
  els.saveFavoriteBtn.addEventListener("click", saveFavorite);
  els.shareCurrentBtn.addEventListener("click", () => {
    if (state.loading) return;
    sharePortfolio(currentShareSnapshot());
  });
  els.shareCloseBtn.addEventListener("click", closeShareDialog);
  els.shareOverlay.addEventListener("click", (event) => {
    if (event.target === els.shareOverlay) closeShareDialog();
  });
  els.shareNameInput.addEventListener("input", () => {
    if (!state.shareDialog || state.shareDialog.mode !== "draft") return;
    state.shareDialog.portfolio.name = els.shareNameInput.value;
  });
  els.shareCreateBtn.addEventListener("click", createShareFromDialog);
  els.shareCopyBtn.addEventListener("click", copyShareLink);
  els.shareApplyBtn.addEventListener("click", () => {
    if (!state.shareDialog || state.shareDialog.mode !== "received") return;
    applyPortfolioSnapshot(state.shareDialog.portfolio);
  });
  els.favoriteNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveFavorite();
  });
  els.runBtn.addEventListener("click", () => runBacktest(true));
  els.normalizeBtn.addEventListener("click", () => {
    if (state.loading) return;
    normalizeWeights();
    preserveScroll(renderAssets);
    saveState();
    scheduleRun();
  });
  els.thresholdInput.addEventListener("input", () => {
    if (state.loading) return;
    state.rebalance.threshold = Number(els.thresholdInput.value || 10) / 100;
    saveState();
    scheduleRun();
  });
  els.startInput.addEventListener("change", () => {
    saveState();
    runBacktest(true);
  });
  els.endInput.addEventListener("change", () => {
    saveState();
    runBacktest(true);
  });
  els.modes.addEventListener("click", (event) => {
    if (state.loading) return;
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    state.rebalance.mode = button.dataset.mode;
    renderModes();
    saveState();
    scheduleRun();
  });
  els.chartScaleModes.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-scale]");
    if (!button) return;
    state.chartScale = button.dataset.scale;
    renderScaleMode();
    saveState();
    renderChart();
  });
  els.languageModes.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-lang]");
    if (!button || button.dataset.lang === state.language) return;
    state.language = button.dataset.lang === "en" ? "en" : "zh";
    saveLanguage();
    preserveScroll(rerenderLocalizedContent);
  });
  els.themeToggleBtn.addEventListener("click", () => {
    state.themePreference = state.theme === "dark" ? "light" : "dark";
    state.theme = effectiveTheme();
    saveTheme();
    applyTheme();
    if (state.result) {
      renderChart();
      renderLegend();
    }
  });
  els.optimizeBtn.addEventListener("click", optimize);
  els.resetZoomBtn.addEventListener("click", () => {
    if (!state.result || state.loading) return;
    els.startInput.value = "";
    els.endInput.value = "";
    state.view = { start: 0, end: state.result.dates.length - 1 };
    saveState();
    runBacktest(true);
  });
  window.addEventListener("resize", renderChart);
  watchSystemTheme();

  els.canvas.addEventListener("mousedown", (event) => {
    if (state.loading) return;
    const rect = els.canvas.getBoundingClientRect();
    state.selection = { x0: event.clientX - rect.left, x1: event.clientX - rect.left };
    els.tooltip.style.display = "none";
    renderChart();
  });
  window.addEventListener("mousemove", (event) => {
    if (state.selection) {
      const rect = els.canvas.getBoundingClientRect();
      state.selection.x1 = Math.max(58, Math.min(rect.width - 18, event.clientX - rect.left));
      renderChart();
    } else {
      showTooltip(event);
    }
  });
  window.addEventListener("mouseup", (event) => {
    if (!state.selection || !state.result) return;
    const rect = els.canvas.getBoundingClientRect();
    const startX = Math.min(state.selection.x0, state.selection.x1);
    const endX = Math.max(state.selection.x0, state.selection.x1);
    state.selection = null;
    if (endX - startX > 20) {
      const a = pointToIndex(rect.left + startX);
      const b = pointToIndex(rect.left + endX);
      if (b - a > 10) {
        els.startInput.value = state.result.dates[a];
        els.endInput.value = state.result.dates[b];
        state.view = null;
        saveState();
        runBacktest(true);
        return;
      }
    }
    renderChart();
  });
  els.canvas.addEventListener("mouseleave", () => {
    hideTooltip();
  });
}

async function bootstrapApp() {
  els.thresholdInput.value = Math.round(state.rebalance.threshold * 100);
  applyI18n();
  renderModes();
  renderScaleMode();
  try {
    const hasShareToken = Boolean(shareTokenFromUrl());
    await loadCatalog();
    renderAssets();
    renderFavorites();
    state.bootstrapped = true;
    if (hasShareToken) {
      await loadSharedPortfolioFromUrl();
    }
    await runBacktest(true);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function init() {
  loadLanguage();
  loadTheme();
  applyTheme();
  applyI18n();
  configureAuthHelpLink();
  loadSavedState();
  applyI18n();
  bindEvents();
  if (authRequired() && !storedAccessKey()) {
    showAuthOverlay();
    return;
  }
  if (!authRequired()) {
    clearStoredAccessKey();
  }
  await bootstrapApp();
}

init();
