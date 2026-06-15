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
  optimizing: false,
  optimizerProfiles: [],
  favorites: [],
  extraCatalog: [],
  chartScale: "linear",
  visibleSeries: { portfolio: true, assets: {} },
  bootstrapped: false,
  language: "zh",
  theme: "light",
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
  metricsGrid: document.getElementById("metricsGrid"),
  corrMatrix: document.getElementById("corrMatrix"),
  rebalanceTable: document.getElementById("rebalanceTable"),
  optimizeBtn: document.getElementById("optimizeBtn"),
  optimizerResults: document.getElementById("optimizerResults"),
  resetZoomBtn: document.getElementById("resetZoomBtn"),
  chartScaleModes: document.getElementById("chartScaleModes"),
  languageModes: document.getElementById("languageModes"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
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
    running: "运行中",
    searchPlaceholder: "搜索代码 / 指数 / ETF / 基金",
    assets: "标的",
    normalize: "归一化",
    favorites: "收藏组合",
    save: "保存",
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
    annualShort: "年化",
    drawdownShort: "回撤",
    sharpeShort: "夏普",
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
    assetClassYahoo: "Yahoo 标的",
    profileSharpe: "风险调整后最佳",
    profileCalmar: "回撤效率最佳",
    profileReturn: "年化收益最高",
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
    running: "Running",
    searchPlaceholder: "Search ticker / index / ETF / fund",
    assets: "Assets",
    normalize: "Normalize",
    favorites: "Saved portfolios",
    save: "Save",
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
    annualShort: "CAGR",
    drawdownShort: "MDD",
    sharpeShort: "Sharpe",
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
    assetClassYahoo: "Yahoo asset",
    profileSharpe: "Best risk-adjusted",
    profileCalmar: "Best drawdown efficiency",
    profileReturn: "Highest CAGR",
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
  if (stored === "dark" || stored === "light") {
    state.theme = stored;
  }
}

function saveLanguage() {
  localStorage.setItem(LANGUAGE_KEY, state.language);
}

function saveTheme() {
  localStorage.setItem(THEME_KEY, state.theme);
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
  els.authError.textContent = normalizeErrorMessage(message);
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
    if (item.dynamic && !state.extraCatalog.some((known) => known.id === item.id)) {
      state.extraCatalog.push(item);
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
      source: meta.source || "",
      currency: meta.currency || "",
      hintStart: meta.hintStart || "",
      lastDate: meta.lastDate || "",
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
    throw error;
  }
  return data;
}

function scheduleRun() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runBacktest, 350);
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
  const previousScrollTop = options.preserveScroll ? els.searchResults.scrollTop : 0;
  const q = query.trim().toLowerCase();
  const selected = new Set(state.assets.map((asset) => asset.id));
  let items = [];
  if (q) {
    els.searchResults.innerHTML = `<div class="status">${t("searching")}</div>`;
    try {
      const data = await api(`/api/search?q=${encodeURIComponent(query)}`);
      if (requestSeq !== searchRequestSeq) return;
      items = data.items;
      mergeCatalogItems(items);
    } catch (error) {
      if (requestSeq !== searchRequestSeq) return;
      els.searchResults.innerHTML = `<div class="status error">${error.message}</div>`;
      return;
    }
  } else {
    items = state.catalog.slice(0, 12);
  }
  els.searchResults.innerHTML = "";
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.dataset.assetId = item.id;
    button.disabled = selected.has(item.id);
    button.innerHTML = `
      <div>
        <strong>${escapeHtml(item.id)} · ${escapeHtml(item.name)}</strong>
        <div class="meta">${escapeHtml(assetClassLabel(item.assetClass))} · ${escapeHtml(item.currency || "")} · ${t("startSince")} ${escapeHtml(item.hintStart || t("unknown"))}</div>
      </div>
      <span>${selected.has(item.id) ? t("added") : t("add")}</span>
    `;
    button.addEventListener("click", () => addAsset(item.id));
    els.searchResults.appendChild(button);
  }
  if (options.preserveScroll) {
    els.searchResults.scrollTop = previousScrollTop;
  }
}

function refreshSearchSelectionState() {
  const selected = new Set(state.assets.map((asset) => asset.id));
  for (const button of els.searchResults.querySelectorAll(".search-result")) {
    const isSelected = selected.has(button.dataset.assetId);
    button.disabled = isSelected;
    const label = button.querySelector("span");
    if (label) label.textContent = isSelected ? t("added") : t("add");
  }
}

function addAsset(id) {
  if (state.assets.some((asset) => asset.id === id)) return;
  state.assets.push({ id, weight: Math.round(100 / (state.assets.length + 1)) });
  preserveScroll(() => {
    renderAssets();
    refreshSearchSelectionState();
  });
  saveState();
  scheduleRun();
}

function removeAsset(id) {
  if (state.assets.length <= 1) return;
  state.assets = state.assets.filter((asset) => asset.id !== id);
  preserveScroll(() => {
    renderAssets();
    refreshSearchSelectionState();
  });
  saveState();
  scheduleRun();
}

function normalizeWeights() {
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
    const row = document.createElement("div");
    row.className = "asset-row";
    row.innerHTML = `
      <div class="asset-name">
        <strong>${escapeHtml(meta.id)} · ${escapeHtml(meta.name)}</strong>
        <span>${escapeHtml(meta.currency || "")} · ${t("startSince")} ${escapeHtml(meta.hintStart || "")}</span>
      </div>
      <input type="number" min="0" step="1" value="${Number(asset.weight).toFixed(0)}" />
      <button class="icon-btn" type="button" title="${t("remove")}">×</button>
    `;
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
      <button class="icon-btn" type="button" title="${t("delete")}">×</button>
    `;
    row.querySelector(".ghost-btn").addEventListener("click", () => applyFavorite(favorite.id));
    row.querySelector(".icon-btn").addEventListener("click", () => deleteFavorite(favorite.id));
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
  const favorite = state.favorites.find((item) => item.id === id);
  if (!favorite) return;
  mergeCatalogItems(favorite.catalog);
  state.assets = favorite.assets.map((asset) => ({
    id: asset.id,
    weight: Number(asset.weight || 0),
  }));
  state.rebalance = {
    mode: favorite.rebalance?.mode || "none",
    threshold: Number(favorite.rebalance?.threshold || 0.1),
  };
  els.startInput.value = favorite.start || "";
  els.endInput.value = favorite.end || "";
  els.thresholdInput.value = Math.round((state.rebalance.threshold || 0.1) * 100);
  state.view = null;
  preserveScroll(() => {
    renderAssets();
    renderModes();
    refreshSearchSelectionState();
  });
  saveState();
  runBacktest(true);
}

function deleteFavorite(id) {
  state.favorites = state.favorites.filter((item) => item.id !== id);
  preserveScroll(renderFavorites);
  saveState();
}

function renderModes() {
  for (const button of els.modes.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.mode === state.rebalance.mode);
  }
  els.thresholdInput.disabled = state.rebalance.mode !== "threshold";
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
  if (state.assets.length < 1 || state.loading) return;
  const scrollSnapshot = captureScrollState();
  state.loading = true;
  els.runBtn.textContent = t("running");
  saveState();
  try {
    const result = await api("/api/backtest", {
      method: "POST",
      body: JSON.stringify(requestPayload()),
    });
    state.result = result;
    syncVisibleSeries(result);
    mergeCatalogItems(result.assets);
    saveState();
    if (resetView || !state.view) {
      state.view = { start: 0, end: result.dates.length - 1 };
    } else {
      state.view.end = Math.min(state.view.end, result.dates.length - 1);
    }
    renderAll();
    restoreScrollState(scrollSnapshot);
  } catch (error) {
    els.metricsGrid.innerHTML = `<div class="status error">${error.message}</div>`;
    restoreScrollState(scrollSnapshot);
    if (error.status === 401) {
      throw error;
    }
  } finally {
    state.loading = false;
    els.runBtn.textContent = t("run");
    restoreScrollState(scrollSnapshot);
  }
}

function renderAll() {
  renderMetrics();
  renderCorrelation();
  renderRebalanceTable();
  renderChart();
  renderLegend();
}

function renderMetrics() {
  const m = state.result.metrics;
  const cards = [
    [t("cagr"), fmtPct(m.cagr), m.cagr >= 0 ? "positive" : "negative"],
    [t("totalReturn"), fmtPct(m.totalReturn), m.totalReturn >= 0 ? "positive" : "negative"],
    [t("maxDrawdown"), fmtPct(m.maxDrawdown), "negative"],
    [t("volatility"), fmtPct(m.volatility), ""],
    [t("sharpe"), fmtNum(m.sharpe0), ""],
    [t("calmar"), fmtNum(m.calmar), ""],
    [t("winRate"), fmtPct(m.winRate), ""],
    [t("worstDay"), fmtPct(m.worstDay), "negative"],
    [t("bestDay"), fmtPct(m.bestDay), "positive"],
    [t("ulcerIndex"), fmtPct(m.ulcerIndex), ""],
    [t("years"), fmtNum(m.years, 1), ""],
    [t("rebalanceCount"), String(m.rebalanceCount), ""],
  ];
  els.metricsGrid.innerHTML = cards
    .map(
      ([label, value, klass]) => `
        <div class="metric-card ${klass}">
          <span>${label}</span>
          <strong>${value}</strong>
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
  if (state.assets.length < 2 || state.optimizing) return;
  const scrollSnapshot = captureScrollState();
  state.optimizing = true;
  els.optimizeBtn.disabled = true;
  els.optimizeBtn.textContent = t("scanning");
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
    els.optimizeBtn.disabled = false;
    els.optimizeBtn.textContent = t("scan");
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
      </div>
      <button type="button">${t("apply")}</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
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
      runBacktest(true);
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
  els.favoriteNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveFavorite();
  });
  els.runBtn.addEventListener("click", () => runBacktest(true));
  els.normalizeBtn.addEventListener("click", () => {
    normalizeWeights();
    preserveScroll(renderAssets);
    saveState();
    scheduleRun();
  });
  els.thresholdInput.addEventListener("input", () => {
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
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveTheme();
    applyTheme();
    if (state.result) {
      renderChart();
      renderLegend();
    }
  });
  els.optimizeBtn.addEventListener("click", optimize);
  els.resetZoomBtn.addEventListener("click", () => {
    if (!state.result) return;
    const hasDateRange = Boolean(els.startInput.value || els.endInput.value);
    els.startInput.value = "";
    els.endInput.value = "";
    state.view = { start: 0, end: state.result.dates.length - 1 };
    saveState();
    if (hasDateRange) {
      runBacktest(true);
    } else {
      renderChart();
    }
  });
  window.addEventListener("resize", renderChart);

  els.canvas.addEventListener("mousedown", (event) => {
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
    await loadCatalog();
    renderAssets();
    renderFavorites();
    await runBacktest(true);
    state.bootstrapped = true;
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
  if (!storedAccessKey()) {
    showAuthOverlay();
    return;
  }
  await bootstrapApp();
}

init();
