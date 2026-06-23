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
  analysisDetailsCollapsed: false,
  optimizing: false,
  optimizerProfiles: [],
  optimizerSummary: null,
  optimizerCollapsed: false,
  optimizerSelectedKeys: [],
  optimizerFocusedKey: "",
  optimizerHighlightedKey: "",
  optimizerSortKey: "composite",
  optimizerSortDirection: "desc",
  optimizerTagFilter: "",
  optimizerMapView: null,
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
  shareView: {
    active: false,
    portfolio: null,
    loading: false,
    error: "",
  },
  comparison: {
    active: false,
    items: [],
    previousVisibleSeries: null,
    hiddenKeys: [],
    highlightedKey: "",
    sortKey: "",
    sortDirection: "desc",
    viewMode: "branch",
    pendingKey: "",
    pendingAll: false,
    editor: null,
  },
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
  analysisDetails: document.getElementById("analysisDetails"),
  analysisToggleBtn: document.getElementById("analysisToggleBtn"),
  analysisToggleText: document.getElementById("analysisToggleText"),
  metricsGrid: document.getElementById("metricsGrid"),
  corrMatrix: document.getElementById("corrMatrix"),
  rebalanceTable: document.getElementById("rebalanceTable"),
  optimizeBtn: document.getElementById("optimizeBtn"),
  compareAllBtn: document.getElementById("compareAllBtn"),
  optimizerStepInput: document.getElementById("optimizerStepInput"),
  optimizerMaxWeightInput: document.getElementById("optimizerMaxWeightInput"),
  optimizerMaxDrawdownInput: document.getElementById("optimizerMaxDrawdownInput"),
  optimizerLimitInput: document.getElementById("optimizerLimitInput"),
  optimizerResults: document.getElementById("optimizerResults"),
  addCurrentCompareBtn: document.getElementById("addCurrentCompareBtn"),
  applySharedBtn: document.getElementById("applySharedBtn"),
  resetZoomBtn: document.getElementById("resetZoomBtn"),
  comparisonPanel: document.getElementById("comparisonPanel"),
  chartScaleModes: document.getElementById("chartScaleModes"),
  languageModes: document.getElementById("languageModes"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  shareCurrentBtn: document.getElementById("shareCurrentBtn"),
  shareOverlay: document.getElementById("shareOverlay"),
  shareCloseBtn: document.getElementById("shareCloseBtn"),
  shareSubtitle: document.getElementById("shareSubtitle"),
  shareNameRow: document.getElementById("shareNameRow"),
  shareNameInput: document.getElementById("shareNameInput"),
  shareAdvanced: document.getElementById("shareAdvanced"),
  shareHostInput: document.getElementById("shareHostInput"),
  shareTargetKeyInput: document.getElementById("shareTargetKeyInput"),
  sharePrimaryMetric: document.getElementById("sharePrimaryMetric"),
  shareCurveCanvas: document.getElementById("shareCurveCanvas"),
  shareSummary: document.getElementById("shareSummary"),
  shareMetrics: document.getElementById("shareMetrics"),
  shareLinkInput: document.getElementById("shareLinkInput"),
  shareCopyBtn: document.getElementById("shareCopyBtn"),
  shareStatus: document.getElementById("shareStatus"),
  shareCreateBtn: document.getElementById("shareCreateBtn"),
  shareApplyBtn: document.getElementById("shareApplyBtn"),
  compareEditorOverlay: document.getElementById("compareEditorOverlay"),
  compareEditorForm: document.getElementById("compareEditorForm"),
  compareEditorCloseBtn: document.getElementById("compareEditorCloseBtn"),
  compareEditorCancelBtn: document.getElementById("compareEditorCancelBtn"),
  compareEditorSubmitBtn: document.getElementById("compareEditorSubmitBtn"),
  compareEditorNameInput: document.getElementById("compareEditorNameInput"),
  compareEditorAssets: document.getElementById("compareEditorAssets"),
  compareEditorAddAssetBtn: document.getElementById("compareEditorAddAssetBtn"),
  compareEditorNormalizeBtn: document.getElementById("compareEditorNormalizeBtn"),
  compareEditorRebalanceMode: document.getElementById("compareEditorRebalanceMode"),
  compareEditorThresholdInput: document.getElementById("compareEditorThresholdInput"),
  compareEditorError: document.getElementById("compareEditorError"),
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
let backtestAbortController = null;
let backtestRunId = 0;
let comparisonDragEndedAt = 0;
let comparisonPointerDrag = null;
let comparisonDragRepaintFrame = null;
let comparisonDropCleanupTimer = null;
const overlayScrollbars = new Map();
let overlayScrollbarFrame = null;
let optimizerMapRedraw = null;
let optimizerMapResizeObserver = null;

const OVERLAY_SCROLL_SELECTORS = [
  ".sidebar",
  ".main-area",
  ".share-dialog",
  ".compare-editor-dialog",
  ".search-results",
  ".favorite-list",
  ".optimizer-list",
  ".optimizer-side-scroll",
  ".optimizer-table-wrap",
  ".comparison-table-wrap",
  ".corr-matrix",
  ".event-table",
];

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
    share: "发布分享",
    sharePreview: "发布分享",
    sharedViewTitle: "组合详情",
    shareReady: "分享链接已生成",
    shareLoading: "分享加载中",
    shareLink: "分享链接",
    copy: "复制",
    copySuffix: "副本",
    copied: "已复制",
    close: "关闭",
    applyToView: "应用到当前视图",
    applyCurrentPortfolio: "应用当前组合",
    createShareLink: "生成分享链接",
    creatingShareLink: "生成中",
    sharedPortfolio: "分享组合",
    portfolioName: "组合名称",
    shareAdvanced: "高级配置",
    shareHost: "发布地址",
    shareHostPlaceholder: "当前页面地址",
    shareTargetKey: "目标密钥",
    shareTargetKeyPlaceholder: "目标服务访问密钥",
    portfolioWeights: "组合比例",
    weights: "权重",
    shareDraftHint: "确认展示效果后生成链接",
    shareCreatedHint: "复制链接后发给别人",
    createShareFailed: "生成分享链接失败",
    invalidShareHost: "发布地址无效",
    invalidShareTargetKey: "目标服务访问密钥无效",
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
    auto: "自动",
    unlimited: "不限",
    optimizerStep: "步长",
    maxWeight: "最大权重",
    maxDrawdownLimit: "回撤上限",
    resultCount: "返回数量",
    scanSummary: "扫描摘要",
    featuredCandidates: "重点候选",
    allCandidates: "全部候选",
    scannedCandidates: "已扫描",
    eligibleCandidates: "符合条件",
    retainedCandidates: "保留",
    gridStep: "步长",
    candidateMap: "候选分布",
    candidateMapIntro: "每个点是一个扫描出的组合，位置用于快速判断收益和回撤的取舍。",
    candidateMapAxisHint: "越靠上年化收益越高，越靠左最大回撤越小；左上角通常更值得优先看。",
    candidateMapSizeHint: "点越大代表平均净值越高，说明回测期内整体净值水平更占优。",
    candidateMapColorHint: "深色点是重点候选，强调色点是已选组合，外圈表示当前聚焦的组合。",
    candidateMapInteractionHint: "滚轮缩放，拖动平移，点击点会定位到下方候选列表。",
    scanFilters: "筛选",
    allTags: "全部标签",
    selectedCandidates: "已选",
    visibleCandidates: "可见",
    addSelected: "加入",
    addToCompare: "加入",
    selectCandidate: "选择候选",
    selectVisible: "全选",
    resetMap: "重置",
    compositeShort: "综合",
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
    compare: "对比",
    compareAll: "全部对比",
    comparingAll: "加入中",
    addCurrentCompare: "新增组合",
    currentCompareDirty: "先运行",
    newCompareItem: "新增组合",
    copy: "复制",
    edit: "编辑",
    cancel: "取消",
    saveToCompare: "保存到对比",
    updateCompareItem: "更新组合",
    compareEditorTitle: "组合配置",
    compareEditorHint: "配置后会作为独立组合加入对比，不影响左侧当前参数。",
    addAsset: "添加标的",
    invalidCompareConfig: "请填写至少一个标的，并确保权重大于 0。",
    customPortfolio: "自定义组合",
    comparing: "已加入",
    exitCompare: "退出对比",
    compareMode: "对比模式",
    comparisonViewMode: "展示口径",
    comparisonBranchMode: "树杈",
    comparisonOverlapMode: "共同起点",
    currentPortfolio: "当前组合",
    compareTableTitle: "组合对比",
    noFavorites: "暂无收藏",
    analysisDetails: "回测详情",
    analysisCollapsedHint: "指标、相关性和再平衡记录",
    expandDetails: "展开详情",
    collapseDetails: "折叠详情",
    scanResults: "扫描结果",
    scanResultsHint: "候选分布、重点候选和全部候选列表",
    expandScanResults: "展开结果",
    collapseScanResults: "折叠结果",
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
    assetClassCash: "现金",
    assetClassEquity: "股票",
    assetClassETF: "ETF",
    assetClassMutualFund: "基金",
    assetClassIndex: "指数",
    assetClassYahoo: "美股标的",
    profileSharpe: "风险调整后最佳",
    profileCalmar: "回撤效率最佳",
    profileReturn: "年化收益最高",
    profileAverageNav: "平均净值最高",
    profileBalanced: "综合候选",
    profileDiverse: "差异候选",
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
    share: "Publish",
    sharePreview: "Publish Share",
    sharedViewTitle: "Portfolio Details",
    shareReady: "Share Link Ready",
    shareLoading: "Loading shared portfolio",
    shareLink: "Share link",
    copy: "Copy",
    copySuffix: "Copy",
    copied: "Copied",
    close: "Close",
    applyToView: "Apply to current view",
    applyCurrentPortfolio: "Use this portfolio",
    createShareLink: "Create share link",
    creatingShareLink: "Creating",
    sharedPortfolio: "Shared portfolio",
    portfolioName: "Portfolio name",
    shareAdvanced: "Advanced",
    shareHost: "Publish host",
    shareHostPlaceholder: "Current page host",
    shareTargetKey: "Target key",
    shareTargetKeyPlaceholder: "Target service access key",
    portfolioWeights: "Weights",
    weights: "Weights",
    shareDraftHint: "Review the presentation, then create a link",
    shareCreatedHint: "Copy the link and send it",
    createShareFailed: "Failed to create share link",
    invalidShareHost: "Invalid publish host",
    invalidShareTargetKey: "Invalid target service access key",
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
    auto: "Auto",
    unlimited: "Any",
    optimizerStep: "Step",
    maxWeight: "Max weight",
    maxDrawdownLimit: "Max drawdown",
    resultCount: "Result count",
    scanSummary: "Scan summary",
    featuredCandidates: "Featured",
    allCandidates: "All candidates",
    scannedCandidates: "Scanned",
    eligibleCandidates: "Eligible",
    retainedCandidates: "Kept",
    gridStep: "Step",
    candidateMap: "Candidate map",
    candidateMapIntro: "Each point is one scanned portfolio. Its position shows the return and drawdown tradeoff.",
    candidateMapAxisHint: "Higher means stronger CAGR; further left means lower max drawdown. The upper-left area is usually worth checking first.",
    candidateMapSizeHint: "Larger points have higher average NAV, meaning the portfolio stayed at a stronger level across the test window.",
    candidateMapColorHint: "Darker points are featured candidates, accent points are selected portfolios, and the ring marks the focused portfolio.",
    candidateMapInteractionHint: "Use the mouse wheel to zoom, drag to pan, and click a point to locate it in the candidate table.",
    scanFilters: "Filters",
    allTags: "All tags",
    selectedCandidates: "Selected",
    visibleCandidates: "Visible",
    addSelected: "Add",
    addToCompare: "Add",
    selectCandidate: "Select candidate",
    selectVisible: "Select all",
    resetMap: "Reset",
    compositeShort: "Score",
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
    compare: "Compare",
    compareAll: "Add all",
    comparingAll: "Adding",
    addCurrentCompare: "New portfolio",
    currentCompareDirty: "Run first",
    newCompareItem: "New portfolio",
    copy: "Copy",
    edit: "Edit",
    cancel: "Cancel",
    saveToCompare: "Save to compare",
    updateCompareItem: "Update portfolio",
    compareEditorTitle: "Portfolio config",
    compareEditorHint: "This creates an independent comparison item without changing the left-side inputs.",
    addAsset: "Add asset",
    invalidCompareConfig: "Enter at least one asset and make sure total weight is above 0.",
    customPortfolio: "Custom portfolio",
    comparing: "Added",
    exitCompare: "Exit Compare",
    compareMode: "Compare mode",
    comparisonViewMode: "View",
    comparisonBranchMode: "Branch",
    comparisonOverlapMode: "Common start",
    currentPortfolio: "Current portfolio",
    compareTableTitle: "Portfolio comparison",
    noFavorites: "No saved portfolios",
    analysisDetails: "Backtest details",
    analysisCollapsedHint: "Metrics, correlation, and rebalance records",
    expandDetails: "Expand details",
    collapseDetails: "Collapse details",
    scanResults: "Scan results",
    scanResultsHint: "Candidate map, featured candidates, and full candidate table",
    expandScanResults: "Expand results",
    collapseScanResults: "Collapse results",
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
    assetClassCash: "Cash",
    assetClassEquity: "Equity",
    assetClassETF: "ETF",
    assetClassMutualFund: "Fund",
    assetClassIndex: "Index",
    assetClassYahoo: "US ticker",
    profileSharpe: "Best risk-adjusted",
    profileCalmar: "Best drawdown efficiency",
    profileReturn: "Highest CAGR",
    profileAverageNav: "Highest avg NAV",
    profileBalanced: "Balanced candidate",
    profileDiverse: "Diverse candidate",
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

function scheduleOverlayScrollbarUpdate() {
  if (overlayScrollbarFrame) return;
  overlayScrollbarFrame = requestAnimationFrame(() => {
    overlayScrollbarFrame = null;
    updateOverlayScrollbars();
  });
}

function createOverlayThumb(axis, host) {
  const thumb = document.createElement("div");
  thumb.className = `overlay-scroll-thumb ${axis}`;
  thumb.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    thumb.setPointerCapture(event.pointerId);
    thumb.classList.add("dragging");
    const startPointer = axis === "y" ? event.clientY : event.clientX;
    const startScroll = axis === "y" ? host.scrollTop : host.scrollLeft;
    const move = (moveEvent) => {
      const rect = host.getBoundingClientRect();
      const viewport = axis === "y" ? rect.height : rect.width;
      const scrollSize = axis === "y" ? host.scrollHeight : host.scrollWidth;
      const maxScroll = scrollSize - viewport;
      if (maxScroll <= 0) return;
      const thumbSize = Math.max(28, (viewport / scrollSize) * viewport);
      const trackSize = Math.max(1, viewport - thumbSize);
      const delta = (axis === "y" ? moveEvent.clientY : moveEvent.clientX) - startPointer;
      const nextScroll = startScroll + (delta / trackSize) * maxScroll;
      if (axis === "y") {
        host.scrollTop = nextScroll;
      } else {
        host.scrollLeft = nextScroll;
      }
    };
    const end = () => {
      thumb.classList.remove("dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
  document.body.appendChild(thumb);
  return thumb;
}

function attachOverlayScrollbar(host) {
  if (!host || overlayScrollbars.has(host)) return;
  host.classList.add("overlay-scroll-host");
  const entry = {
    y: createOverlayThumb("y", host),
    x: createOverlayThumb("x", host),
    resizeObserver: new ResizeObserver(scheduleOverlayScrollbarUpdate),
    mutationObserver: new MutationObserver(scheduleOverlayScrollbarUpdate),
  };
  entry.resizeObserver.observe(host);
  entry.mutationObserver.observe(host, { childList: true, subtree: true });
  host.addEventListener("scroll", scheduleOverlayScrollbarUpdate, { passive: true });
  overlayScrollbars.set(host, entry);
}

function ensureOverlayScrollbars() {
  OVERLAY_SCROLL_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach(attachOverlayScrollbar);
  });
  overlayScrollbars.forEach((entry, host) => {
    if (document.body.contains(host)) return;
    entry.resizeObserver.disconnect();
    entry.mutationObserver.disconnect();
    entry.y.remove();
    entry.x.remove();
    overlayScrollbars.delete(host);
  });
  scheduleOverlayScrollbarUpdate();
}

function positionOverlayThumb(host, thumb, axis) {
  const rect = host.getBoundingClientRect();
  const collapsedModule = host.closest(".collapsible-module.collapsed");
  const viewport = axis === "y" ? rect.height : rect.width;
  const scrollSize = axis === "y" ? host.scrollHeight : host.scrollWidth;
  const maxScroll = scrollSize - viewport;
  const visible =
    !collapsedModule &&
    maxScroll > 1 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    getComputedStyle(host).visibility !== "hidden";
  thumb.classList.toggle("visible", visible);
  if (!visible) return;
  const thumbSize = Math.max(28, (viewport / scrollSize) * viewport);
  const trackSize = Math.max(1, viewport - thumbSize);
  const offset = ((axis === "y" ? host.scrollTop : host.scrollLeft) / maxScroll) * trackSize;
  if (axis === "y") {
    thumb.style.left = `${Math.min(window.innerWidth - 8, rect.right - 8)}px`;
    thumb.style.top = `${Math.max(4, rect.top + offset)}px`;
    thumb.style.width = "6px";
    thumb.style.height = `${Math.min(rect.height, thumbSize)}px`;
  } else {
    thumb.style.left = `${Math.max(4, rect.left + offset)}px`;
    thumb.style.top = `${Math.min(window.innerHeight - 8, rect.bottom - 8)}px`;
    thumb.style.width = `${Math.min(rect.width, thumbSize)}px`;
    thumb.style.height = "6px";
  }
}

function updateOverlayScrollbars() {
  overlayScrollbars.forEach((entry, host) => {
    positionOverlayThumb(host, entry.y, "y");
    positionOverlayThumb(host, entry.x, "x");
  });
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
  renderAnalysisDetails();
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

function niceTickStep(span, targetCount = 5) {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const rawStep = span / Math.max(1, targetCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
}

function linearTicks(min, max, targetCount = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const step = niceTickStep(max - min, targetCount);
  const start = Math.ceil((min - step * 0.001) / step) * step;
  const end = Math.floor((max + step * 0.001) / step) * step;
  const ticks = [];
  for (let value = start; value <= end + step * 0.5; value += step) {
    if (value >= min - step * 0.001 && value <= max + step * 0.001) {
      ticks.push(Object.is(value, -0) ? 0 : value);
    }
  }
  if (ticks.length < 3) {
    return Array.from({ length: targetCount }, (_, index) => min + ((max - min) * index) / (targetCount - 1));
  }
  return ticks;
}

function pctTickDigits(ticks) {
  if (!ticks.length) return 0;
  const sorted = [...ticks].sort((a, b) => a - b);
  const step = sorted.slice(1).reduce((minStep, value, index) => {
    const diff = Math.abs(value - sorted[index]);
    return diff > 0 ? Math.min(minStep, diff) : minStep;
  }, Infinity);
  const pctStep = Number.isFinite(step) ? step * 100 : 1;
  if (pctStep >= 1) return 0;
  if (pctStep >= 0.1) return 1;
  return 2;
}

function fmtWithdrawalCagr(metrics) {
  const withdrawal = metrics?.withdrawal4 || {};
  if (withdrawal.depleted) return t("depleted");
  return fmtPct(withdrawal.cagr);
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
    Cash: t("assetClassCash"),
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

function weightsTextFromFractions(weights) {
  return weights
    .map((weight, i) => `${state.assets[i]?.id || ""} ${Math.round(Number(weight || 0) * 100)}%`)
    .join(" / ");
}

function weightsTextFromConfig(assets, weights) {
  return (assets || [])
    .map((asset, i) => `${asset.id} ${Math.round(Number(weights?.[i] || asset.weight || 0) * 100)}%`)
    .join(" / ");
}

function comparisonKeyForAssets(assets, weights, rebalance) {
  const assetPart = (assets || []).map((asset) => String(asset.id || "").trim().toUpperCase()).join(",");
  const weightPart = weights.map((weight) => Number(weight || 0).toFixed(4)).join(",");
  return `${assetPart}|${weightPart}|${rebalance?.mode || "none"}|${Number(rebalance?.threshold || 0).toFixed(4)}`;
}

function comparisonKey(weights, rebalance) {
  return comparisonKeyForAssets(state.assets, weights, rebalance);
}

function currentWeightsAsFractions() {
  return state.assets.map((asset) => Number(asset.weight || 0) / 100);
}

function currentComparisonKey() {
  return comparisonKey(currentWeightsAsFractions(), state.rebalance);
}

function profileComparisonKey(profile) {
  return comparisonKeyForAssets(profile.assets || state.assets, profile.weights || [], profile.rebalance || {});
}

function isComparisonMode() {
  return Boolean(state.comparison.active);
}

function comparisonEntries() {
  return sortedComparisonItems();
}

function comparisonViewMode() {
  return state.comparison.viewMode || "branch";
}

function yearsBetweenDates(start, end) {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return (endMs - startMs) / (365.25 * 24 * 60 * 60 * 1000);
}

function addCalendarYears(dateText, years) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const originalMonth = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + years);
  if (date.getUTCMonth() !== originalMonth) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

function withdrawalMetricsForSeries(dates, values, annualRate = 0.04, inflationRate = 0.025) {
  if (dates.length < 2 || values.length < 2) {
    return { rate: annualRate, inflationRate, terminal: 1, cagr: 0, depleted: false, depletedDate: "" };
  }
  let value = 1;
  let withdrawals = 0;
  let totalWithdrawn = 0;
  let withdrawalAmount = annualRate;
  let depletedDate = "";
  let nextWithdrawalDate = addCalendarYears(dates[0], 1);
  for (let i = 1; i < values.length; i += 1) {
    value *= values[i] / values[i - 1];
    while (dates[i] >= nextWithdrawalDate) {
      value -= withdrawalAmount;
      withdrawals += 1;
      totalWithdrawn += withdrawalAmount;
      if (value <= 0) {
        depletedDate = dates[i];
        value = 0;
        break;
      }
      withdrawalAmount *= 1 + inflationRate;
      nextWithdrawalDate = addCalendarYears(dates[0], withdrawals + 1);
    }
    if (depletedDate) break;
  }
  const years = yearsBetweenDates(dates[0], depletedDate || dates[dates.length - 1]);
  return {
    rate: annualRate,
    inflationRate,
    terminal: value,
    cagr: value > 0 && years > 0 ? value ** (1 / years) - 1 : null,
    depleted: Boolean(depletedDate),
    depletedDate,
    withdrawals,
    totalWithdrawn,
  };
}

function metricsForDateSeries(dates, values) {
  const pairs = dates
    .map((date, index) => ({ date, value: Number(values[index]) }))
    .filter((point) => point.date && Number.isFinite(point.value) && point.value > 0);
  if (pairs.length < 2) return {};
  const cleanDates = pairs.map((point) => point.date);
  const cleanValues = pairs.map((point) => point.value / pairs[0].value);
  const returns = cleanValues.slice(1).map((value, index) => value / cleanValues[index] - 1);
  const years = yearsBetweenDates(cleanDates[0], cleanDates[cleanDates.length - 1]);
  let peak = cleanValues[0];
  let maxDrawdown = 0;
  const drawdowns = cleanValues.map((value) => {
    peak = Math.max(peak, value);
    const drawdown = value / peak - 1;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
    return drawdown;
  });
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / Math.max(1, returns.length);
  const variance =
    returns.length > 1
      ? returns.reduce((sum, ret) => sum + (ret - meanReturn) ** 2, 0) / (returns.length - 1)
      : 0;
  const volatility = Math.sqrt(variance * 252);
  const cagr = years > 0 ? cleanValues[cleanValues.length - 1] ** (1 / years) - 1 : 0;
  const averageNav = cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
  return {
    start: cleanDates[0],
    end: cleanDates[cleanDates.length - 1],
    years,
    totalReturn: cleanValues[cleanValues.length - 1] - 1,
    cagr,
    volatility,
    maxDrawdown,
    sharpe0: volatility ? cagr / volatility : null,
    calmar: maxDrawdown ? cagr / Math.abs(maxDrawdown) : null,
    averageNav,
    ulcerIndex: Math.sqrt(drawdowns.reduce((sum, drawdown) => sum + drawdown * drawdown, 0) / drawdowns.length),
    withdrawal4: withdrawalMetricsForSeries(cleanDates, cleanValues),
  };
}

function comparisonMetricsForEntry(entry) {
  if (comparisonViewMode() !== "overlap") return entry.result?.metrics || {};
  const entries = state.comparison.items || [];
  const dates = comparisonChartDates(entries);
  const values = comparisonSeriesForEntry(entry, dates, entries);
  return metricsForDateSeries(dates, values);
}

function comparisonSortValue(entry, sortKey) {
  const metrics = comparisonMetricsForEntry(entry);
  if (sortKey === "portfolio") return entry.title || "";
  if (sortKey === "rebalance") return rebalanceLabel(entry.rebalance);
  if (sortKey === "cagr") return Number(metrics.cagr ?? -Infinity);
  if (sortKey === "drawdown") return Number(metrics.maxDrawdown ?? -Infinity);
  if (sortKey === "averageNav") return Number(metrics.averageNav ?? -Infinity);
  if (sortKey === "withdrawal") {
    const withdrawal = metrics.withdrawal4 || {};
    return withdrawal.depleted ? -Infinity : Number(withdrawal.cagr ?? -Infinity);
  }
  return 0;
}

function sortedComparisonItems() {
  const items = [...state.comparison.items];
  const sortKey = state.comparison.sortKey;
  if (!sortKey) return items;
  const direction = state.comparison.sortDirection === "asc" ? 1 : -1;
  return items.sort((a, b) => {
    const av = comparisonSortValue(a, sortKey);
    const bv = comparisonSortValue(b, sortKey);
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv), state.language === "zh" ? "zh-CN" : "en") * direction;
    }
    return ((av > bv ? 1 : 0) - (av < bv ? 1 : 0)) * direction;
  });
}

function comparisonDisplayTitle(entry, entries = comparisonEntries()) {
  const title = entry.title || t("customPortfolio");
  const sameTitleEntries = entries.filter((candidate) => (candidate.title || t("customPortfolio")) === title);
  if (sameTitleEntries.length <= 1) return title;
  const index = sameTitleEntries.findIndex((candidate) => candidate.key === entry.key);
  return `${title} #${index + 1}`;
}

function comparisonSortIndicator(sortKey) {
  if (state.comparison.sortKey !== sortKey) return "";
  return state.comparison.sortDirection === "asc" ? " ↑" : " ↓";
}

function setComparisonSort(sortKey) {
  if (state.comparison.sortKey === sortKey) {
    state.comparison.sortDirection = state.comparison.sortDirection === "asc" ? "desc" : "asc";
  } else {
    state.comparison.sortKey = sortKey;
    state.comparison.sortDirection = sortKey === "drawdown" ? "asc" : "desc";
  }
  renderAll();
}

function setComparisonViewMode(mode) {
  if (!["branch", "overlap"].includes(mode) || comparisonViewMode() === mode) return;
  state.comparison.viewMode = mode;
  resetComparisonView();
  renderChart();
  renderLegend();
  renderComparisonPanel();
}

function visibleComparisonEntries() {
  const hidden = new Set(state.comparison.hiddenKeys || []);
  const visible = comparisonEntries().filter((entry) => !hidden.has(entry.key));
  return visible.length ? visible : comparisonEntries();
}

function isComparisonHidden(key) {
  return (state.comparison.hiddenKeys || []).includes(key);
}

function setComparisonHidden(key, hidden) {
  const hiddenKeys = new Set(state.comparison.hiddenKeys || []);
  if (hidden) {
    hiddenKeys.add(key);
  } else {
    hiddenKeys.delete(key);
  }
  state.comparison.hiddenKeys = Array.from(hiddenKeys);
  if (hidden && state.comparison.highlightedKey === key) {
    state.comparison.highlightedKey = "";
  }
}

function setOptimizerMapHighlight(key = "") {
  const nextKey =
    key && state.optimizerProfiles.some((profile) => optimizerProfileKey(profile) === key)
      ? key
      : "";
  if (state.optimizerHighlightedKey === nextKey) return;
  state.optimizerHighlightedKey = nextKey;
  optimizerMapRedraw?.();
}

function setComparisonHighlight(key = "") {
  state.comparison.highlightedKey = key;
  document.querySelectorAll("[data-compare-key]").forEach((element) => {
    const active = Boolean(key) && element.dataset.compareKey === key;
    element.classList.toggle("highlighted-item", active && element.tagName === "BUTTON");
    element.classList.toggle("highlighted-row", active && element.tagName === "TR");
  });
  setOptimizerMapHighlight(key);
  renderChart();
}

function profileTitle(profile) {
  const keyByKind = {
    sharpe: "profileSharpe",
    calmar: "profileCalmar",
    return: "profileReturn",
    averageNav: "profileAverageNav",
    balanced: "profileBalanced",
    diverse: "profileDiverse",
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
  if (state.shareView.active) return;
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
  return { ...m };
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
  if (state.result) snapshot.result = shareResultSnapshot(state.result);
  return snapshot;
}

function shareResultSnapshot(result) {
  return {
    assets: (result.assets || []).map((asset) => ({ ...asset })),
    dates: [...(result.dates || [])],
    nav: [...(result.nav || [])],
    drawdowns: [...(result.drawdowns || [])],
    weightsTimeline: Array.isArray(result.weightsTimeline) ? result.weightsTimeline.map((row) => [...row]) : [],
    rebalanceEvents: (result.rebalanceEvents || []).map((event) => ({
      date: event.date,
      nav: Number(event.nav),
      before: [...(event.before || [])],
    })),
    metrics: { ...(result.metrics || {}) },
    correlation: (result.correlation || []).map((row) => [...row]),
    assetSeries: (result.assetSeries || []).map((series) => [...series]),
    assetStats: (result.assetStats || []).map((asset) => ({ ...asset })),
  };
}

function sameSharePortfolioAsCurrent(portfolio) {
  const assets = portfolio.assets || [];
  if (assets.length !== state.assets.length) return false;
  const sameAssets = assets.every(
    (asset, index) =>
      asset.id === state.assets[index]?.id &&
      Math.abs(Number(asset.weight || 0) - Number(state.assets[index]?.weight || 0)) < 0.0001,
  );
  if (!sameAssets) return false;
  const rebalance = portfolio.rebalance || {};
  if ((rebalance.mode || "none") !== (state.rebalance.mode || "none")) return false;
  if (Math.abs(Number(rebalance.threshold || 0.1) - Number(state.rebalance.threshold || 0.1)) > 0.0001) return false;
  return (portfolio.start || "") === (els.startInput.value || "") && (portfolio.end || "") === (els.endInput.value || "");
}

function normalizeSharePublishBaseUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return window.location.origin;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `${window.location.protocol}//${raw}`;
  const url = new URL(withProtocol);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function sharePublishBaseUrl() {
  try {
    return normalizeSharePublishBaseUrl(els.shareHostInput?.value || "");
  } catch {
    throw new Error(t("invalidShareHost"));
  }
}

function shareTargetAccessKey(baseUrl) {
  const explicitKey = (els.shareTargetKeyInput?.value || "").trim();
  if (explicitKey) return explicitKey;
  try {
    return new URL(baseUrl).origin === window.location.origin ? storedAccessKey() : "";
  } catch {
    return "";
  }
}

function shareUrlForToken(token, baseUrl = sharePublishBaseUrl()) {
  const url = new URL(window.location.pathname || "/", baseUrl);
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
  if (els.shareAdvanced) els.shareAdvanced.style.display = dialog.mode === "draft" ? "" : "none";
  if (els.shareHostInput) {
    els.shareHostInput.placeholder = window.location.host;
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
  els.shareApplyBtn.disabled = false;
  els.shareOverlay.classList.add("active");
  els.shareOverlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    drawShareCurve(portfolio);
    ensureOverlayScrollbars();
  });
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
  const publishBaseUrl = sharePublishBaseUrl();
  const targetAccessKey = shareTargetAccessKey(publishBaseUrl);
  const data = await api(new URL("/api/share", publishBaseUrl).toString(), {
    method: "POST",
    body: JSON.stringify({ portfolio }),
    accessKey: targetAccessKey,
    showAuthOnUnauthorized: false,
  });
  return {
    portfolio: data.portfolio || portfolio,
    url: shareUrlForToken(data.token, publishBaseUrl),
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
  if (portfolio.result && portfolio.metrics && portfolio.curve?.length) return portfolio;
  if (portfolio.metrics && portfolio.curve?.length && !state.result) return portfolio;
  if (state.result && sameSharePortfolioAsCurrent(portfolio)) {
    return {
      ...portfolio,
      metrics: currentMetricSnapshot(),
      curve: sampledCurveFromResult(state.result),
      result: shareResultSnapshot(state.result),
      catalog: state.result.assets || portfolio.catalog || [],
    };
  }
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
      result: shareResultSnapshot(result),
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
    const status = error.status === 401 ? t("invalidShareTargetKey") : error.message || t("createShareFailed");
    state.shareDialog = { mode: "draft", portfolio, url: "", status, generating: false };
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

function sharedResultFromPortfolio(portfolio) {
  const result = portfolio?.result;
  if (!result?.dates?.length || !result?.nav?.length || !result?.drawdowns?.length) {
    const legacyCurve = (portfolio?.curve || [])
      .map((point) => ({ date: point.date, value: Number(point.value) }))
      .filter((point) => point.date && Number.isFinite(point.value));
    if (legacyCurve.length < 2) return null;
    const legacyAssets = (portfolio.assets || []).map((asset) => ({
      ...asset,
      weight: Number(asset.weight || 0) / 100,
    }));
    return {
      assets: legacyAssets,
      dates: legacyCurve.map((point) => point.date),
      nav: legacyCurve.map((point) => point.value),
      drawdowns: legacyCurve.map(() => 0),
      weightsTimeline: [],
      rebalanceEvents: [],
      metrics: portfolio.metrics || {},
      correlation: [],
      assetSeries: [],
      assetStats: [],
      legacyCurveOnly: true,
    };
  }
  return {
    assets: result.assets?.length
      ? result.assets
      : (portfolio.assets || []).map((asset) => ({ ...asset, weight: Number(asset.weight || 0) / 100 })),
    dates: result.dates,
    nav: result.nav,
    drawdowns: result.drawdowns,
    weightsTimeline: result.weightsTimeline || [],
    rebalanceEvents: result.rebalanceEvents || [],
    metrics: result.metrics || portfolio.metrics || {},
    correlation: result.correlation || [],
    assetSeries: result.assetSeries || [],
    assetStats: result.assetStats || [],
  };
}

function applyShareViewClasses({ loading = false, ready = false } = {}) {
  document.documentElement.classList.remove("share-boot");
  document.body.classList.add("share-view");
  document.body.classList.toggle("share-loading", loading);
  document.body.classList.toggle("share-ready", ready);
}

function renderSharedPortfolioLoadingPage() {
  state.shareView = { active: true, portfolio: null, loading: true, error: "" };
  state.shareDialog = null;
  state.result = null;
  state.backtestError = null;
  state.backtestDirty = false;
  state.loading = true;
  state.optimizing = false;
  state.optimizerProfiles = [];
  state.optimizerSummary = null;
  state.comparison.active = false;
  applyShareViewClasses({ loading: true, ready: false });
  document.title = `${t("sharedPortfolio")} · ${t("sharedViewTitle")}`;
  els.chartTitle.textContent = t("sharedPortfolio");
  els.rangeLabel.textContent = t("shareLoading");
  renderShareDialog();
  renderScaleMode();
  renderSharedPortfolioSummary();
  renderAll();
  updateInteractionLocks();
}

function renderSharedPortfolioLoadError(message = "") {
  const error = message || t("loadShareFailed");
  state.shareView = { active: true, portfolio: null, loading: false, error };
  state.loading = false;
  state.result = null;
  state.backtestError = null;
  applyShareViewClasses({ loading: false, ready: false });
  els.chartTitle.textContent = t("sharedPortfolio");
  els.rangeLabel.textContent = error;
  renderSharedPortfolioSummary();
  renderAll();
  updateInteractionLocks();
}

function renderSharedPortfolioPage(portfolio) {
  const result = sharedResultFromPortfolio(portfolio);
  if (!result) {
    state.shareView = { active: true, portfolio, loading: false, error: "" };
    state.loading = false;
    applyShareViewClasses({ loading: false, ready: false });
    showShareDialog(portfolio, { mode: "received", url: window.location.href });
    updateInteractionLocks();
    return;
  }
  state.shareView = { active: true, portfolio, loading: false, error: "" };
  applyShareViewClasses({ loading: false, ready: true });
  document.title = `${portfolio.name || t("sharedPortfolio")} · ${t("sharedViewTitle")}`;
  state.shareDialog = null;
  state.result = result;
  state.backtestError = null;
  state.backtestDirty = false;
  state.loading = false;
  state.optimizing = false;
  state.optimizerProfiles = [];
  state.optimizerSummary = null;
  state.comparison.active = false;
  state.assets = (portfolio.assets || result.assets || []).map((asset) => ({
    id: asset.id,
    weight: Number(asset.weight || 0),
  }));
  state.rebalance = {
    mode: portfolio.rebalance?.mode || "none",
    threshold: Number(portfolio.rebalance?.threshold || 0.1),
  };
  els.startInput.value = portfolio.start || result.metrics?.start || "";
  els.endInput.value = portfolio.end || result.metrics?.end || "";
  els.thresholdInput.value = Math.round((state.rebalance.threshold || 0.1) * 100);
  mergeCatalogItems(portfolio.catalog || result.assets || []);
  state.view = { start: 0, end: result.dates.length - 1 };
  state.selection = null;
  state.hoverIndex = null;
  state.visibleSeries = { portfolio: true, assets: {} };
  syncVisibleSeries(result);
  renderShareDialog();
  renderScaleMode();
  renderSharedPortfolioSummary();
  renderAll();
  updateInteractionLocks();
}

function renderSharedPortfolioSummary() {
  let summary = document.getElementById("sharedPortfolioSummary");
  if (!state.shareView.active) {
    summary?.remove();
    return;
  }
  if (!summary) {
    summary = document.createElement("div");
    summary.id = "sharedPortfolioSummary";
    summary.className = "shared-portfolio-summary";
  }
  const chartControlBar = document.querySelector(".chart-control-bar");
  if (chartControlBar && summary.nextElementSibling !== chartControlBar) {
    chartControlBar.insertAdjacentElement("beforebegin", summary);
  }
  if (state.shareView.loading) {
    summary.innerHTML = `
      <div class="shared-portfolio-summary-head">
        <strong>${escapeHtml(t("sharedPortfolio"))}</strong>
        <span>${escapeHtml(t("shareLoading"))}</span>
      </div>
      <div class="shared-loading-row" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    return;
  }
  if (state.shareView.error) {
    summary.innerHTML = `<div class="status error">${escapeHtml(state.shareView.error)}</div>`;
    return;
  }
  const portfolio = state.shareView.portfolio || {};
  const resultAssetsById = new Map((state.result?.assets || []).map((asset) => [asset.id, asset]));
  const holdingRows = (portfolio.assets || []).map((asset) => {
    const meta = { ...assetMeta(asset.id), ...(resultAssetsById.get(asset.id) || {}) };
    const name = meta.name && meta.name !== meta.id ? meta.name : asset.id;
    const details = [asset.id, meta.assetClass, meta.currency].filter(Boolean).join(" · ");
    const rawWeight = Number(asset.weight ?? meta.weight ?? 0);
    const displayWeight = rawWeight <= 1 ? rawWeight * 100 : rawWeight;
    return `
      <div class="shared-holding-row">
        <div>
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(details)}</span>
        </div>
        <b>${escapeHtml(`${Math.round(displayWeight)}%`)}</b>
      </div>
    `;
  });
  const createdAt = portfolio.createdAt ? new Date(portfolio.createdAt) : null;
  const createdText = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString().slice(0, 10) : "";
  summary.innerHTML = `
    <div class="shared-portfolio-summary-head">
      <strong>${escapeHtml(t("portfolioWeights"))}</strong>
      <span>${escapeHtml(rebalanceLabel(portfolio.rebalance))}</span>
      ${createdText ? `<span>${escapeHtml(createdText)}</span>` : ""}
    </div>
    <div class="shared-holding-list">
      ${holdingRows.join("") || `<div class="status">${escapeHtml(t("noResults"))}</div>`}
    </div>
  `;
}

function applySharedPortfolioToEditor() {
  const portfolio = state.shareView.portfolio;
  if (!portfolio) return;
  document.body.classList.remove("share-view", "share-loading", "share-ready");
  document.documentElement.classList.remove("share-boot");
  state.shareView = { active: false, portfolio: null, loading: false, error: "" };
  renderSharedPortfolioSummary();
  window.history.replaceState({}, "", window.location.pathname);
  document.title = t("pageTitle");
  applyPortfolioSnapshot(portfolio, { autoRun: false });
  renderFavorites();
  renderAll();
  updateInteractionLocks();
}

async function loadSharedPortfolioFromUrl() {
  const token = shareTokenFromUrl();
  if (!token) return;
  renderSharedPortfolioLoadingPage();
  try {
    const data = await api(`/api/share?token=${encodeURIComponent(token)}`);
    renderSharedPortfolioPage(data.portfolio);
  } catch (error) {
    renderSharedPortfolioLoadError(error.message || t("loadShareFailed"));
  }
}

async function api(path, options = {}) {
  const {
    accessKey,
    showAuthOnUnauthorized = true,
    headers: optionHeaders = {},
    ...fetchOptions
  } = options;
  const headers = {
    "Content-Type": "application/json",
    ...optionHeaders,
  };
  const key = accessKey === undefined ? storedAccessKey() : accessKey;
  if (key) {
    headers["X-Access-Key"] = key;
  }
  const response = await fetch(path, {
    ...fetchOptions,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    const message = normalizeErrorMessage(data.error || t("authInvalid"));
    if (showAuthOnUnauthorized) {
      clearStoredAccessKey();
      showAuthOverlay(message);
    }
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
  ensureOverlayScrollbars();
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

function isAbortError(error) {
  return error?.name === "AbortError";
}

function cancelActiveBacktest() {
  if (backtestAbortController) {
    backtestAbortController.abort();
    backtestAbortController = null;
  }
  backtestRunId += 1;
  state.loading = false;
  state.pendingBacktestResetView = null;
  updateInteractionLocks();
}

function applyPortfolioSnapshot(portfolio, options = {}) {
  if (!portfolio) return;
  if (state.loading) {
    cancelActiveBacktest();
  }
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

function numericInputValue(input, fallback, min = -Infinity, max = Infinity) {
  const value = Number(input?.value);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function optimizerRequestOptions() {
  const rebalanceModes = Array.from(document.querySelectorAll("[data-optimizer-rule]:checked")).map(
    (input) => input.dataset.optimizerRule,
  );
  const maxDrawdownText = String(els.optimizerMaxDrawdownInput?.value || "").trim();
  return {
    step: els.optimizerStepInput?.value || "auto",
    maxWeight: numericInputValue(els.optimizerMaxWeightInput, 85, 5, 100) / 100,
    maxDrawdown: maxDrawdownText ? numericInputValue(els.optimizerMaxDrawdownInput, 0, 1, 95) / 100 : null,
    limit: numericInputValue(els.optimizerLimitInput, 24, 8, 60),
    rebalanceModes,
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

function drawShareLoadingPreview() {
  const { canvas, dpr, width, height } = canvasGeometry();
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(dpr, dpr);
  const cssWidth = width / dpr;
  const cssHeight = height / dpr;
  const pad = { left: 58, right: 32, top: 38, bottom: 72 };
  const plotW = Math.max(1, cssWidth - pad.left - pad.right);
  const plotH = Math.max(1, cssHeight - pad.top - pad.bottom);
  ctx.fillStyle = cssVar("--canvas-bg");
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.strokeStyle = cssVar("--grid");
  ctx.lineWidth = 1;
  for (let index = 0; index <= 5; index += 1) {
    const y = pad.top + (plotH * index) / 5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(cssWidth - pad.right, y);
    ctx.stroke();
  }
  for (let index = 0; index <= 4; index += 1) {
    const x = pad.left + (plotW * index) / 4;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, cssHeight - pad.bottom);
    ctx.stroke();
  }
  ctx.strokeStyle = cssVar("--axis");
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, cssHeight - pad.bottom);
  ctx.lineTo(cssWidth - pad.right, cssHeight - pad.bottom);
  ctx.stroke();

  const series = [
    { color: cssVar("--accent"), width: 3.2, offset: 0.05, drift: 1.85, wave: 0.2 },
    { color: "#4e6c9d", width: 1.6, offset: 0.18, drift: 1.35, wave: 0.32 },
    { color: "#7a4e89", width: 1.4, offset: 0.24, drift: 1.05, wave: 0.44 },
    { color: "#3a7d44", width: 1.4, offset: 0.34, drift: 0.68, wave: 0.38 },
  ];
  series.forEach((item, seriesIndex) => {
    ctx.beginPath();
    const pointCount = 96;
    for (let index = 0; index < pointCount; index += 1) {
      const progress = index / (pointCount - 1);
      const cycle = Math.sin(progress * Math.PI * (2.8 + seriesIndex * 0.45) + seriesIndex * 0.9);
      const ripple = Math.sin(progress * Math.PI * (9.5 + seriesIndex) + seriesIndex) * 0.035;
      const pullback = Math.max(0, Math.sin((progress - 0.62) * Math.PI * 5)) * (0.06 + seriesIndex * 0.01);
      const value = item.offset + progress * item.drift + cycle * item.wave + ripple - pullback;
      const normalized = Math.max(0.02, Math.min(0.98, value / 2.25));
      const x = pad.left + progress * plotW;
      const y = pad.top + (1 - normalized) * plotH;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.width;
    ctx.globalAlpha = seriesIndex === 0 ? 0.92 : 0.58;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = cssVar("--legend-bg");
  ctx.strokeStyle = cssVar("--legend-border");
  ctx.lineWidth = 1;
  const legendX = pad.left + 12;
  const legendY = pad.top + 10;
  const legendW = 260;
  const legendH = 34;
  ctx.beginPath();
  ctx.rect(legendX, legendY, legendW, legendH);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cssVar("--legend-text");
  ctx.font = "12px system-ui";
  ["组合", "资产 A", "资产 B"].forEach((label, index) => {
    const x = legendX + 14 + index * 78;
    ctx.fillStyle = series[index].color;
    ctx.fillRect(x, legendY + 15, 18, 3);
    ctx.fillStyle = cssVar("--legend-text");
    ctx.fillText(label, x + 24, legendY + 20);
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
  els.shareCurrentBtn.textContent = t("share");
  els.shareCurrentBtn.disabled = busy || state.shareView.active;
  if (els.applySharedBtn) {
    els.applySharedBtn.disabled = busy || !state.shareView.active || !state.shareView.portfolio;
  }
  els.normalizeBtn.disabled = busy;
  els.startInput.disabled = busy;
  els.endInput.disabled = busy;
  els.resetZoomBtn.disabled = busy || !state.result;
  updateAddCurrentCompareButton();
  els.optimizeBtn.disabled = busy || state.optimizing;
  els.optimizeBtn.textContent = state.optimizing ? t("scanning") : t("scan");
  for (const control of [
    els.optimizerStepInput,
    els.optimizerMaxWeightInput,
    els.optimizerMaxDrawdownInput,
    els.optimizerLimitInput,
  ]) {
    if (control) control.disabled = busy || state.optimizing;
  }
  document.querySelectorAll("[data-optimizer-rule]").forEach((input) => {
    input.disabled = busy || state.optimizing;
  });
  refreshOptimizerCompareButtons();
  if (els.chartLoading) {
    els.chartLoading.textContent = state.shareView.loading ? t("shareLoading") : t("backtesting");
    els.chartLoading.classList.toggle("active", busy || state.shareView.loading);
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
    if (button.dataset.action === "compare") {
      continue;
    } else if (button.dataset.optimizerBulk) {
      continue;
    } else {
      button.disabled = busy || state.optimizing;
    }
  }
  for (const input of els.optimizerResults.querySelectorAll("[data-select-profile], [data-optimizer-select-visible]")) {
    input.disabled = busy || state.optimizing;
  }
  for (const button of els.comparisonPanel?.querySelectorAll("button") || []) {
    button.disabled = busy || state.optimizing;
  }
  if (state.shareDialog) {
    els.shareCreateBtn.disabled = busy || state.shareDialog.generating;
    els.shareApplyBtn.disabled = state.shareDialog.mode !== "received";
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
  const runId = backtestRunId + 1;
  backtestRunId = runId;
  const controller = new AbortController();
  backtestAbortController = controller;
  state.loading = true;
  state.pendingBacktestResetView = null;
  updateInteractionLocks();
  try {
    while (true) {
      const shouldResetView = resetView;
      saveState();
      try {
        const result = await api("/api/backtest", {
          method: "POST",
          body: JSON.stringify(requestPayload()),
          signal: controller.signal,
        });
        if (controller.signal.aborted || runId !== backtestRunId) return;
        state.result = result;
        state.backtestError = null;
        state.backtestDirty = false;
        state.analysisDetailsCollapsed = false;
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
        if (isAbortError(error) || controller.signal.aborted || runId !== backtestRunId) {
          return;
        }
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
  } finally {
    if (runId === backtestRunId) {
      state.loading = false;
      backtestAbortController = null;
      updateInteractionLocks();
      restoreScrollState(scrollSnapshot);
    }
  }
}

function renderAnalysisDetails() {
  if (!els.analysisDetails) return;
  const collapsed = Boolean(state.analysisDetailsCollapsed);
  els.analysisDetails.classList.toggle("collapsed", collapsed);
  els.analysisDetails.classList.toggle("expanded", !collapsed);
  if (els.analysisToggleBtn) {
    els.analysisToggleBtn.setAttribute("aria-expanded", String(!collapsed));
  }
  if (els.analysisToggleText) {
    els.analysisToggleText.textContent = collapsed ? t("expandDetails") : t("collapseDetails");
  }
  scheduleOverlayScrollbarUpdate();
  requestAnimationFrame(scheduleOverlayScrollbarUpdate);
  window.setTimeout(scheduleOverlayScrollbarUpdate, 260);
}

function collapsibleModuleHeadMarkup({ title, hint, action, actionKey, expanded }) {
  return `
    <button type="button" class="collapsible-module-head" data-action="${escapeHtml(action)}" aria-expanded="${expanded ? "true" : "false"}">
      <span class="collapsible-module-icon" aria-hidden="true"></span>
      <span class="collapsible-module-copy">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(hint)}</span>
      </span>
      <span class="collapsible-module-action">${escapeHtml(t(actionKey))}</span>
    </button>
  `;
}

function renderOptimizerModuleState() {
  if (!els.optimizerResults) return;
  const collapsed = Boolean(state.optimizerCollapsed);
  els.optimizerResults.classList.toggle("collapsed", collapsed);
  els.optimizerResults.classList.toggle("expanded", !collapsed);
  const button = els.optimizerResults.querySelector('[data-action="toggle-optimizer-module"]');
  if (button) {
    button.setAttribute("aria-expanded", String(!collapsed));
    const action = button.querySelector(".collapsible-module-action");
    if (action) action.textContent = collapsed ? t("expandScanResults") : t("collapseScanResults");
  }
  if (!collapsed) {
    requestAnimationFrame(() => optimizerMapRedraw?.());
    window.setTimeout(() => optimizerMapRedraw?.(), 240);
  }
  scheduleOverlayScrollbarUpdate();
  requestAnimationFrame(scheduleOverlayScrollbarUpdate);
  window.setTimeout(scheduleOverlayScrollbarUpdate, 260);
}

function renderAll() {
  renderAnalysisDetails();
  if (state.shareView.loading) {
    drawShareLoadingPreview();
    clearChartLegend();
    renderComparisonPanel();
    ensureOverlayScrollbars();
    return;
  }
  if (state.shareView.active && state.shareView.error && !state.result) {
    drawChartMessage(t("loadShareFailed"), [state.shareView.error], true);
    clearChartLegend();
    renderComparisonPanel();
    ensureOverlayScrollbars();
    return;
  }
  if (!state.result) {
    if (isComparisonMode() && comparisonEntries().length) {
      renderChart();
      renderLegend();
      renderComparisonPanel();
      ensureOverlayScrollbars();
      return;
    }
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
    renderComparisonPanel();
    ensureOverlayScrollbars();
    return;
  }
  renderMetrics();
  renderCorrelation();
  renderRebalanceTable();
  renderChart();
  renderLegend();
  renderComparisonPanel();
  ensureOverlayScrollbars();
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
  const rangeText = m.start && m.end ? `${m.start} ${t("to")} ${m.end}` : shareDateText(state.shareView.portfolio || {});
  const drawdownRangeText = m.drawdownPeak && m.drawdownTrough
    ? ` · ${t("maxDrawdown")} ${m.drawdownPeak} ${t("to")} ${m.drawdownTrough}`
    : "";
  els.rangeLabel.textContent = `${rangeText}${drawdownRangeText}`;
  els.chartTitle.textContent = state.shareView.active && state.shareView.portfolio?.name
    ? state.shareView.portfolio.name
    : state.result.assets
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

function comparisonPayloadFromConfig(config) {
  return {
    assets: config.assets.map((asset, i) => ({
      id: asset.id,
      weight: Number(config.weights?.[i] || 0) * 100,
    })),
    rebalance: config.rebalance,
    start: els.startInput.value || null,
    end: els.endInput.value || null,
  };
}

function comparisonConfigFromProfile(profile) {
  return {
    title: profileTitle(profile),
    assets: (profile.assets || state.assets).map((asset) => ({ id: asset.id })),
    weights: [...(profile.weights || [])],
    rebalance: { ...(profile.rebalance || {}) },
  };
}

function currentComparisonConfig() {
  const weights = currentWeightsAsFractions();
  return {
    title: t("customPortfolio"),
    assets: state.assets.map((asset) => ({ id: asset.id })),
    weights,
    rebalance: { ...state.rebalance },
  };
}

function comparisonConfigFromItem(item, title = item.title) {
  return {
    title,
    assets: (item.assets || state.assets).map((asset) => ({ id: asset.id })),
    weights: [...(item.weights || [])],
    rebalance: { ...(item.rebalance || {}) },
  };
}

function comparisonItemFromConfig(config, result) {
  const assets = config.assets.map((asset) => ({ id: String(asset.id || "").trim().toUpperCase() }));
  const weights = config.weights.map((weight) => Number(weight || 0));
  return {
    key: comparisonKeyForAssets(assets, weights, config.rebalance),
    title: config.title || t("customPortfolio"),
    assets,
    weights,
    weightsText: weightsTextFromConfig(assets, weights),
    rebalance: { ...config.rebalance },
    result,
  };
}

async function fetchComparisonResult(config) {
  return api("/api/backtest", {
    method: "POST",
    body: JSON.stringify(comparisonPayloadFromConfig(config)),
  });
}

function enterComparisonMode() {
  if (state.comparison.active) return;
  state.comparison.active = true;
  state.comparison.previousVisibleSeries = {
    portfolio: state.visibleSeries.portfolio,
    assets: { ...state.visibleSeries.assets },
  };
}

function exitComparisonMode() {
  if (state.comparison.previousVisibleSeries) {
    state.visibleSeries = {
      portfolio: state.comparison.previousVisibleSeries.portfolio !== false,
      assets: { ...(state.comparison.previousVisibleSeries.assets || {}) },
    };
  }
  state.comparison = {
    active: false,
    items: [],
    previousVisibleSeries: null,
    hiddenKeys: [],
    highlightedKey: "",
    sortKey: "",
    sortDirection: "desc",
    viewMode: "branch",
    pendingKey: "",
    pendingAll: false,
    editor: null,
  };
  if (els.comparisonPanel) {
    els.comparisonPanel.hidden = true;
    els.comparisonPanel.innerHTML = "";
  }
  renderChart();
  renderLegend();
  renderOptimizer(state.optimizerProfiles);
  updateAddCurrentCompareButton();
}

function clearComparisonForEdit() {
  if (!isComparisonMode()) return;
  if (state.comparison.previousVisibleSeries) {
    state.visibleSeries = {
      portfolio: state.comparison.previousVisibleSeries.portfolio !== false,
      assets: { ...(state.comparison.previousVisibleSeries.assets || {}) },
    };
  }
  state.comparison = {
    active: false,
    items: [],
    previousVisibleSeries: null,
    hiddenKeys: [],
    highlightedKey: "",
    sortKey: "",
    sortDirection: "desc",
    viewMode: "branch",
    pendingKey: "",
    pendingAll: false,
    editor: null,
  };
  if (els.comparisonPanel) {
    els.comparisonPanel.hidden = true;
    els.comparisonPanel.innerHTML = "";
  }
  if (state.result) {
    renderChart();
    renderLegend();
  }
}

async function addProfileToComparison(profile) {
  if (!state.result || state.loading || state.optimizing || state.comparison.pendingKey || state.comparison.pendingAll) return;
  enterComparisonMode();
  const config = comparisonConfigFromProfile(profile);
  const key = comparisonKeyForAssets(config.assets, config.weights, config.rebalance);
  if (state.comparison.items.some((item) => item.key === key)) {
    renderComparisonPanel();
    renderOptimizer(state.optimizerProfiles);
    return;
  }
  state.comparison.pendingKey = key;
  refreshOptimizerCompareButtons();
  try {
    const result = await fetchComparisonResult(config);
    state.comparison.items.push(comparisonItemFromConfig(config, result));
    resetComparisonView();
    renderAll();
  } catch (error) {
    renderComparisonPanel(error.message || t("requestFailed"));
  } finally {
    state.comparison.pendingKey = "";
    refreshOptimizerCompareButtons();
  }
}

async function addOptimizerProfilesToComparison(inputProfiles) {
  if (!state.result || state.loading || state.optimizing || state.comparison.pendingKey || state.comparison.pendingAll) return;
  const existingKeys = new Set(state.comparison.items.map((item) => item.key));
  const profiles = [];
  for (const profile of inputProfiles || []) {
    const key = profileComparisonKey(profile);
    if (existingKeys.has(key) || profiles.some((item) => profileComparisonKey(item) === key)) continue;
    profiles.push(profile);
  }
  if (!profiles.length) return;
  enterComparisonMode();
  state.comparison.pendingAll = true;
  refreshOptimizerCompareButtons();
  let errorMessage = "";
  try {
    for (const profile of profiles) {
      const config = comparisonConfigFromProfile(profile);
      const key = comparisonKeyForAssets(config.assets, config.weights, config.rebalance);
      if (state.comparison.items.some((item) => item.key === key)) continue;
      const result = await fetchComparisonResult(config);
      state.comparison.items.push(comparisonItemFromConfig(config, result));
      resetComparisonView();
      renderAll();
    }
  } catch (error) {
    errorMessage = error.message || t("requestFailed");
  } finally {
    state.comparison.pendingAll = false;
    renderAll();
    renderOptimizer(state.optimizerProfiles);
    if (errorMessage) renderComparisonPanel(errorMessage);
  }
}

async function addAllProfilesToComparison() {
  return addOptimizerProfilesToComparison(state.optimizerProfiles);
}

function openComparisonEditor(mode = "new", config = currentComparisonConfig(), key = "") {
  if (!els.compareEditorOverlay) return;
  state.comparison.editor = {
    mode,
    key,
    config: {
      title: config.title || t("customPortfolio"),
      assets: (config.assets || []).map((asset) => ({ id: String(asset.id || "").trim().toUpperCase() })),
      weights: [...(config.weights || [])],
      rebalance: { ...(config.rebalance || { mode: "none", threshold: 0.1 }) },
    },
  };
  renderComparisonEditor();
  els.compareEditorOverlay.classList.add("active");
  els.compareEditorOverlay.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    els.compareEditorNameInput?.focus();
    ensureOverlayScrollbars();
  });
}

function closeComparisonEditor() {
  state.comparison.editor = null;
  if (!els.compareEditorOverlay) return;
  els.compareEditorOverlay.classList.remove("active");
  els.compareEditorOverlay.setAttribute("aria-hidden", "true");
  if (els.compareEditorError) els.compareEditorError.textContent = "";
}

function renderComparisonEditor() {
  const editor = state.comparison.editor;
  if (!editor || !els.compareEditorAssets) return;
  const config = editor.config;
  els.compareEditorNameInput.value = config.title || "";
  els.compareEditorRebalanceMode.value = config.rebalance?.mode || "none";
  els.compareEditorThresholdInput.value = Math.round(Number(config.rebalance?.threshold || 0.1) * 100);
  els.compareEditorSubmitBtn.textContent = editor.mode === "edit" ? t("updateCompareItem") : t("saveToCompare");
  els.compareEditorError.textContent = "";
  els.compareEditorAssets.innerHTML = config.assets
    .map(
      (asset, index) => `
        <div class="compare-editor-asset-row" data-index="${index}">
          <input data-field="id" value="${escapeHtml(asset.id || "")}" placeholder="QQQ" />
          <input data-field="weight" type="number" min="0" max="100" step="0.1" value="${escapeHtml(String(Math.round(Number(config.weights[index] || 0) * 1000) / 10))}" />
          <span>%</span>
          <button class="icon-btn" type="button" data-action="remove-editor-asset" title="${escapeHtml(t("remove"))}">×</button>
        </div>
      `,
    )
    .join("");
}

function syncComparisonEditorFromInputs() {
  const editor = state.comparison.editor;
  if (!editor) return null;
  const rows = Array.from(els.compareEditorAssets.querySelectorAll(".compare-editor-asset-row"));
  const assets = [];
  const weights = [];
  rows.forEach((row) => {
    const id = row.querySelector('[data-field="id"]')?.value.trim().toUpperCase();
    const weight = Number(row.querySelector('[data-field="weight"]')?.value || 0) / 100;
    if (!id && weight <= 0) return;
    assets.push({ id });
    weights.push(weight);
  });
  editor.config = {
    title: els.compareEditorNameInput.value.trim() || t("customPortfolio"),
    assets,
    weights,
    rebalance: {
      mode: els.compareEditorRebalanceMode.value || "none",
      threshold: Number(els.compareEditorThresholdInput.value || 10) / 100,
    },
  };
  return editor.config;
}

function normalizeComparisonEditorWeights() {
  const config = syncComparisonEditorFromInputs();
  if (!config) return;
  const total = config.weights.reduce((sum, weight) => sum + Number(weight || 0), 0);
  if (total <= 0) return;
  config.weights = config.weights.map((weight) => Number(weight || 0) / total);
  state.comparison.editor.config = config;
  renderComparisonEditor();
}

function addComparisonEditorAsset() {
  const config = syncComparisonEditorFromInputs() || currentComparisonConfig();
  config.assets.push({ id: "" });
  config.weights.push(0);
  state.comparison.editor.config = config;
  renderComparisonEditor();
}

function removeComparisonEditorAsset(index) {
  const config = syncComparisonEditorFromInputs();
  if (!config || config.assets.length <= 1) return;
  config.assets.splice(index, 1);
  config.weights.splice(index, 1);
  state.comparison.editor.config = config;
  renderComparisonEditor();
}

function validateComparisonConfig(config) {
  const total = config.weights.reduce((sum, weight) => sum + Number(weight || 0), 0);
  return config.assets.length > 0 && config.assets.every((asset) => asset.id) && total > 0;
}

async function submitComparisonEditor() {
  const editor = state.comparison.editor;
  const config = syncComparisonEditorFromInputs();
  if (!editor || !config) return;
  if (!validateComparisonConfig(config)) {
    els.compareEditorError.textContent = t("invalidCompareConfig");
    return;
  }
  const key = comparisonKeyForAssets(config.assets, config.weights, config.rebalance);
  const duplicate = state.comparison.items.some((item) => item.key === key && item.key !== editor.key);
  if (duplicate) {
    els.compareEditorError.textContent = t("comparing");
    return;
  }
  state.comparison.pendingKey = key;
  els.compareEditorSubmitBtn.disabled = true;
  try {
    const result = await fetchComparisonResult(config);
    const item = comparisonItemFromConfig(config, result);
    enterComparisonMode();
    if (editor.mode === "edit") {
      state.comparison.items = state.comparison.items.map((candidate) => (candidate.key === editor.key ? item : candidate));
      state.comparison.hiddenKeys = state.comparison.hiddenKeys.map((hiddenKey) => (hiddenKey === editor.key ? item.key : hiddenKey));
      if (state.comparison.highlightedKey === editor.key) state.comparison.highlightedKey = item.key;
    } else {
      state.comparison.items.push(item);
    }
    resetComparisonView();
    closeComparisonEditor();
    renderAll();
    renderOptimizer(state.optimizerProfiles);
  } catch (error) {
    els.compareEditorError.textContent = error.message || t("requestFailed");
  } finally {
    state.comparison.pendingKey = "";
    els.compareEditorSubmitBtn.disabled = false;
    refreshOptimizerCompareButtons();
  }
}

function addCurrentToComparison() {
  openComparisonEditor("new", currentComparisonConfig());
}

function copyComparisonItem(key) {
  const item = state.comparison.items.find((candidate) => candidate.key === key);
  if (!item) return;
  openComparisonEditor("copy", comparisonConfigFromItem(item, `${item.title} ${t("copySuffix")}`));
}

function editComparisonItem(key) {
  const item = state.comparison.items.find((candidate) => candidate.key === key);
  if (!item) return;
  openComparisonEditor("edit", comparisonConfigFromItem(item), key);
}

async function applyWeightsAndRebalance(weights, rebalance, assets = state.assets) {
  if (state.loading || state.optimizing) return;
  const scrollSnapshot = captureScrollState();
  state.assets = assets.map((asset, i) => ({
    id: asset.id,
    weight: Number(weights[i] || 0) * 100,
  }));
  state.rebalance = {
    mode: rebalance.mode,
    threshold: rebalance.threshold,
  };
  els.thresholdInput.value = Math.round((state.rebalance.threshold || 0.1) * 100);
  renderAssets();
  renderModes();
  refreshSearchSelectionState();
  saveState();
  await runBacktest(true);
  if (isComparisonMode()) {
    renderAll();
    renderOptimizer(state.optimizerProfiles);
  }
  restoreScrollState(scrollSnapshot);
}

function removeComparisonItem(key) {
  state.comparison.items = state.comparison.items.filter((item) => item.key !== key);
  state.comparison.hiddenKeys = state.comparison.hiddenKeys.filter((hiddenKey) => hiddenKey !== key);
  if (state.comparison.highlightedKey === key) state.comparison.highlightedKey = "";
  if (!state.comparison.items.length) {
    exitComparisonMode();
    return;
  }
  resetComparisonView();
  renderAll();
  renderOptimizer(state.optimizerProfiles);
}

function captureComparisonRowRects() {
  const rects = new Map();
  els.comparisonPanel?.querySelectorAll("tr[data-compare-key]").forEach((row) => {
    rects.set(row.dataset.compareKey, row.getBoundingClientRect());
  });
  return rects;
}

function animateComparisonReorder(previousRects, movedKey) {
  requestAnimationFrame(() => {
    els.comparisonPanel?.querySelectorAll("tr[data-compare-key]").forEach((row) => {
      const previous = previousRects.get(row.dataset.compareKey);
      if (!previous) return;
      const current = row.getBoundingClientRect();
      const deltaY = previous.top - current.top;
      if (Math.abs(deltaY) > 1) {
        row.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: "translateY(0)" },
          ],
          { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
      if (row.dataset.compareKey === movedKey) {
        row.classList.add("moved-row");
        window.setTimeout(() => row.classList.remove("moved-row"), 520);
      }
    });
  });
}

function moveComparisonItem(dragKey, targetKey, placeAfter = false, options = {}) {
  if (!dragKey || !targetKey || dragKey === targetKey) return false;
  const previousRects = captureComparisonRowRects();
  const items = [...state.comparison.items];
  const fromIndex = items.findIndex((item) => item.key === dragKey);
  const targetIndex = items.findIndex((item) => item.key === targetKey);
  if (fromIndex < 0 || targetIndex < 0) return false;
  const [moved] = items.splice(fromIndex, 1);
  const adjustedTargetIndex = items.findIndex((item) => item.key === targetKey);
  const insertIndex = adjustedTargetIndex + (placeAfter ? 1 : 0);
  if (items[insertIndex]?.key === dragKey || (fromIndex === insertIndex || fromIndex === insertIndex - 1)) return false;
  items.splice(insertIndex, 0, moved);
  state.comparison.items = items;
  state.comparison.sortKey = "";
  if (options.render !== false) {
    renderAll();
    animateComparisonReorder(previousRects, dragKey);
  }
  return true;
}

function moveComparisonItemToIndex(dragKey, insertIndex, options = {}) {
  if (!dragKey) return false;
  const previousRects = captureComparisonRowRects();
  const items = [...state.comparison.items];
  const fromIndex = items.findIndex((item) => item.key === dragKey);
  if (fromIndex < 0) return false;
  const [moved] = items.splice(fromIndex, 1);
  const boundedIndex = Math.max(0, Math.min(insertIndex, items.length));
  if (fromIndex === boundedIndex) return false;
  items.splice(boundedIndex, 0, moved);
  state.comparison.items = items;
  state.comparison.sortKey = "";
  if (options.render !== false) {
    renderAll();
    animateComparisonReorder(previousRects, dragKey);
  }
  return true;
}

function syncComparisonItemsFromTableOrder(tbody) {
  if (!tbody) return false;
  const orderedKeys = Array.from(tbody.querySelectorAll("tr[data-compare-key]")).map((row) => row.dataset.compareKey);
  const itemsByKey = new Map(state.comparison.items.map((item) => [item.key, item]));
  const orderedItems = orderedKeys.map((key) => itemsByKey.get(key)).filter(Boolean);
  if (orderedItems.length !== state.comparison.items.length) return false;
  const changed = orderedItems.some((item, index) => item.key !== state.comparison.items[index]?.key);
  if (!changed) return false;
  state.comparison.items = orderedItems;
  state.comparison.sortKey = "";
  return true;
}

function scheduleComparisonDragRepaint() {
  if (comparisonDragRepaintFrame) return;
  comparisonDragRepaintFrame = requestAnimationFrame(() => {
    comparisonDragRepaintFrame = null;
    renderChart();
    renderLegend();
  });
}

function updateComparisonDragGhost(event) {
  if (!comparisonPointerDrag?.ghost) return;
  const x = event.clientX - comparisonPointerDrag.offsetX;
  const y = event.clientY - comparisonPointerDrag.offsetY;
  comparisonPointerDrag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function cleanupComparisonDragArtifacts() {
  if (comparisonDropCleanupTimer) {
    window.clearTimeout(comparisonDropCleanupTimer);
    comparisonDropCleanupTimer = null;
  }
  document.querySelectorAll(".drag-ghost-row").forEach((ghost) => ghost.remove());
  els.comparisonPanel?.querySelectorAll(".drag-source-row").forEach((row) => row.classList.remove("drag-source-row"));
}

function startComparisonPointerDrag(row, event) {
  if (event.button !== 0 || event.target.closest("button")) return;
  const key = row.dataset.compareKey || "";
  if (!key) return;
  event.preventDefault();
  cleanupComparisonDragArtifacts();
  const rect = row.getBoundingClientRect();
  comparisonPointerDrag = {
    key,
    pointerId: event.pointerId,
    sourceRow: row,
    ghost: null,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    rect,
    active: false,
  };
  document.addEventListener("pointermove", updateComparisonPointerDrag, true);
  document.addEventListener("pointerup", endComparisonPointerDrag, true);
  document.addEventListener("pointercancel", endComparisonPointerDrag, true);
}

function activateComparisonPointerDrag(event) {
  if (!comparisonPointerDrag || comparisonPointerDrag.active) return;
  const ghost = comparisonPointerDrag.sourceRow.cloneNode(true);
  ghost.classList.add("drag-ghost-row");
  const sourceCells = Array.from(comparisonPointerDrag.sourceRow.children);
  Array.from(ghost.children).forEach((cell, index) => {
    const sourceCell = sourceCells[index];
    if (!sourceCell) return;
    cell.style.width = `${sourceCell.getBoundingClientRect().width}px`;
  });
  ghost.style.width = `${comparisonPointerDrag.rect.width}px`;
  ghost.style.height = `${comparisonPointerDrag.rect.height}px`;
  ghost.style.left = "0";
  ghost.style.top = "0";
  ghost.style.transform = `translate3d(${comparisonPointerDrag.rect.left}px, ${comparisonPointerDrag.rect.top}px, 0)`;
  document.body.appendChild(ghost);
  comparisonPointerDrag.sourceRow.classList.add("drag-source-row");
  comparisonPointerDrag.ghost = ghost;
  comparisonPointerDrag.active = true;
  updateComparisonDragGhost(event);
}

function updateComparisonPointerDrag(event) {
  if (!comparisonPointerDrag || event.pointerId !== comparisonPointerDrag.pointerId) return;
  event.preventDefault();
  if (!comparisonPointerDrag.active) {
    const dx = event.clientX - comparisonPointerDrag.startX;
    const dy = event.clientY - comparisonPointerDrag.startY;
    if (Math.hypot(dx, dy) < 4) return;
    activateComparisonPointerDrag(event);
  }
  updateComparisonDragGhost(event);
  const tbody = comparisonPointerDrag.sourceRow.closest("tbody");
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll("tr[data-compare-key]")).filter(
    (row) => row.dataset.compareKey !== comparisonPointerDrag.key,
  );
  const hoveredRow = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("tr[data-compare-key]");
  let referenceRow = null;
  if (hoveredRow && hoveredRow !== comparisonPointerDrag.sourceRow && tbody.contains(hoveredRow)) {
    const rect = hoveredRow.getBoundingClientRect();
    referenceRow = event.clientY < rect.top + rect.height / 2 ? hoveredRow : hoveredRow.nextElementSibling;
  } else {
    const tableRect = tbody.getBoundingClientRect();
    if (event.clientY < tableRect.top) {
      referenceRow = rows[0] || null;
    } else if (event.clientY > tableRect.bottom) {
      referenceRow = null;
    } else {
      referenceRow = rows.find((row) => event.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2) || null;
    }
  }
  if (referenceRow === comparisonPointerDrag.sourceRow.nextElementSibling) return;
  const previousRects = captureComparisonRowRects();
  if (referenceRow) {
    tbody.insertBefore(comparisonPointerDrag.sourceRow, referenceRow);
  } else {
    tbody.appendChild(comparisonPointerDrag.sourceRow);
  }
  const moved = syncComparisonItemsFromTableOrder(tbody);
  if (!moved) return;
  animateComparisonReorder(previousRects, comparisonPointerDrag.key);
  scheduleComparisonDragRepaint();
}

function endComparisonPointerDrag(event) {
  if (!comparisonPointerDrag || event.pointerId !== comparisonPointerDrag.pointerId) return;
  if (comparisonPointerDrag.active) comparisonDragEndedAt = Date.now();
  const dragState = comparisonPointerDrag;
  comparisonPointerDrag = null;
  document.removeEventListener("pointermove", updateComparisonPointerDrag, true);
  document.removeEventListener("pointerup", endComparisonPointerDrag, true);
  document.removeEventListener("pointercancel", endComparisonPointerDrag, true);
  if (dragState.active && dragState.ghost && dragState.sourceRow) {
    const rect = dragState.sourceRow.getBoundingClientRect();
    dragState.ghost.classList.add("dropping");
    dragState.ghost.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    comparisonDropCleanupTimer = window.setTimeout(() => {
      comparisonDropCleanupTimer = null;
      cleanupComparisonDragArtifacts();
      renderAll();
    }, 170);
    return;
  }
  cleanupComparisonDragArtifacts();
  renderAll();
}

function renderComparisonPanel(message = "") {
  if (!els.comparisonPanel || !isComparisonMode()) {
    if (els.comparisonPanel) els.comparisonPanel.hidden = true;
    return;
  }
  const entries = comparisonEntries();
  els.comparisonPanel.hidden = false;
  const rows = entries
    .map((entry) => {
      const metrics = comparisonMetricsForEntry(entry);
      const hidden = isComparisonHidden(entry.key);
      const rowClasses = hidden ? "muted-item" : "";
      const displayTitle = comparisonDisplayTitle(entry, entries);
      const action = `<button type="button" data-action="apply" data-key="${escapeHtml(entry.key)}">${escapeHtml(t("apply"))}</button>
           <button type="button" data-action="copy" data-key="${escapeHtml(entry.key)}">${escapeHtml(t("copy"))}</button>
           <button type="button" data-action="edit" data-key="${escapeHtml(entry.key)}">${escapeHtml(t("edit"))}</button>
           <button type="button" data-action="remove" data-key="${escapeHtml(entry.key)}">${escapeHtml(t("remove"))}</button>`;
      return `
        <tr data-compare-key="${escapeHtml(entry.key)}" class="${rowClasses}">
          <td><strong><i class="comparison-drag-handle" aria-hidden="true">⋮⋮</i>${escapeHtml(displayTitle)}</strong><span>${escapeHtml(entry.weightsText)}</span></td>
          <td>${escapeHtml(rebalanceLabel(entry.rebalance))}</td>
          <td>${escapeHtml(fmtPct(metrics.cagr))}</td>
          <td>${escapeHtml(fmtPct(metrics.maxDrawdown))}</td>
          <td>${escapeHtml(fmtMultiple(metrics.averageNav))}</td>
          <td>${escapeHtml(fmtWithdrawalCagr(metrics))}</td>
          <td class="comparison-actions"><div class="comparison-action-group">${action}</div></td>
        </tr>
      `;
    })
    .join("");
  els.comparisonPanel.innerHTML = `
    <div class="comparison-head">
      <div>
        <strong>${escapeHtml(t("compareTableTitle"))}</strong>
        ${message ? `<span class="error">${escapeHtml(message)}</span>` : `<span>${escapeHtml(t("compareMode"))}</span>`}
      </div>
      <div class="comparison-head-actions">
        <div class="comparison-view-toggle" role="group" aria-label="${escapeHtml(t("comparisonViewMode"))}">
          <button type="button" data-comparison-view="branch" class="${comparisonViewMode() === "branch" ? "active" : ""}">${escapeHtml(t("comparisonBranchMode"))}</button>
          <button type="button" data-comparison-view="overlap" class="${comparisonViewMode() === "overlap" ? "active" : ""}">${escapeHtml(t("comparisonOverlapMode"))}</button>
        </div>
        <button class="ghost-btn" type="button" data-action="new-compare">${escapeHtml(t("newCompareItem"))}</button>
        <button class="ghost-btn comparison-exit-btn" type="button" data-action="exit-compare">${escapeHtml(t("exitCompare"))}</button>
      </div>
    </div>
    <div class="comparison-table-wrap">
      <table class="comparison-table">
        <thead>
          <tr>
            <th><button type="button" data-sort="portfolio">${escapeHtml(t("portfolio"))}${escapeHtml(comparisonSortIndicator("portfolio"))}</button></th>
            <th><button type="button" data-sort="rebalance">${escapeHtml(t("rebalance"))}${escapeHtml(comparisonSortIndicator("rebalance"))}</button></th>
            <th><button type="button" data-sort="cagr">${escapeHtml(t("annualShort"))}${escapeHtml(comparisonSortIndicator("cagr"))}</button></th>
            <th><button type="button" data-sort="drawdown">${escapeHtml(t("drawdownShort"))}${escapeHtml(comparisonSortIndicator("drawdown"))}</button></th>
            <th><button type="button" data-sort="averageNav">${escapeHtml(t("averageNavShort"))}${escapeHtml(comparisonSortIndicator("averageNav"))}</button></th>
            <th><button type="button" data-sort="withdrawal">${escapeHtml(t("withdrawal4Short"))}${escapeHtml(comparisonSortIndicator("withdrawal"))}</button></th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  els.comparisonPanel.querySelectorAll("button[data-sort]").forEach((button) => {
    button.addEventListener("click", () => setComparisonSort(button.dataset.sort));
  });
  els.comparisonPanel.querySelectorAll("button[data-comparison-view]").forEach((button) => {
    button.addEventListener("click", () => setComparisonViewMode(button.dataset.comparisonView));
  });
  els.comparisonPanel.querySelector('button[data-action="exit-compare"]')?.addEventListener("click", exitComparisonMode);
  els.comparisonPanel.querySelector('button[data-action="new-compare"]')?.addEventListener("click", () => {
    openComparisonEditor("new", currentComparisonConfig());
  });
  els.comparisonPanel.querySelectorAll("button[data-action]").forEach((button) => {
    if (button.dataset.action === "exit-compare" || button.dataset.action === "new-compare") return;
    button.disabled = state.loading || state.optimizing;
    button.addEventListener("click", () => {
      const item = state.comparison.items.find((candidate) => candidate.key === button.dataset.key);
      if (!item) return;
      if (button.dataset.action === "remove") {
        removeComparisonItem(item.key);
      } else if (button.dataset.action === "copy") {
        copyComparisonItem(item.key);
      } else if (button.dataset.action === "edit") {
        editComparisonItem(item.key);
      } else {
        applyWeightsAndRebalance(item.weights, item.rebalance, item.assets);
      }
    });
  });
  els.comparisonPanel.querySelectorAll("tr[data-compare-key]").forEach((row) => {
    row.addEventListener("pointerenter", () => setComparisonHighlight(row.dataset.compareKey));
    row.addEventListener("pointerleave", () => setComparisonHighlight(""));
    row.addEventListener("pointerdown", (event) => startComparisonPointerDrag(row, event));
    row.addEventListener("click", (event) => {
      if (Date.now() - comparisonDragEndedAt < 250) return;
      if (event.target.closest("button")) return;
      editComparisonItem(row.dataset.compareKey);
    });
  });
}

function renderLegend() {
  if (!state.result && !comparisonEntries().length) return;
  let legend = document.getElementById("chartLegend");
  if (!legend) {
    legend = document.createElement("div");
    legend.id = "chartLegend";
    legend.className = "chart-legend";
    document.querySelector(".chart-panel").appendChild(legend);
    legend.addEventListener("click", (event) => {
      const item = event.target.closest("button[data-series]");
      const compareItem = event.target.closest("button[data-compare-key]");
      if (compareItem && isComparisonMode()) {
        const key = compareItem.dataset.compareKey;
        if (!isComparisonHidden(key) && visibleComparisonEntries().length <= 1) return;
        setComparisonHidden(key, !isComparisonHidden(key));
        renderChart();
        renderLegend();
        renderComparisonPanel();
        return;
      }
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
    const handleCompareHover = (event) => {
      const compareItem = event.target.closest("button[data-compare-key]");
      if (compareItem && isComparisonMode()) {
        setComparisonHighlight(isComparisonHidden(compareItem.dataset.compareKey) ? "" : compareItem.dataset.compareKey);
      }
    };
    legend.addEventListener("pointerover", handleCompareHover);
    legend.addEventListener("mousemove", handleCompareHover);
    legend.addEventListener("pointerout", (event) => {
      const compareItem = event.target.closest("button[data-compare-key]");
      if (compareItem && !compareItem.contains(event.relatedTarget)) {
        setComparisonHighlight("");
      }
    });
    legend.addEventListener("mouseleave", () => setComparisonHighlight(""));
  }
  if (isComparisonMode()) {
    const entries = comparisonEntries();
    legend.innerHTML = `
      <div class="chart-legend-series">
        ${entries
          .map(
            (entry, idx) => {
              const hidden = isComparisonHidden(entry.key);
              const highlighted = state.comparison.highlightedKey === entry.key;
              const displayTitle = comparisonDisplayTitle(entry, entries);
              const classes = [hidden ? "muted-item" : "", highlighted ? "highlighted-item" : "", entry.current ? "current-item" : ""]
                .filter(Boolean)
                .join(" ");
              return `<button type="button" data-compare-key="${escapeHtml(entry.key)}" class="${classes}">
                <i style="background:${idx === 0 ? "var(--accent-2)" : palette[(idx + 1) % palette.length]}"></i>${escapeHtml(displayTitle)}
              </button>`;
            },
          )
          .join("")}
      </div>
    `;
    return;
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

function chartResultForView() {
  if (isComparisonMode()) {
    const dates = comparisonChartDates(comparisonEntries());
    if (!dates.length) return state.result;
    return {
      dates,
      nav: dates.map(() => 1),
      drawdowns: dates.map(() => 0),
      metrics: {},
    };
  }
  return state.result;
}

function comparisonDateAxis(entries = visibleComparisonEntries()) {
  const dates = new Set();
  entries.forEach((entry) => {
    (entry.result?.dates || []).forEach((date) => dates.add(date));
  });
  return Array.from(dates).sort();
}

function comparisonEntryStart(entry) {
  return entry?.result?.dates?.[0] || "";
}

function comparisonEntryEnd(entry) {
  const dates = entry?.result?.dates || [];
  return dates[dates.length - 1] || "";
}

function comparisonEntrySpan(entry) {
  const start = comparisonEntryStart(entry);
  const end = comparisonEntryEnd(entry);
  return start && end ? Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`) : 0;
}

function comparisonAnchorEntry(entries = comparisonEntries()) {
  return [...entries].sort((a, b) => {
    const spanDiff = comparisonEntrySpan(b) - comparisonEntrySpan(a);
    if (spanDiff) return spanDiff;
    return comparisonEntryStart(a).localeCompare(comparisonEntryStart(b));
  })[0];
}

function comparisonLatestStartEntry(entries = comparisonEntries()) {
  return [...entries].sort((a, b) => comparisonEntryStart(b).localeCompare(comparisonEntryStart(a)))[0];
}

function comparisonChartDates(entries = comparisonEntries()) {
  const validEntries = entries.filter((entry) => entry.result?.dates?.length);
  if (!validEntries.length) return [];
  if (comparisonViewMode() === "overlap") {
    const latestStart = validEntries.reduce((maxDate, entry) => Math.max(maxDate, Date.parse(`${comparisonEntryStart(entry)}T00:00:00Z`)), 0);
    const earliestEnd = validEntries.reduce(
      (minDate, entry) => Math.min(minDate, Date.parse(`${comparisonEntryEnd(entry)}T00:00:00Z`)),
      Infinity,
    );
    const axisEntry = comparisonLatestStartEntry(validEntries);
    return (axisEntry?.result?.dates || []).filter((date) => {
      const value = Date.parse(`${date}T00:00:00Z`);
      return value >= latestStart && value <= earliestEnd;
    });
  }
  return comparisonAnchorEntry(validEntries)?.result?.dates || comparisonDateAxis(validEntries);
}

function resetComparisonView() {
  if (!isComparisonMode()) return;
  const dates = comparisonChartDates(comparisonEntries());
  state.view = dates.length ? { start: 0, end: dates.length - 1 } : null;
}

function alignedSeriesForDates(result, dates) {
  const sourceDates = result?.dates || [];
  const sourceValues = result?.nav || [];
  if (!sourceDates.length || !sourceValues.length || !dates.length) return dates.map(() => null);
  const firstDate = sourceDates[0];
  const lastDate = sourceDates[sourceDates.length - 1];
  let sourceIndex = 0;
  let lastValue = null;
  return dates.map((date) => {
    while (sourceIndex < sourceDates.length && sourceDates[sourceIndex] <= date) {
      lastValue = sourceValues[sourceIndex];
      sourceIndex += 1;
    }
    if (date < firstDate || date > lastDate) return null;
    return lastValue;
  });
}

function comparisonSeriesForEntry(entry, dates, entries = comparisonEntries()) {
  const rawSeries = alignedSeriesForDates(entry.result, dates);
  if (comparisonViewMode() === "overlap") {
    const base = rawSeries.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
    return rawSeries.map((value) => (Number.isFinite(Number(value)) && base ? Number(value) / base : null));
  }
  const anchor = comparisonAnchorEntry(entries);
  if (!anchor || anchor.key === entry.key) return rawSeries;
  const anchorSeries = alignedSeriesForDates(anchor.result, dates);
  const branchIndex = rawSeries.findIndex(
    (value, index) =>
      Number.isFinite(Number(value)) &&
      Number(value) > 0 &&
      Number.isFinite(Number(anchorSeries[index])) &&
      Number(anchorSeries[index]) > 0,
  );
  if (branchIndex < 0) return dates.map(() => null);
  const ownBase = Number(rawSeries[branchIndex]);
  const anchorBase = Number(anchorSeries[branchIndex]);
  return rawSeries.map((value, index) => {
    if (index < branchIndex || !Number.isFinite(Number(value)) || ownBase <= 0) return null;
    return anchorBase * (Number(value) / ownBase);
  });
}

function resultValueOnDate(result, date) {
  const sourceDates = result?.dates || [];
  const sourceValues = result?.nav || [];
  if (!sourceDates.length || !sourceValues.length || date < sourceDates[0] || date > sourceDates[sourceDates.length - 1]) {
    return null;
  }
  let left = 0;
  let right = sourceDates.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sourceDates[mid] <= date) left = mid + 1;
    else right = mid - 1;
  }
  return right >= 0 ? sourceValues[right] : null;
}

function getViewData() {
  const result = chartResultForView();
  const start = Math.max(0, state.view?.start ?? 0);
  const end = Math.min(result.dates.length - 1, state.view?.end ?? result.dates.length - 1);
  return { start, end };
}

function renderChart() {
  if (!state.result && !comparisonEntries().length) return;
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
  const compareMode = isComparisonMode();
  const allCompareEntries = compareMode ? comparisonEntries() : [];
  const compareEntries = compareMode ? visibleComparisonEntries() : [];
  const viewResult = compareMode && compareEntries[0] ? compareEntries[0].result : state.result;
  const chartViewResult = compareMode ? chartResultForView() : viewResult;
  const drawdownHeight = compareMode ? 0 : 80;
  const drawdownBottomMargin = 20;
  const drawdownTop = cssHeight - drawdownBottomMargin - drawdownHeight;
  const pad = { left: 58, right: 18, top: 22, bottom: cssHeight - drawdownTop + 56 };
  const plotW = cssWidth - pad.left - pad.right;
  const plotH = cssHeight - pad.top - pad.bottom;
  const { start, end } = getViewData();
  const nav = chartViewResult.nav.slice(start, end + 1);
  const drawdowns = chartViewResult.drawdowns.slice(start, end + 1);
  const dates = chartViewResult.dates.slice(start, end + 1);
  const full = viewResult.metrics;
  els.rangeLabel.textContent = compareMode
    ? `${t("compareMode")} · ${t(comparisonViewMode() === "overlap" ? "comparisonOverlapMode" : "comparisonBranchMode")} · ${t("currentView")} ${chartViewResult.dates[start]} ${t("to")} ${chartViewResult.dates[end]}`
    : `${t("currentView")} ${viewResult.dates[start]} ${t("to")} ${viewResult.dates[end]} · ${t("fullRangeMaxDrawdown")} ${full.drawdownPeak} ${t("to")} ${full.drawdownTrough}`;
  const assetSeries = compareMode ? [] : state.result.assetSeries.map((series) => series.slice(start, end + 1));
  const portfolioVisible = state.visibleSeries.portfolio !== false;
  const visibleAssetSeries = compareMode
    ? []
    : assetSeries.filter((_, idx) => state.visibleSeries.assets[state.result.assets[idx].id] !== false);
  const compareSeries = compareEntries.map((entry) => comparisonSeriesForEntry(entry, dates, allCompareEntries));
  const valueSeries = compareMode
    ? compareSeries
    : [...(portfolioVisible ? [nav] : []), ...visibleAssetSeries];
  const seriesForScale = valueSeries.length ? valueSeries : [nav];
  let rawMin = Infinity;
  let rawMax = -Infinity;
  let allPositive = true;
  for (const series of seriesForScale) {
    for (const value of series) {
      if (!Number.isFinite(value)) continue;
      rawMin = Math.min(rawMin, value);
      rawMax = Math.max(rawMax, value);
      if (value <= 0) allPositive = false;
    }
  }
  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
    rawMin = 0;
    rawMax = 1;
    allPositive = false;
  }
  const useLogScale = state.chartScale === "log" && allPositive;
  let plotMin = useLogScale ? Math.log(rawMin) : rawMin;
  let plotMax = useLogScale ? Math.log(rawMax) : rawMax;
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
  const targetPlotPoints = Math.max(32, Math.floor(plotW / 2));
  const isFinitePointValue = (value) => Number.isFinite(Number(value));
  const samplePlotPoints = (series, mode = "average") => {
    const validIndexes = series
      .map((value, index) => (isFinitePointValue(value) ? index : -1))
      .filter((index) => index >= 0);
    if (!validIndexes.length) return [];
    const firstValid = validIndexes[0];
    const lastValid = validIndexes[validIndexes.length - 1];
    if (series.length <= targetPlotPoints * 1.25) {
      return series.map((value, i) => ({ i, value })).filter((point) => isFinitePointValue(point.value));
    }
    const points = [{ i: firstValid, value: series[firstValid] }];
    const bucketSize = (lastValid - firstValid) / Math.max(1, targetPlotPoints - 1);
    for (let bucket = 1; bucket < targetPlotPoints - 1; bucket++) {
      const startIdx = Math.max(firstValid + 1, Math.floor(firstValid + bucket * bucketSize));
      const endIdx = Math.min(lastValid - 1, Math.floor(firstValid + (bucket + 1) * bucketSize));
      if (endIdx < startIdx) continue;
      const bucketValues = [];
      for (let i = startIdx; i <= endIdx; i++) {
        if (isFinitePointValue(series[i])) bucketValues.push(Number(series[i]));
      }
      if (!bucketValues.length) continue;
      let value = bucketValues[0];
      if (mode === "min") {
        for (const candidate of bucketValues) value = Math.min(value, candidate);
      } else if (mode === "max") {
        for (const candidate of bucketValues) value = Math.max(value, candidate);
      } else {
        value = bucketValues.reduce((total, candidate) => total + candidate, 0) / bucketValues.length;
      }
      points.push({ i: Math.round((startIdx + endIdx) / 2), value });
    }
    points.push({ i: lastValid, value: series[lastValid] });
    return points;
  };
  const drawSampledSeries = (series, valueToY = y, mode = "average") => {
    let active = false;
    samplePlotPoints(series, mode).forEach((point, idx) => {
      if (!isFinitePointValue(point.value)) {
        active = false;
        return;
      }
      if (!active) {
        ctx.moveTo(x(point.i), valueToY(point.value));
        active = true;
      } else {
        ctx.lineTo(x(point.i), valueToY(point.value));
      }
    });
  };
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

  if (compareMode) {
    compareSeries.forEach((series, idx) => {
      const entry = compareEntries[idx];
      const originalIndex = Math.max(0, allCompareEntries.findIndex((candidate) => candidate.key === entry.key));
      const highlighted = state.comparison.highlightedKey && state.comparison.highlightedKey !== entry.key;
      ctx.save();
      ctx.globalAlpha = highlighted ? 0.22 : 1;
      ctx.strokeStyle = originalIndex === 0 ? chartColors.portfolio : palette[(originalIndex + 1) % palette.length];
      ctx.lineWidth = state.comparison.highlightedKey === entry.key ? 3.4 : originalIndex === 0 ? 2.4 : 1.8;
      ctx.beginPath();
      drawSampledSeries(series);
      ctx.stroke();
      ctx.restore();
    });
  } else {
    assetSeries.forEach((series, idx) => {
      if (state.visibleSeries.assets[state.result.assets[idx].id] === false) return;
      ctx.strokeStyle = palette[(idx + 1) % palette.length] + "88";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      drawSampledSeries(series);
      ctx.stroke();
    });
  }

  if (!compareMode && portfolioVisible) {
    ctx.strokeStyle = chartColors.portfolio;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    drawSampledSeries(nav);
    ctx.stroke();

    const drawdownHighlight = 0.10;
    ctx.strokeStyle = chartColors.danger;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    let active = false;
    for (const point of samplePlotPoints(nav)) {
      if (point.i === 0) continue;
      if (drawdowns[point.i] <= -drawdownHighlight) {
        if (!active) {
          ctx.moveTo(x(Math.max(0, point.i - 1)), y(nav[Math.max(0, point.i - 1)]));
          active = true;
        }
        ctx.lineTo(x(point.i), y(point.value));
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
    if (compareMode || !portfolioVisible || !eventDates.has(date)) return;
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

  if (!compareMode && portfolioVisible) {
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
    samplePlotPoints(drawdowns, "min").forEach((point) => {
      ctx.lineTo(x(point.i), ddY(point.value));
    });
    ctx.lineTo(pad.left + plotW, ddTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = chartColors.danger;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    drawSampledSeries(drawdowns, ddY, "min");
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
    const compareHoverSeries = compareMode
      ? compareSeries.find((series) => isFinitePointValue(series[localHoverIndex]))
      : null;
    const hoverValue = compareHoverSeries ? compareHoverSeries[localHoverIndex] : nav[localHoverIndex];
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
  if ((!state.result && !comparisonEntries().length) || state.selection) return;
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
  const viewResult = chartResultForView();
  const date = viewResult.dates[idx];
  if (!date) {
    hideTooltip();
    return;
  }
  const nav = viewResult.nav[idx];
  const dd = viewResult.drawdowns[idx];
  const weights = state.result?.weightsTimeline[idx] || [];
  if (isComparisonMode()) {
    const entries = visibleComparisonEntries();
    const allEntries = comparisonEntries();
    els.tooltip.innerHTML = `
      <strong>${date}</strong><br>
      ${entries
        .map((entry) => {
          const value = comparisonSeriesForEntry(entry, viewResult.dates, allEntries)[idx];
          return `${escapeHtml(comparisonDisplayTitle(entry))} ${Number.isFinite(value) ? fmtNum(value, 3) : "--"}`;
        })
        .join("<br>")}
    `;
  } else {
    els.tooltip.innerHTML = `
      <strong>${date}</strong><br>
      ${t("nav")} ${nav.toFixed(3)}<br>
      ${t("drawdown")} ${fmtPct(dd)}<br>
      ${weights
        .map((weight, i) => `${state.result.assets[i].id} ${fmtPct(weight, 1)}`)
        .join("<br>")}
    `;
  }
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
  if (!state.optimizerProfiles.length) {
    els.optimizerResults.innerHTML = `<div class="status">${t("scanning")}</div>`;
  }
  restoreScrollState(scrollSnapshot);
  try {
    const data = await api("/api/optimize", {
      method: "POST",
      body: JSON.stringify({ ...requestPayload(), optimize: optimizerRequestOptions() }),
    });
    state.optimizerSelectedKeys = [];
    state.optimizerFocusedKey = "";
    state.optimizerTagFilter = "";
    state.optimizerMapView = null;
    state.optimizerCollapsed = false;
    state.analysisDetailsCollapsed = true;
    renderAnalysisDetails();
    renderOptimizer(data.profiles, data.summary);
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

function optimizerSummaryMarkup(summary) {
  if (!summary) return "";
  const cards = [
    [t("scannedCandidates"), String(summary.scanned ?? 0)],
    [t("eligibleCandidates"), String(summary.eligible ?? summary.scanned ?? 0)],
    [t("retainedCandidates"), String(summary.retained ?? 0)],
    [t("gridStep"), fmtPct(summary.step ?? 0, 1)],
    [t("maxWeight"), fmtPct(summary.maxWeight ?? 0, 0)],
    [t("maxDrawdownLimit"), summary.maxDrawdown == null ? t("unlimited") : fmtPct(summary.maxDrawdown, 0)],
    [t("annualShort"), `${fmtPct(summary.cagrRange?.[0])} - ${fmtPct(summary.cagrRange?.[1])}`],
    [t("drawdownShort"), `${fmtPct(summary.drawdownRange?.[0])} - ${fmtPct(summary.drawdownRange?.[1])}`],
    [t("averageNavShort"), `${fmtMultiple(summary.averageNavRange?.[0])} - ${fmtMultiple(summary.averageNavRange?.[1])}`],
  ];
  return `
    <section class="optimizer-summary">
      <div class="optimizer-summary-grid">
        ${cards
          .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
          .join("")}
      </div>
    </section>
  `;
}

function optimizerProfileKey(profile) {
  return profileComparisonKey(profile);
}

function optimizerTagsMarkup(profile) {
  const tags = profile.tags || [];
  if (!tags.length) return "";
  return `<div class="optimizer-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function optimizerActionsMarkup(profile, index) {
  const compareKey = profileComparisonKey(profile);
  const alreadyComparing = isComparisonMode() && state.comparison.items.some((item) => item.key === compareKey);
  return `
    <div class="opt-actions">
      <button class="opt-action-primary" type="button" data-action="apply" data-profile-index="${index}">${escapeHtml(t("apply"))}</button>
      <button class="opt-action-secondary" type="button" data-action="compare" data-profile-index="${index}" data-compare-key="${escapeHtml(compareKey)}">${escapeHtml(alreadyComparing ? t("comparing") : t("compare"))}</button>
    </div>
  `;
}

function featuredOptimizerProfiles(profiles) {
  const preferredKinds = ["balanced", "return", "mdd20", "averageNav", "diverse"];
  const featured = [];
  preferredKinds.forEach((kind) => {
    const match = profiles.find((profile) => profile.kind === kind && !featured.includes(profile));
    if (match) featured.push(match);
  });
  profiles.forEach((profile) => {
    if (featured.length >= 4) return;
    if (!featured.includes(profile)) featured.push(profile);
  });
  return featured.slice(0, 4);
}

function optimizerSortValue(profile, key) {
  const metrics = profile.metrics || {};
  if (key === "title") return profileTitle(profile);
  if (key === "cagr") return Number(metrics.cagr ?? -Infinity);
  if (key === "drawdown") return Number(metrics.maxDrawdown ?? -Infinity);
  if (key === "averageNav") return Number(metrics.averageNav ?? -Infinity);
  if (key === "sharpe") return Number(metrics.sharpe0 ?? -Infinity);
  if (key === "volatility") return Number(metrics.volatility ?? Infinity);
  if (key === "rebalance") return rebalanceLabel(profile.rebalance);
  return Number(profile.score?.composite ?? -Infinity);
}

function optimizerAvailableTags(profiles = state.optimizerProfiles) {
  return Array.from(new Set(profiles.flatMap((profile) => profile.tags || []))).sort((a, b) => a.localeCompare(b));
}

function optimizerVisibleProfiles() {
  const filter = state.optimizerTagFilter;
  const profiles = state.optimizerProfiles.filter((profile) => !filter || (profile.tags || []).includes(filter));
  const direction = state.optimizerSortDirection === "asc" ? 1 : -1;
  return [...profiles].sort((a, b) => {
    const av = optimizerSortValue(a, state.optimizerSortKey);
    const bv = optimizerSortValue(b, state.optimizerSortKey);
    let diff = 0;
    if (typeof av === "string" || typeof bv === "string") {
      diff = String(av).localeCompare(String(bv));
    } else {
      diff = Number(av) - Number(bv);
    }
    if (!Number.isFinite(diff) || diff === 0) {
      diff = optimizerProfileKey(a).localeCompare(optimizerProfileKey(b));
    }
    return diff * direction;
  });
}

function focusOptimizerProfile(key) {
  if (!key) return;
  state.optimizerFocusedKey = key;
  renderOptimizer(state.optimizerProfiles);
  requestAnimationFrame(() => {
    const row = els.optimizerResults.querySelector(`[data-profile-key="${CSS.escape(key)}"]`);
    row?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  });
}

function optimizerSortButton(key, label) {
  const active = state.optimizerSortKey === key;
  const suffix = active ? (state.optimizerSortDirection === "asc" ? " ↑" : " ↓") : "";
  return `<button class="optimizer-sort-btn ${active ? "active" : ""}" type="button" data-optimizer-sort="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
}

function optimizerResultToolbarMarkup(visibleProfiles, allTags) {
  const selectedCount = state.optimizerSelectedKeys.length;
  const visibleCount = visibleProfiles.length;
  const visibleKeys = visibleProfiles.map(optimizerProfileKey);
  const selectedVisibleCount = visibleKeys.filter((key) => state.optimizerSelectedKeys.includes(key)).length;
  const allVisibleSelected = visibleCount > 0 && selectedVisibleCount === visibleCount;
  const tagOptions = [
    `<option value="">${escapeHtml(t("allTags"))}</option>`,
    ...allTags.map(
      (tag) => `<option value="${escapeHtml(tag)}" ${state.optimizerTagFilter === tag ? "selected" : ""}>${escapeHtml(tag)}</option>`,
    ),
  ].join("");
  return `
    <div class="optimizer-result-toolbar">
      <label>
        <span>${escapeHtml(t("scanFilters"))}</span>
        <select data-optimizer-tag-filter>${tagOptions}</select>
      </label>
      <div class="optimizer-result-counts">
        <span>${escapeHtml(t("visibleCandidates"))}: ${escapeHtml(String(visibleCount))}</span>
        <span>${escapeHtml(t("selectedCandidates"))}: ${escapeHtml(String(selectedCount))}</span>
      </div>
      <div class="optimizer-bulk-actions">
        <label class="optimizer-select-visible">
          <input type="checkbox" data-optimizer-select-visible ${allVisibleSelected ? "checked" : ""} ${selectedVisibleCount > 0 && !allVisibleSelected ? "data-indeterminate=\"true\"" : ""} />
          <span>${escapeHtml(t("selectVisible"))}</span>
        </label>
        <button type="button" data-optimizer-bulk="add-selected">${escapeHtml(t("addToCompare"))}</button>
      </div>
    </div>
  `;
}

function optimizerMapMarkup() {
  const helpText = [
    t("candidateMapIntro"),
    t("candidateMapAxisHint"),
    t("candidateMapSizeHint"),
    t("candidateMapColorHint"),
    t("candidateMapInteractionHint"),
  ].join("\n");
  return `
    <section class="optimizer-map-card">
      <div class="optimizer-map-head">
        <div class="optimizer-section-title optimizer-map-title">
          <span>${escapeHtml(t("candidateMap"))}</span>
          <span class="optimizer-map-help" tabindex="0" role="note" aria-label="${escapeHtml(helpText)}" data-tooltip="${escapeHtml(helpText)}">?</span>
        </div>
        <button type="button" class="optimizer-map-reset" data-optimizer-map-reset>${escapeHtml(t("resetMap"))}</button>
      </div>
      <canvas id="optimizerMapCanvas" class="optimizer-map-canvas" height="210" aria-label="${escapeHtml(t("candidateMap"))}"></canvas>
    </section>
  `;
}

function optimizerMapBaseDomain(valid) {
  const xs = valid.map((profile) => Math.abs(profile.metrics.maxDrawdown));
  const ys = valid.map((profile) => profile.metrics.cagr);
  const rawMinX = Math.min(...xs);
  const rawMaxX = Math.max(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxY = Math.max(...ys);
  const xPad = Math.max((rawMaxX - rawMinX) * 0.1, 0.005);
  const yPad = Math.max((rawMaxY - rawMinY) * 0.14, 0.005);
  return {
    minX: Math.max(0, rawMinX - xPad),
    maxX: rawMaxX + xPad,
    minY: rawMinY - yPad,
    maxY: rawMaxY + yPad,
  };
}

function clampOptimizerMapView(view, base) {
  const baseSpanX = Math.max(base.maxX - base.minX, 0.0001);
  const baseSpanY = Math.max(base.maxY - base.minY, 0.0001);
  const minSpanX = baseSpanX / 40;
  const minSpanY = baseSpanY / 40;
  let spanX = Math.max(minSpanX, Math.min(baseSpanX, view.maxX - view.minX));
  let spanY = Math.max(minSpanY, Math.min(baseSpanY, view.maxY - view.minY));
  let minX = view.minX;
  let minY = view.minY;
  if (spanX >= baseSpanX) {
    minX = base.minX;
    spanX = baseSpanX;
  } else {
    minX = Math.max(base.minX, Math.min(base.maxX - spanX, minX));
  }
  if (spanY >= baseSpanY) {
    minY = base.minY;
    spanY = baseSpanY;
  } else {
    minY = Math.max(base.minY, Math.min(base.maxY - spanY, minY));
  }
  return {
    minX,
    maxX: minX + spanX,
    minY,
    maxY: minY + spanY,
  };
}

function optimizerMapGeometry(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, rect.width || 320);
  const height = Math.max(190, rect.height || 210);
  const pad = { left: 58, right: 18, top: 24, bottom: 48 };
  return {
    width,
    height,
    pad,
    plotW: width - pad.left - pad.right,
    plotH: height - pad.top - pad.bottom,
  };
}

function renderOptimizerMap(profiles) {
  const canvas = document.getElementById("optimizerMapCanvas");
  if (!canvas) {
    optimizerMapRedraw = null;
    optimizerMapResizeObserver?.disconnect();
    optimizerMapResizeObserver = null;
    return;
  }
  optimizerMapResizeObserver?.disconnect();
  const valid = profiles.filter((profile) => Number.isFinite(profile.metrics?.cagr) && Number.isFinite(profile.metrics?.maxDrawdown));
  const base = valid.length ? optimizerMapBaseDomain(valid) : null;
  if (base) {
    state.optimizerMapView = state.optimizerMapView ? clampOptimizerMapView(state.optimizerMapView, base) : { ...base };
  }
  const avgNavs = valid.map((profile) => profile.metrics.averageNav || 1);
  const minNav = avgNavs.length ? Math.min(...avgNavs) : 1;
  const maxNav = avgNavs.length ? Math.max(...avgNavs) : 1;
  let dragging = null;
  let plottedPoints = [];

  function draw() {
    if (!document.body.contains(canvas)) return;
    const { width, height, pad, plotW, plotH } = optimizerMapGeometry(canvas);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = cssVar("--item-bg");
    ctx.fillRect(0, 0, width, height);

    if (!valid.length || !base) {
      ctx.fillStyle = cssVar("--muted");
      ctx.font = "12px system-ui";
      ctx.fillText(t("noResults"), 16, height / 2);
      ctx.restore();
      return;
    }

    const view = state.optimizerMapView || base;
    const spanX = Math.max(view.maxX - view.minX, 0.0001);
    const spanY = Math.max(view.maxY - view.minY, 0.0001);
    const xFor = (value) => pad.left + (value - view.minX) / spanX * plotW;
    const yFor = (value) => pad.top + (1 - (value - view.minY) / spanY) * plotH;
    const xTicks = linearTicks(view.minX, view.maxX, Math.min(7, Math.max(4, Math.floor(plotW / 95))));
    const yTicks = linearTicks(view.minY, view.maxY, Math.min(6, Math.max(4, Math.floor(plotH / 58))));
    const xDigits = pctTickDigits(xTicks);
    const yDigits = pctTickDigits(yTicks);

    ctx.strokeStyle = cssVar("--line");
    ctx.lineWidth = 1;
    ctx.font = "11px system-ui";
    ctx.textBaseline = "middle";
    xTicks.forEach((tick) => {
      const x = xFor(tick);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, height - pad.bottom);
      ctx.stroke();
      ctx.fillStyle = cssVar("--muted");
      ctx.textAlign = "center";
      ctx.fillText(fmtPct(tick, xDigits), x, height - pad.bottom + 16);
    });
    yTicks.forEach((tick) => {
      const y = yFor(tick);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = cssVar("--muted");
      ctx.textAlign = "right";
      ctx.fillText(fmtPct(tick, yDigits), pad.left - 8, y);
    });

    ctx.strokeStyle = cssVar("--axis");
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, height - pad.bottom);
    ctx.lineTo(width - pad.right, height - pad.bottom);
    ctx.stroke();

    ctx.fillStyle = cssVar("--muted");
    ctx.font = "700 11px system-ui";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillText(t("drawdownShort"), pad.left + plotW / 2, height - 8);
    ctx.save();
    ctx.translate(15, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t("annualShort"), 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, plotW, plotH);
    ctx.clip();
    const selected = new Set(state.optimizerSelectedKeys);
    const featured = new Set(featuredOptimizerProfiles(state.optimizerProfiles).map(optimizerProfileKey));
    plottedPoints = [];
    valid.forEach((profile) => {
      const key = optimizerProfileKey(profile);
      const navRatio = maxNav === minNav ? 0.5 : (Number(profile.metrics.averageNav || minNav) - minNav) / (maxNav - minNav);
      const radius = 4 + navRatio * 4;
      const x = xFor(Math.abs(profile.metrics.maxDrawdown));
      const y = yFor(profile.metrics.cagr);
      const highlighted = state.optimizerHighlightedKey === key;
      plottedPoints.push({ key, profile, x, y, radius });
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = selected.has(key)
        ? cssVar("--accent")
        : highlighted
          ? cssVar("--warning")
        : featured.has(key)
          ? cssVar("--active-text")
          : cssVar("--button-text");
      ctx.globalAlpha = selected.has(key) || featured.has(key) || highlighted ? 0.92 : 0.45;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (selected.has(key)) {
        ctx.strokeStyle = cssVar("--accent");
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (state.optimizerFocusedKey === key || highlighted) {
        ctx.strokeStyle = highlighted ? cssVar("--warning") : cssVar("--ink");
        ctx.lineWidth = highlighted ? 2.4 : 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    featuredOptimizerProfiles(valid).slice(0, 3).forEach((profile) => {
      const x = xFor(Math.abs(profile.metrics.maxDrawdown));
      const y = yFor(profile.metrics.cagr);
      if (x < pad.left || x > width - pad.right || y < pad.top || y > height - pad.bottom) return;
      ctx.fillStyle = cssVar("--ink");
      ctx.font = "600 10px system-ui";
      ctx.textAlign = x > width - 128 ? "right" : "left";
      ctx.fillText(profileTitle(profile), x + (ctx.textAlign === "right" ? -8 : 8), Math.max(pad.top + 12, y - 8));
    });
    ctx.restore();
    ctx.restore();
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function nearestOptimizerPoint(point) {
    return plottedPoints
      .map((item) => ({ ...item, distance: Math.hypot(item.x - point.x, item.y - point.y) }))
      .filter((item) => item.distance <= Math.max(12, item.radius + 7))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  function updateOptimizerMapCursor(event) {
    if (dragging || !base) {
      canvas.classList.remove("clickable");
      return;
    }
    canvas.classList.toggle("clickable", Boolean(nearestOptimizerPoint(canvasPoint(event))));
  }

  function zoomAt(point, factor) {
    if (!base || !state.optimizerMapView) return;
    const { pad, plotW, plotH } = optimizerMapGeometry(canvas);
    const boundedX = Math.max(pad.left, Math.min(pad.left + plotW, point.x));
    const boundedY = Math.max(pad.top, Math.min(pad.top + plotH, point.y));
    const view = state.optimizerMapView;
    const spanX = view.maxX - view.minX;
    const spanY = view.maxY - view.minY;
    const xRatio = (boundedX - pad.left) / Math.max(plotW, 1);
    const yRatio = (boundedY - pad.top) / Math.max(plotH, 1);
    const domainX = view.minX + xRatio * spanX;
    const domainY = view.maxY - yRatio * spanY;
    const nextSpanX = spanX * factor;
    const nextSpanY = spanY * factor;
    state.optimizerMapView = clampOptimizerMapView(
      {
        minX: domainX - xRatio * nextSpanX,
        maxX: domainX + (1 - xRatio) * nextSpanX,
        minY: domainY - (1 - yRatio) * nextSpanY,
        maxY: domainY + yRatio * nextSpanY,
      },
      base,
    );
    draw();
  }

  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!base) return;
      event.preventDefault();
      zoomAt(canvasPoint(event), event.deltaY > 0 ? 1.18 : 0.84);
    },
    { passive: false },
  );
  canvas.addEventListener("pointerdown", (event) => {
    if (!base || !state.optimizerMapView) return;
    dragging = { ...canvasPoint(event), moved: false, view: { ...state.optimizerMapView } };
    canvas.setPointerCapture?.(event.pointerId);
    canvas.classList.remove("clickable");
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging || !base) {
      updateOptimizerMapCursor(event);
      return;
    }
    const point = canvasPoint(event);
    if (Math.hypot(point.x - dragging.x, point.y - dragging.y) > 4) {
      dragging.moved = true;
    }
    const { plotW, plotH } = optimizerMapGeometry(canvas);
    const spanX = dragging.view.maxX - dragging.view.minX;
    const spanY = dragging.view.maxY - dragging.view.minY;
    const deltaX = -((point.x - dragging.x) / Math.max(plotW, 1)) * spanX;
    const deltaY = ((point.y - dragging.y) / Math.max(plotH, 1)) * spanY;
    state.optimizerMapView = clampOptimizerMapView(
      {
        minX: dragging.view.minX + deltaX,
        maxX: dragging.view.maxX + deltaX,
        minY: dragging.view.minY + deltaY,
        maxY: dragging.view.maxY + deltaY,
      },
      base,
    );
    draw();
  });
  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    canvas.addEventListener(eventName, (event) => {
      if (!dragging) return;
      const finishedDrag = dragging;
      dragging = null;
      try {
        if (canvas.hasPointerCapture?.(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Pointer capture can already be gone if the browser cancels the gesture.
      }
      canvas.classList.remove("dragging");
      if (eventName !== "pointerup" || finishedDrag.moved) {
        canvas.classList.remove("clickable");
        return;
      }
      const point = canvasPoint(event);
      const nearest = nearestOptimizerPoint(point);
      if (nearest) focusOptimizerProfile(nearest.key);
      updateOptimizerMapCursor(event);
    });
  }
  canvas.addEventListener("pointerleave", () => {
    canvas.classList.remove("clickable");
  });
  els.optimizerResults.querySelector("[data-optimizer-map-reset]")?.addEventListener("click", () => {
    state.optimizerMapView = base ? { ...base } : null;
    draw();
  });
  optimizerMapRedraw = draw;
  optimizerMapResizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => optimizerMapRedraw?.());
  });
  optimizerMapResizeObserver.observe(canvas);
  draw();
}

function captureOptimizerResultsScrollState() {
  const tableWrap = els.optimizerResults?.querySelector(".optimizer-table-wrap");
  const sideScroll = els.optimizerResults?.querySelector(".optimizer-side-scroll");
  return {
    rootTop: els.optimizerResults?.scrollTop ?? 0,
    tableTop: tableWrap?.scrollTop ?? 0,
    tableLeft: tableWrap?.scrollLeft ?? 0,
    sideTop: sideScroll?.scrollTop ?? 0,
  };
}

function restoreOptimizerResultsScrollState(snapshot) {
  if (!snapshot || !els.optimizerResults) return;
  const tableWrap = els.optimizerResults.querySelector(".optimizer-table-wrap");
  const sideScroll = els.optimizerResults.querySelector(".optimizer-side-scroll");
  els.optimizerResults.scrollTop = snapshot.rootTop;
  if (tableWrap) {
    tableWrap.scrollTop = snapshot.tableTop;
    tableWrap.scrollLeft = snapshot.tableLeft;
  }
  if (sideScroll) sideScroll.scrollTop = snapshot.sideTop;
  scheduleOverlayScrollbarUpdate();
}

function renderOptimizerPreservingResultsScroll(profiles = state.optimizerProfiles, summary = state.optimizerSummary) {
  const snapshot = captureOptimizerResultsScrollState();
  renderOptimizer(profiles, summary);
  restoreOptimizerResultsScrollState(snapshot);
  requestAnimationFrame(() => restoreOptimizerResultsScrollState(snapshot));
}

function renderOptimizer(profiles, summary = state.optimizerSummary) {
  state.optimizerProfiles = profiles || [];
  state.optimizerSummary = summary || null;
  const keys = new Set(state.optimizerProfiles.map(optimizerProfileKey));
  state.optimizerSelectedKeys = state.optimizerSelectedKeys.filter((key) => keys.has(key));
  if (state.optimizerFocusedKey && !keys.has(state.optimizerFocusedKey)) {
    state.optimizerFocusedKey = "";
  }
  if (state.optimizerHighlightedKey && !keys.has(state.optimizerHighlightedKey)) {
    state.optimizerHighlightedKey = "";
  }
  if (!state.optimizerProfiles.length) {
    els.optimizerResults.innerHTML = `<div class="status">${t("noResults")}</div>`;
    els.optimizerResults.classList.remove("collapsed", "expanded");
    optimizerMapRedraw = null;
    optimizerMapResizeObserver?.disconnect();
    optimizerMapResizeObserver = null;
    refreshOptimizerCompareButtons();
    return;
  }
  const visibleProfiles = optimizerVisibleProfiles();
  const allTags = optimizerAvailableTags(state.optimizerProfiles);
  const featured = featuredOptimizerProfiles(state.optimizerProfiles);
  const featuredKeys = new Set(featured.map(optimizerProfileKey));
  const featuredMarkup = featured
    .map((profile) => {
      const index = state.optimizerProfiles.indexOf(profile);
      const m = profile.metrics;
      return `
        <article class="optimizer-feature-card">
          <div class="opt-head">
            <strong>${escapeHtml(profileTitle(profile))}</strong>
            <span class="muted">${escapeHtml(rebalanceLabel(profile.rebalance))}</span>
          </div>
          ${optimizerTagsMarkup(profile)}
          <div class="optimizer-reason">${escapeHtml(profile.rankReason || "")}</div>
          <div class="opt-grid">
            <span>${escapeHtml(t("annualShort"))} ${escapeHtml(fmtPct(m.cagr))}</span>
            <span>${escapeHtml(t("drawdownShort"))} ${escapeHtml(fmtPct(m.maxDrawdown))}</span>
            <span>${escapeHtml(t("averageNavShort"))} ${escapeHtml(fmtMultiple(m.averageNav))}</span>
            <span>${escapeHtml(t("compositeShort"))} ${escapeHtml(fmtNum((profile.score?.composite || 0) * 100, 0))}</span>
          </div>
          ${optimizerActionsMarkup(profile, index)}
        </article>
      `;
    })
    .join("");
  const rows = visibleProfiles
    .map((profile) => {
      const index = state.optimizerProfiles.indexOf(profile);
      const m = profile.metrics;
      const weightsText = weightsTextFromConfig(profile.assets || state.assets, profile.weights);
      const key = optimizerProfileKey(profile);
      const selected = state.optimizerSelectedKeys.includes(key);
      const focused = state.optimizerFocusedKey === key;
      const isFeatured = featuredKeys.has(key);
      return `
        <tr class="${isFeatured ? "featured" : ""} ${selected ? "selected" : ""} ${focused ? "focused" : ""}" data-profile-key="${escapeHtml(key)}">
          <td class="optimizer-select-cell"><input type="checkbox" data-select-profile="${escapeHtml(key)}" ${selected ? "checked" : ""} aria-label="${escapeHtml(t("selectCandidate"))}" /></td>
          <td><strong>${escapeHtml(profileTitle(profile))}</strong>${optimizerTagsMarkup(profile)}<span>${escapeHtml(profile.rankReason || "")}</span></td>
          <td>${escapeHtml(weightsText)}</td>
          <td>${escapeHtml(rebalanceLabel(profile.rebalance))}</td>
          <td>${escapeHtml(fmtPct(m.cagr))}</td>
          <td>${escapeHtml(fmtPct(m.maxDrawdown))}</td>
          <td>${escapeHtml(fmtMultiple(m.averageNav))}</td>
          <td>${escapeHtml(fmtNum(m.sharpe0))}</td>
          <td>${escapeHtml(fmtNum((profile.score?.composite || 0) * 100, 0))}</td>
          <td>${optimizerActionsMarkup(profile, index)}</td>
        </tr>
      `;
    })
    .join("");
  const optimizerExpanded = !state.optimizerCollapsed;
  els.optimizerResults.classList.toggle("collapsed", !optimizerExpanded);
  els.optimizerResults.classList.toggle("expanded", optimizerExpanded);
  els.optimizerResults.innerHTML = `
    ${collapsibleModuleHeadMarkup({
      title: t("scanResults"),
      hint: t("scanResultsHint"),
      action: "toggle-optimizer-module",
      actionKey: optimizerExpanded ? "collapseScanResults" : "expandScanResults",
      expanded: optimizerExpanded,
    })}
    <div class="collapsible-module-body">
      <div class="collapsible-module-inner optimizer-module-inner">
        <div class="optimizer-overview">
          <div class="optimizer-side-stack">
            <div class="optimizer-side-head">
              <div class="optimizer-section-title">${escapeHtml(t("scanSummary"))}</div>
            </div>
            <div class="optimizer-side-scroll">
              ${optimizerSummaryMarkup(summary)}
              <section class="optimizer-featured">
                <div class="optimizer-section-title">${escapeHtml(t("featuredCandidates"))}</div>
                <div class="optimizer-feature-grid">${featuredMarkup}</div>
              </section>
            </div>
          </div>
          ${optimizerMapMarkup()}
        </div>
        <section class="optimizer-all">
          <div class="optimizer-section-title">${escapeHtml(t("allCandidates"))}</div>
          ${optimizerResultToolbarMarkup(visibleProfiles, allTags)}
          <div class="optimizer-table-wrap">
            <table class="optimizer-table">
              <thead>
                <tr>
                  <th></th>
                  <th>${optimizerSortButton("title", t("portfolio"))}</th>
                  <th>${escapeHtml(t("weights"))}</th>
                  <th>${optimizerSortButton("rebalance", t("rebalance"))}</th>
                  <th>${optimizerSortButton("cagr", t("annualShort"))}</th>
                  <th>${optimizerSortButton("drawdown", t("drawdownShort"))}</th>
                  <th>${optimizerSortButton("averageNav", t("averageNavShort"))}</th>
                  <th>${optimizerSortButton("sharpe", t("sharpeShort"))}</th>
                  <th>${optimizerSortButton("composite", t("compositeShort"))}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;
  els.optimizerResults.querySelector('[data-action="toggle-optimizer-module"]')?.addEventListener("click", () => {
    state.optimizerCollapsed = !state.optimizerCollapsed;
    renderOptimizerModuleState();
    ensureOverlayScrollbars();
  });
  renderOptimizerMap(visibleProfiles);
  els.optimizerResults.querySelector("[data-optimizer-tag-filter]")?.addEventListener("change", (event) => {
    state.optimizerTagFilter = event.target.value;
    state.optimizerMapView = null;
    renderOptimizer(state.optimizerProfiles);
  });
  els.optimizerResults.querySelectorAll("[data-optimizer-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.optimizerSort;
      if (state.optimizerSortKey === key) {
        state.optimizerSortDirection = state.optimizerSortDirection === "asc" ? "desc" : "asc";
      } else {
        state.optimizerSortKey = key;
        state.optimizerSortDirection = key === "title" || key === "rebalance" ? "asc" : "desc";
      }
      renderOptimizer(state.optimizerProfiles);
    });
  });
  els.optimizerResults.querySelectorAll("[data-select-profile]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.selectProfile;
      if (input.checked && !state.optimizerSelectedKeys.includes(key)) {
        state.optimizerSelectedKeys.push(key);
        state.optimizerFocusedKey = key;
      } else if (!input.checked) {
        state.optimizerSelectedKeys = state.optimizerSelectedKeys.filter((item) => item !== key);
        if (state.optimizerFocusedKey === key) state.optimizerFocusedKey = "";
      }
      renderOptimizerPreservingResultsScroll();
    });
  });
  const selectVisibleInput = els.optimizerResults.querySelector("[data-optimizer-select-visible]");
  if (selectVisibleInput) {
    selectVisibleInput.indeterminate = selectVisibleInput.dataset.indeterminate === "true";
    selectVisibleInput.addEventListener("change", () => {
      const visibleKeys = new Set(visibleProfiles.map(optimizerProfileKey));
      if (selectVisibleInput.checked) {
        const selected = new Set(state.optimizerSelectedKeys);
        visibleKeys.forEach((key) => selected.add(key));
        state.optimizerSelectedKeys = Array.from(selected);
      } else {
        state.optimizerSelectedKeys = state.optimizerSelectedKeys.filter((key) => !visibleKeys.has(key));
        if (visibleKeys.has(state.optimizerFocusedKey)) state.optimizerFocusedKey = "";
      }
      renderOptimizerPreservingResultsScroll();
    });
  }
  els.optimizerResults.querySelectorAll("[data-optimizer-bulk]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.optimizerBulk;
      if (action === "add-selected") {
        const selected = new Set(state.optimizerSelectedKeys);
        addOptimizerProfilesToComparison(state.optimizerProfiles.filter((profile) => selected.has(optimizerProfileKey(profile))));
      }
    });
  });
  els.optimizerResults.querySelectorAll("button[data-profile-index]").forEach((button) => {
    const profile = state.optimizerProfiles[Number(button.dataset.profileIndex)];
    if (!profile) return;
    button.disabled = state.loading || state.optimizing;
    button.addEventListener("click", () => {
      if (button.dataset.action === "apply") {
        applyWeightsAndRebalance(profile.weights, profile.rebalance, profile.assets || state.assets);
      } else {
        addProfileToComparison(profile);
      }
    });
  });
  refreshOptimizerCompareButtons();
  ensureOverlayScrollbars();
}

function refreshOptimizerCompareButtons() {
  els.optimizerResults.querySelectorAll('button[data-action="compare"]').forEach((button) => {
    const key = button.dataset.compareKey || "";
    const alreadyComparing = isComparisonMode() && state.comparison.items.some((item) => item.key === key);
    const pending = state.comparison.pendingKey === key;
    button.textContent = pending ? t("backtesting") : alreadyComparing ? t("comparing") : t("compare");
    button.disabled =
      !state.result ||
      state.loading ||
      state.optimizing ||
      alreadyComparing ||
      Boolean(state.comparison.pendingKey) ||
      state.comparison.pendingAll;
    button.dataset.comparisonLocked = alreadyComparing ? "true" : "false";
  });
  const existingKeys = new Set(state.comparison.items.map((item) => item.key));
  const visibleProfiles = optimizerVisibleProfiles();
  const selectedProfiles = state.optimizerProfiles.filter((profile) => state.optimizerSelectedKeys.includes(optimizerProfileKey(profile)));
  const baseDisabled = state.loading || state.optimizing || state.comparison.pendingAll || Boolean(state.comparison.pendingKey);
  const selectVisibleInput = els.optimizerResults.querySelector("[data-optimizer-select-visible]");
  if (selectVisibleInput) {
    selectVisibleInput.disabled = baseDisabled || !visibleProfiles.length;
  }
  els.optimizerResults.querySelectorAll("[data-optimizer-bulk]").forEach((button) => {
    const action = button.dataset.optimizerBulk;
    if (action === "add-selected") {
      button.disabled =
        !state.result ||
        baseDisabled ||
        !selectedProfiles.some((profile) => !existingKeys.has(optimizerProfileKey(profile)));
      button.textContent = t("addToCompare");
    }
  });
  const addAllButton = els.compareAllBtn;
  if (addAllButton) {
    const allAdded =
      state.optimizerProfiles.length > 0 &&
      state.optimizerProfiles.every((profile) => state.comparison.items.some((item) => item.key === profileComparisonKey(profile)));
    addAllButton.textContent = state.comparison.pendingAll ? t("comparingAll") : t("compareAll");
    addAllButton.disabled =
      !state.result ||
      state.loading ||
      state.optimizing ||
      state.comparison.pendingAll ||
      Boolean(state.comparison.pendingKey) ||
      allAdded ||
      !state.optimizerProfiles.length;
  }
}

function updateAddCurrentCompareButton() {
  if (!els.addCurrentCompareBtn) return;
  const busy = state.loading || state.optimizing || Boolean(state.comparison.pendingKey) || state.comparison.pendingAll;
  const compareMode = isComparisonMode();
  els.addCurrentCompareBtn.textContent = compareMode ? t("exitCompare") : t("newCompareItem");
  els.addCurrentCompareBtn.classList.toggle("danger-btn", compareMode);
  els.addCurrentCompareBtn.disabled = compareMode ? state.loading : busy;
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
  els.applySharedBtn?.addEventListener("click", applySharedPortfolioToEditor);
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
  els.compareEditorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitComparisonEditor();
  });
  els.compareEditorCloseBtn.addEventListener("click", closeComparisonEditor);
  els.compareEditorCancelBtn.addEventListener("click", closeComparisonEditor);
  els.compareEditorOverlay.addEventListener("click", (event) => {
    if (event.target === els.compareEditorOverlay) closeComparisonEditor();
  });
  els.compareEditorAddAssetBtn.addEventListener("click", addComparisonEditorAsset);
  els.compareEditorNormalizeBtn.addEventListener("click", normalizeComparisonEditorWeights);
  els.compareEditorAssets.addEventListener("click", (event) => {
    const button = event.target.closest('button[data-action="remove-editor-asset"]');
    if (!button) return;
    const row = button.closest(".compare-editor-asset-row");
    removeComparisonEditorAsset(Number(row?.dataset.index || 0));
  });
  els.compareEditorAssets.addEventListener("input", syncComparisonEditorFromInputs);
  els.compareEditorNameInput.addEventListener("input", syncComparisonEditorFromInputs);
  els.compareEditorRebalanceMode.addEventListener("change", syncComparisonEditorFromInputs);
  els.compareEditorThresholdInput.addEventListener("input", syncComparisonEditorFromInputs);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.comparison.editor) closeComparisonEditor();
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
    optimizerMapRedraw?.();
  });
  els.optimizeBtn.addEventListener("click", optimize);
  els.analysisToggleBtn?.addEventListener("click", () => {
    state.analysisDetailsCollapsed = !state.analysisDetailsCollapsed;
    renderAnalysisDetails();
    ensureOverlayScrollbars();
  });
  els.compareAllBtn.addEventListener("click", addAllProfilesToComparison);
  els.addCurrentCompareBtn.addEventListener("click", () => {
    if (isComparisonMode()) {
      exitComparisonMode();
      updateAddCurrentCompareButton();
      return;
    }
    addCurrentToComparison();
  });
  els.resetZoomBtn.addEventListener("click", () => {
    if (!state.result || state.loading) return;
    if (isComparisonMode() || state.shareView.active) {
      const viewResult = chartResultForView();
      state.view = { start: 0, end: viewResult.dates.length - 1 };
      renderChart();
      renderLegend();
      renderComparisonPanel();
      return;
    }
    els.startInput.value = "";
    els.endInput.value = "";
    state.view = { start: 0, end: state.result.dates.length - 1 };
    saveState();
    runBacktest(true);
  });
  window.addEventListener("resize", () => {
    renderChart();
    optimizerMapRedraw?.();
    scheduleOverlayScrollbarUpdate();
  });
  window.addEventListener("scroll", scheduleOverlayScrollbarUpdate, { passive: true });
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
        if (isComparisonMode() || state.shareView.active) {
          state.view = { start: a, end: b };
          renderChart();
          renderLegend();
          renderComparisonPanel();
          return;
        }
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
    if (hasShareToken) {
      state.bootstrapped = true;
      await loadSharedPortfolioFromUrl();
      return;
    }
    await loadCatalog();
    renderAssets();
    renderFavorites();
    state.bootstrapped = true;
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
  if (authRequired() && !storedAccessKey() && !shareTokenFromUrl()) {
    showAuthOverlay();
    return;
  }
  if (!authRequired()) {
    clearStoredAccessKey();
  }
  await bootstrapApp();
}

init();
