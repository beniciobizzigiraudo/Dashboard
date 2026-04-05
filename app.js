const OPENF1_BASE = "https://api.openf1.org/v1";
const UNDERCUT_BASE = "http://localhost:61938/data";
const F1_API_BASES = ["https://f1api.dev/api", "https://f1connectapi.vercel.app/api"];
const AUTO_REFRESH_MS = 15000;
const SUSPENDED_APRIL_2026_ROUNDS = ["bahrain", "saudi arabia", "jeddah"];
const DEV_ACCESS_KEY = "DevKey";
const CACHE_PREFIX = "grid-intel-cache:";

const elements = {
  undercutPromptPanel: document.querySelector("#undercutPromptPanel"),
  undercutPromptYes: document.querySelector("#undercutPromptYes"),
  undercutPromptNo: document.querySelector("#undercutPromptNo"),
  undercutPromptRetry: document.querySelector("#undercutPromptRetry"),
  undercutPromptHelp: document.querySelector("#undercutPromptHelp"),
  devMenuButton: document.querySelector("#devMenuButton"),
  devMenuPanel: document.querySelector("#devMenuPanel"),
  publicConsoleButton: document.querySelector("#publicConsoleButton"),
  developerAccessButton: document.querySelector("#developerAccessButton"),
  devAuthPanel: document.querySelector("#devAuthPanel"),
  devCodeInput: document.querySelector("#devCodeInput"),
  devCodeSubmit: document.querySelector("#devCodeSubmit"),
  devCodeClose: document.querySelector("#devCodeClose"),
  devAuthMessage: document.querySelector("#devAuthMessage"),
  devConsole: document.querySelector("#devConsole"),
  devConsoleClose: document.querySelector("#devConsoleClose"),
  devConsoleOutput: document.querySelector("#devConsoleOutput"),
  devConsoleInput: document.querySelector("#devConsoleInput"),
  publicConsole: document.querySelector("#publicConsole"),
  publicConsoleClose: document.querySelector("#publicConsoleClose"),
  publicConsoleOutput: document.querySelector("#publicConsoleOutput"),
  publicConsoleInput: document.querySelector("#publicConsoleInput"),
  driverWindowPanel: document.querySelector("#driverWindowPanel"),
  driverWindowCard: document.querySelector("#driverWindowCard"),
  driverWindowHandle: document.querySelector("#driverWindowHandle"),
  driverWindowClose: document.querySelector("#driverWindowClose"),
  driverWindowName: document.querySelector("#driverWindowName"),
  driverWindowMeta: document.querySelector("#driverWindowMeta"),
  driverWindowPodiums: document.querySelector("#driverWindowPodiums"),
  driverWindowWins: document.querySelector("#driverWindowWins"),
  driverWindowTitles: document.querySelector("#driverWindowTitles"),
  driverWindowSeasons: document.querySelector("#driverWindowSeasons"),
  driverWindowLastRace: document.querySelector("#driverWindowLastRace"),
  sessionName: document.querySelector("#sessionName"),
  sessionLocation: document.querySelector("#sessionLocation"),
  lastUpdated: document.querySelector("#lastUpdated"),
  nextEventCountdown: document.querySelector("#nextEventCountdown"),
  nextEventName: document.querySelector("#nextEventName"),
  nextEventMeta: document.querySelector("#nextEventMeta"),
  refreshMode: document.querySelector("#refreshMode"),
  openf1Status: document.querySelector("#openf1Status"),
  openf1Note: document.querySelector("#openf1Note"),
  undercutStatus: document.querySelector("#undercutStatus"),
  undercutNote: document.querySelector("#undercutNote"),
  driverCount: document.querySelector("#driverCount"),
  summaryNote: document.querySelector("#summaryNote"),
  messageBar: document.querySelector("#messageBar"),
  driversBoard: document.querySelector("#driversBoard"),
  towerShell: document.querySelector("#towerShell"),
  standingsShell: document.querySelector("#standingsShell"),
  driversStandingsBody: document.querySelector("#driversStandingsBody"),
  teamsStandingsBody: document.querySelector("#teamsStandingsBody"),
  sessionKeyInput: document.querySelector("#sessionKeyInput"),
  loadButton: document.querySelector("#loadButton"),
  autoRefreshToggle: document.querySelector("#autoRefreshToggle"),
  preferUndercutToggle: document.querySelector("#preferUndercutToggle"),
  preferUndercutRow: document.querySelector("#preferUndercutRow"),
  undercutSourceCard: document.querySelector("#undercutSourceCard"),
};

const state = {
  autoRefresh: true,
  preferUndercut: true,
  timerId: null,
  countdownId: null,
  isLoading: false,
  mode: "boot",
  nextEvent: null,
  developerUnlocked: false,
  forcedMode: null,
  lastData: null,
  undercutPromptDismissed: false,
  selectedSeasonYear: null,
  activeDriverWindow: null,
  driverWindowDrag: null,
};

function init() {
  bindEvents();
  configureRuntimeMode();
  updateRefreshModeLabel();
  maybeShowUndercutPrompt();
  loadDashboard();
  startAutoRefresh();
}

function bindEvents() {
  elements.devMenuButton.addEventListener("click", toggleDeveloperMenu);
  elements.publicConsoleButton.addEventListener("click", openPublicConsole);
  elements.developerAccessButton.addEventListener("click", openDeveloperPrompt);
  elements.undercutPromptYes.addEventListener("click", () => {
    tryUndercutPromptConnection();
  });
  elements.undercutPromptNo.addEventListener("click", dismissUndercutPrompt);
  elements.undercutPromptRetry.addEventListener("click", () => {
    tryUndercutPromptConnection();
  });

  elements.devAuthPanel.addEventListener("click", (event) => {
    if (event.target === elements.devAuthPanel) {
      closeDeveloperPrompt();
    }
  });
  elements.devCodeSubmit.addEventListener("click", unlockDeveloperConsole);
  elements.devCodeClose.addEventListener("click", closeDeveloperPrompt);
  elements.devConsoleClose.addEventListener("click", () => {
    elements.devConsole.hidden = true;
  });
  elements.publicConsoleClose.addEventListener("click", () => {
    elements.publicConsole.hidden = true;
  });
  elements.devCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlockDeveloperConsole();
    }
  });
  elements.devConsoleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleConsoleCommand("private");
    }
  });
  elements.publicConsoleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleConsoleCommand("public");
    }
  });
  elements.driverWindowClose.addEventListener("click", closeDriverWindow);
  elements.driverWindowHandle.addEventListener("pointerdown", startDriverWindowDrag);
  window.addEventListener("pointermove", moveDriverWindow);
  window.addEventListener("pointerup", stopDriverWindowDrag);
  window.addEventListener("pointercancel", stopDriverWindowDrag);
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDeveloperMenu();
      if (!elements.devAuthPanel.hidden) {
        closeDeveloperPrompt();
      }
      if (!elements.publicConsole.hidden) {
        elements.publicConsole.hidden = true;
      }
      if (!elements.devConsole.hidden) {
        elements.devConsole.hidden = true;
      }
      if (!elements.driverWindowPanel.hidden) {
        closeDriverWindow();
      }
    }
  });

  elements.loadButton.addEventListener("click", () => loadDashboard());
  elements.sessionKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadDashboard();
    }
  });

  elements.autoRefreshToggle.addEventListener("change", (event) => {
    state.autoRefresh = event.target.checked;
    updateRefreshModeLabel();
    startAutoRefresh();
  });

  elements.preferUndercutToggle.addEventListener("change", (event) => {
    state.preferUndercut = event.target.checked;
    updateRefreshModeLabel();
    startAutoRefresh();
    loadDashboard();
  });
}

function canUseLocalUndercut() {
  return isLocalRuntime() && isDesktopClient();
}

function isLocalRuntime() {
  const { protocol, hostname } = window.location;

  return (
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function shouldUseUndercut() {
  return canUseLocalUndercut() && state.preferUndercut;
}

function configureRuntimeMode() {
  const localUndercutEnabled = canUseLocalUndercut();

  elements.undercutPromptPanel.hidden = true;

  if (elements.preferUndercutRow) {
    elements.preferUndercutRow.hidden = !localUndercutEnabled;
  }

  if (elements.undercutSourceCard) {
    elements.undercutSourceCard.hidden = !localUndercutEnabled;
  }

  if (!localUndercutEnabled) {
    state.preferUndercut = false;
    elements.preferUndercutToggle.checked = false;
    elements.preferUndercutToggle.disabled = true;
    return;
  }

  elements.preferUndercutToggle.disabled = false;
  state.preferUndercut = elements.preferUndercutToggle.checked;
}

function getLoadingMessage() {
  return shouldUseUndercut()
    ? "Cargando OpenF1 y buscando timing local de undercut-f1..."
    : "Cargando OpenF1 para tablero, campeonato y proximo evento...";
}

function getUndercutDisabledNote() {
  if (!isLocalRuntime()) {
    return "Deploy remoto: undercut-f1 deshabilitado.";
  }

  if (!isDesktopClient()) {
    return "undercut local solo esta disponible en escritorio.";
  }

  return "Preferencia local desactivada.";
}

function getOpenF1CacheTtl(url) {
  if (F1_API_BASES.some((base) => url.startsWith(base))) {
    if (url.includes("/current/")) {
      return 1000 * 60 * 30;
    }

    return 1000 * 60 * 60 * 24 * 7;
  }

  if (!url.startsWith(OPENF1_BASE)) {
    return 0;
  }

  const pathname = new URL(url).pathname;

  if (pathname.endsWith("/drivers")) return 1000 * 60 * 60 * 24;
  if (pathname.endsWith("/championship_drivers")) return 1000 * 60 * 30;
  if (pathname.endsWith("/championship_teams")) return 1000 * 60 * 30;
  if (pathname.endsWith("/sessions")) return 1000 * 60 * 30;
  if (pathname.endsWith("/meetings")) return 1000 * 60 * 30;
  if (pathname.endsWith("/position")) return 1000 * 20;
  if (pathname.endsWith("/laps")) return 1000 * 20;

  return 1000 * 60 * 10;
}

function readCache(url, ttlMs) {
  if (!ttlMs) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${url}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !("data" in parsed)) {
      return null;
    }

    const ageMs = Date.now() - parsed.timestamp;
    return {
      isFresh: ageMs <= ttlMs,
      data: parsed.data,
    };
  } catch (error) {
    return null;
  }
}

function writeCache(url, data, ttlMs) {
  if (!ttlMs) {
    return;
  }

  try {
    window.localStorage.setItem(
      `${CACHE_PREFIX}${url}`,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      }),
    );
  } catch (error) {
    // Si localStorage falla, seguimos sin cache.
  }
}

function isDesktopClient() {
  const userAgent = navigator.userAgent || "";
  const isMobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      userAgent,
    );

  return !isMobileUa && window.innerWidth >= 768;
}

function maybeShowUndercutPrompt() {
  if (!canUseLocalUndercut() || state.undercutPromptDismissed) {
    return;
  }

  elements.undercutPromptPanel.hidden = false;
  elements.undercutPromptHelp.hidden = true;
}

function dismissUndercutPrompt() {
  state.undercutPromptDismissed = true;
  elements.undercutPromptPanel.hidden = true;
}

async function tryUndercutPromptConnection() {
  const undercut = await fetchUndercutTiming();
  if (undercut.connected) {
    dismissUndercutPrompt();
    loadDashboard({ silent: true });
    return;
  }

  elements.undercutPromptHelp.hidden = false;
}

function startAutoRefresh() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }

  if (!state.autoRefresh || !shouldUseUndercut()) {
    return;
  }

  state.timerId = window.setInterval(async () => {
    if (state.isLoading || state.mode === "live" || state.forcedMode) {
      return;
    }

    const undercut = await fetchUndercutTiming();
    if (undercut.connected) {
      loadDashboard({ silent: true });
    }
  }, AUTO_REFRESH_MS);
}

function updateRefreshModeLabel() {
  if (state.selectedSeasonYear) {
    elements.refreshMode.textContent = `Temporada cargada: ${state.selectedSeasonYear}`;
    return;
  }

  if (!isLocalRuntime()) {
    elements.refreshMode.textContent = "Deploy remoto: solo OpenF1";
    return;
  }

  if (!canUseLocalUndercut()) {
    elements.refreshMode.textContent = "undercut local solo en escritorio";
    return;
  }

  elements.refreshMode.textContent = state.autoRefresh
    ? "Chequeo de undercut cada 15s"
    : state.preferUndercut
      ? "Actualizacion manual"
      : "OpenF1 sin timing local";
}

function startNextEventCountdown() {
  if (state.countdownId) {
    window.clearInterval(state.countdownId);
  }

  renderNextEventCountdown();

  state.countdownId = window.setInterval(() => {
    renderNextEventCountdown();
  }, 1000);
}

function isSuspendedApril2026Round(session) {
  const sessionDate = new Date(session?.date_start ?? "");
  if (Number.isNaN(sessionDate.getTime())) {
    return false;
  }

  const isApril2026 =
    sessionDate.getUTCFullYear() === 2026 && sessionDate.getUTCMonth() === 3;

  if (!isApril2026) {
    return false;
  }

  const haystack = [
    session?.country_name,
    session?.meeting_name,
    session?.meeting_official_name,
    session?.location,
    session?.circuit_short_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return SUSPENDED_APRIL_2026_ROUNDS.some((token) => haystack.includes(token));
}

async function loadDashboard(options = {}) {
  const { silent = false } = options;
  const manualSessionKey = elements.sessionKeyInput.value.trim();

  state.isLoading = true;

  if (!silent) {
    setMessage(getLoadingMessage());
    renderLoading();
  }

  try {
    const [standingsSession, nextEvent, undercut] =
      await Promise.all([
        resolveStandingsSession(manualSessionKey),
        fetchNextEvent(),
        shouldUseUndercut()
          ? fetchUndercutTiming()
          : disconnectedUndercut(getUndercutDisabledNote()),
      ]);

    setNextEvent(nextEvent);
    state.lastData = {
      standingsSession,
      nextEvent,
      undercut,
    };

    if (undercut.connected) {
      const liveSession = await resolveLiveSession(manualSessionKey);
      const [drivers, championship, teamChampionship, positions, laps] =
        await Promise.all([
          fetchOptionalJson(`${OPENF1_BASE}/drivers?session_key=${liveSession.session_key}`),
          fetchOptionalJson(
            `${OPENF1_BASE}/championship_drivers?session_key=${liveSession.session_key}`,
          ),
          fetchOptionalJson(
            `${OPENF1_BASE}/championship_teams?session_key=${liveSession.session_key}`,
          ),
          fetchOptionalJson(`${OPENF1_BASE}/position?session_key=${liveSession.session_key}`),
          fetchOptionalJson(`${OPENF1_BASE}/laps?session_key=${liveSession.session_key}`),
        ]);

      const rows = buildRows({
        drivers,
        championship,
        positions,
        laps,
        undercut,
      });

      state.lastData = {
        ...state.lastData,
        liveSession,
        liveDrivers: drivers,
        liveChampionship: championship,
        liveTeamChampionship: teamChampionship,
        livePositions: positions,
        liveLaps: laps,
        liveRows: rows,
      };

      renderSourceStatus({
        undercut,
        rows,
        session: liveSession,
        teamChampionship,
        championship,
      });

      renderSession(liveSession, rows, undercut);
      renderLiveView(rows);
      setMessage("Timing en vivo conectado desde undercut-f1.");
      state.mode = "live";
    } else {
      const [drivers, championship, teamChampionship] = await Promise.all([
        fetchOptionalJson(`${OPENF1_BASE}/drivers?session_key=${standingsSession.session_key}`),
        fetchOptionalJson(
          `${OPENF1_BASE}/championship_drivers?session_key=${standingsSession.session_key}`,
        ),
        fetchOptionalJson(
          `${OPENF1_BASE}/championship_teams?session_key=${standingsSession.session_key}`,
        ),
      ]);

      state.lastData = {
        ...state.lastData,
        standingsDrivers: drivers,
        standingsChampionship: championship,
        standingsTeamChampionship: teamChampionship,
      };

      renderSourceStatus({
        undercut,
        rows: drivers,
        session: standingsSession,
        teamChampionship,
        championship,
      });

      renderInactiveSession(standingsSession, championship, teamChampionship);
      renderStandingsView(championship, teamChampionship, drivers);
      setMessage("No hay carrera activa. Se muestran las tablas del campeonato.", "info");
      state.mode = "standings";
    }

    applyForcedModeIfNeeded();

    elements.lastUpdated.textContent = `Ultima actualizacion ${formatClock(new Date())}`;
    startNextEventCountdown();
  } catch (error) {
    console.error(error);
    renderError(error);
  } finally {
    state.isLoading = false;
  }
}

async function resolveLiveSession(manualSessionKey) {
  if (manualSessionKey) {
    const sessions = await fetchJson(
      `${OPENF1_BASE}/sessions?session_key=${encodeURIComponent(manualSessionKey)}`,
    );

    if (!sessions.length) {
      throw new Error(`No encontre la session_key ${manualSessionKey}.`);
    }

    return sessions[0];
  }

  const meetings = await fetchJson(`${OPENF1_BASE}/meetings?meeting_key=latest`);
  const latestMeeting = meetings[0];

  if (!latestMeeting) {
    const latestSessions = await fetchJson(`${OPENF1_BASE}/sessions?session_key=latest`);
    if (!latestSessions.length) {
      throw new Error("OpenF1 no devolvio una sesion valida.");
    }
    return latestSessions[0];
  }

  const sessions = await fetchJson(
    `${OPENF1_BASE}/sessions?meeting_key=${latestMeeting.meeting_key}`,
  );

  const eligibleSessions = sessions.filter((session) => !isSuspendedApril2026Round(session));

  if (eligibleSessions.length) {
    return chooseLiveSession(eligibleSessions);
  }

  const yearSessions = await fetchOptionalJson(
    `${OPENF1_BASE}/sessions?year=${new Date().getUTCFullYear()}`,
  );
  const fallbackSessions = yearSessions.filter(
    (session) => !isSuspendedApril2026Round(session),
  );

  if (!fallbackSessions.length) {
    throw new Error("No hay sesiones disponibles para el meeting actual.");
  }

  return chooseLiveSession(fallbackSessions);
}

async function resolveStandingsSession(manualSessionKey) {
  if (manualSessionKey) {
    const sessions = await fetchJson(
      `${OPENF1_BASE}/sessions?session_key=${encodeURIComponent(manualSessionKey)}`,
    );

    if (!sessions.length) {
      throw new Error(`No encontre la session_key ${manualSessionKey}.`);
    }

    return sessions[0];
  }

  if (state.selectedSeasonYear) {
    return resolveStandingsSessionForYear(state.selectedSeasonYear);
  }

  const nowIso = new Date().toISOString();
  const currentYear = new Date().getUTCFullYear();
  let sessions = await fetchOptionalJson(
    `${OPENF1_BASE}/sessions?session_type=Race&year=${currentYear}&date_start<=${nowIso}`,
  );

  if (!sessions.length) {
    sessions = await fetchOptionalJson(`${OPENF1_BASE}/sessions?session_type=Race`);
  }

  if (!sessions.length) {
    throw new Error("No encontre una sesion de carrera para cargar el campeonato.");
  }

  const eligibleSessions = sessions.filter((session) => !isSuspendedApril2026Round(session));

  if (!eligibleSessions.length) {
    throw new Error("No encontre una sesion de carrera valida para cargar el campeonato.");
  }

  return [...eligibleSessions].sort((a, b) => new Date(b.date_start) - new Date(a.date_start))[0];
}

async function resolveStandingsSessionForYear(year) {
  let sessions = await fetchOptionalJson(
    `${OPENF1_BASE}/sessions?session_type=Race&year=${year}`,
  );

  if (!sessions.length) {
    sessions = await fetchOptionalJson(`${OPENF1_BASE}/sessions?year=${year}`);
  }

  const eligibleSessions = sessions.filter((session) => !isSuspendedApril2026Round(session));

  if (!eligibleSessions.length) {
    throw new Error(`No encontre una sesion de carrera valida para la temporada ${year}.`);
  }

  return [...eligibleSessions].sort((a, b) => new Date(b.date_start) - new Date(a.date_start))[0];
}

async function fetchNextEvent() {
  if (state.selectedSeasonYear) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const sessions = await fetchOptionalJson(`${OPENF1_BASE}/sessions?date_start>=${nowIso}`);

  const filtered = sessions.filter((session) => {
    const type = String(session.session_type ?? "").toLowerCase();
    return (
      type.includes("practice") ||
      type.includes("qualifying") ||
      type.includes("race") ||
      type.includes("sprint")
    ) && !isSuspendedApril2026Round(session);
  });

  if (!filtered.length) {
    return null;
  }

  return [...filtered].sort((a, b) => new Date(a.date_start) - new Date(b.date_start))[0];
}

function chooseLiveSession(sessions) {
  const now = Date.now();
  const active = sessions.find((session) => {
    const start = new Date(session.date_start).getTime();
    const end = new Date(session.date_end).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
  });

  if (active) {
    return active;
  }

  const past = sessions
    .filter((session) => new Date(session.date_start).getTime() <= now)
    .sort((a, b) => new Date(b.date_start) - new Date(a.date_start));

  if (past.length) {
    return past[0];
  }

  return [...sessions].sort((a, b) => new Date(a.date_start) - new Date(b.date_start))[0];
}

async function fetchUndercutTiming() {
  if (!canUseLocalUndercut()) {
    return disconnectedUndercut(
      "undercut-f1 solo esta disponible cuando la web corre en localhost.",
    );
  }

  if (!state.preferUndercut) {
    return disconnectedUndercut("Preferencia local desactivada.");
  }

  const candidates = [
    { type: "TimingData", method: "POST" },
    { type: "timingdata", method: "POST" },
    { type: "timing-data", method: "POST" },
    { type: "TimingData", method: "GET" },
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(`${UNDERCUT_BASE}/${candidate.type}/latest`, {
        method: candidate.method,
        headers: candidate.method === "POST" ? { "Content-Type": "application/json" } : {},
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const lines = normalizeUndercutTiming(data);

      if (lines.size > 0) {
        return {
          connected: true,
          method: candidate.method,
          type: candidate.type,
          note: `Timing local detectado en ${candidate.type}.`,
          lines,
        };
      }
    } catch (error) {
      // Intentamos otras variantes antes de caer en offline.
    }
  }

  return disconnectedUndercut("API local no detectada en localhost:61938.");
}

function disconnectedUndercut(note) {
  return {
    connected: false,
    note,
    lines: new Map(),
  };
}

function normalizeUndercutTiming(payload) {
  const candidates = [
    payload?.lines,
    payload?.Lines,
    payload?.data?.lines,
    payload?.Data?.Lines,
    payload?.timingData?.lines,
    payload?.TimingData?.Lines,
  ];

  const rawLines = candidates.find(Boolean);
  const normalized = new Map();

  if (!rawLines) {
    return normalized;
  }

  const entries = Array.isArray(rawLines)
    ? rawLines.map((value) => [value.driverNumber ?? value.DriverNumber, value])
    : Object.entries(rawLines);

  for (const [key, line] of entries) {
    const driverNumber = Number(
      line?.driverNumber ??
        line?.DriverNumber ??
        line?.racingNumber ??
        line?.RacingNumber ??
        key,
    );

    if (!Number.isFinite(driverNumber)) {
      continue;
    }

    normalized.set(driverNumber, {
      trackPosition: pickFirstNumber(
        line?.position,
        line?.Position,
        line?.line,
        line?.Line,
        line?.currentPosition,
        line?.CurrentPosition,
      ),
      lastLap: extractUndercutLastLap(line),
      sectors: extractUndercutSectors(line),
    });
  }

  return normalized;
}

function extractUndercutLastLap(line) {
  const raw =
    line?.lastLapTime?.value ??
    line?.LastLapTime?.Value ??
    line?.lastLapTime ??
    line?.LastLapTime ??
    line?.lastLap ??
    line?.LastLap;

  if (typeof raw === "string") {
    return raw;
  }

  if (typeof raw === "number") {
    return formatLapTime(raw);
  }

  if (raw && typeof raw === "object") {
    const value = raw.value ?? raw.Value ?? raw.time ?? raw.Time;
    if (typeof value === "string") return value;
    if (typeof value === "number") return formatLapTime(value);
  }

  return null;
}

function extractUndercutSectors(line) {
  const rawSectors =
    line?.sectors ??
    line?.Sectors ??
    line?.timingSectors ??
    line?.TimingSectors ??
    line?.stats?.sectors ??
    line?.Stats?.Sectors;

  if (!rawSectors) {
    return ["unknown", "unknown", "unknown"];
  }

  const sectorList = Array.isArray(rawSectors)
    ? rawSectors
    : Object.values(rawSectors).sort((a, b) => {
        const aIndex = Number(a?.number ?? a?.Number ?? a?.sector ?? 0);
        const bIndex = Number(b?.number ?? b?.Number ?? b?.sector ?? 0);
        return aIndex - bIndex;
      });

  return [0, 1, 2].map((index) => {
    const sector = sectorList[index];
    return mapUndercutSectorColor(sector);
  });
}

function mapUndercutSectorColor(sector) {
  const directValue =
    sector?.color ??
    sector?.Color ??
    sector?.status ??
    sector?.Status ??
    sector?.value ??
    sector?.Value;

  const normalizedText = String(directValue ?? "").toLowerCase();

  if (normalizedText.includes("purple") || normalizedText.includes("overall")) return "purple";
  if (normalizedText.includes("green") || normalizedText.includes("personal")) return "green";
  if (normalizedText.includes("yellow")) return "yellow";
  if (normalizedText.includes("pit")) return "pit";

  const segments =
    sector?.segments ??
    sector?.Segments ??
    sector?.segmentValues ??
    sector?.SegmentValues;

  if (Array.isArray(segments)) {
    return mapMiniSectorsToColor(segments);
  }

  return "unknown";
}

function buildRows({ drivers, championship, positions, laps, undercut }) {
  const standingsByDriver = indexByDriverNumber(championship);
  const latestPositions = latestByDriverNumber(positions, "date");
  const latestLaps = latestByDriverNumber(laps, "date_start");

  const rows = drivers.map((driver) => {
    const driverNumber = Number(driver.driver_number);
    const standing = standingsByDriver.get(driverNumber) ?? {};
    const position = latestPositions.get(driverNumber) ?? {};
    const latestLap = latestLaps.get(driverNumber) ?? {};
    const liveLine = undercut.lines.get(driverNumber);

    return {
      driverNumber,
      acronym: driver.name_acronym ?? "UNK",
      broadcastName: driver.broadcast_name ?? driver.full_name ?? "Piloto",
      teamName: driver.team_name ?? "Desconocida",
      teamColor: `#${driver.team_colour ?? "666666"}`,
      trackPosition:
        liveLine?.trackPosition ??
        pickFirstNumber(position.position, position.Position) ??
        null,
      lapTime: liveLine?.lastLap ?? formatLapTime(latestLap.lap_duration),
      sectors: liveLine?.sectors ?? extractOpenF1Sectors(latestLap),
      championshipPosition: pickFirstNumber(
        standing.position_start,
        standing.PositionStart,
      ),
      projectedChampionshipPosition: pickFirstNumber(
        standing.position_current,
        standing.PositionCurrent,
      ),
      championshipPoints: pickFirstValue(standing.points_start, standing.PointsStart),
      projectedChampionshipPoints: pickFirstValue(
        standing.points_current,
        standing.PointsCurrent,
      ),
    };
  });

  return rows.sort((left, right) => {
    const leftPosition = left.trackPosition ?? Number.POSITIVE_INFINITY;
    const rightPosition = right.trackPosition ?? Number.POSITIVE_INFINITY;

    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }

    return left.driverNumber - right.driverNumber;
  });
}

function buildBlankRaceRows(drivers, championship) {
  const standingsByDriver = indexByDriverNumber(championship);

  return drivers
    .map((driver) => {
      const driverNumber = Number(driver.driver_number);
      const standing = standingsByDriver.get(driverNumber) ?? {};

      return {
        driverNumber,
        acronym: driver.name_acronym ?? "UNK",
        broadcastName: driver.broadcast_name ?? driver.full_name ?? "Piloto",
        teamName: driver.team_name ?? "Desconocida",
        teamColor: `#${driver.team_colour ?? "666666"}`,
        trackPosition: null,
        lapTime: null,
        sectors: ["unknown", "unknown", "unknown"],
        championshipPosition: pickFirstNumber(
          standing.position_start,
          standing.position_current,
          standing.PositionStart,
          standing.PositionCurrent,
        ),
        projectedChampionshipPosition: pickFirstNumber(
          standing.position_current,
          standing.position_start,
          standing.PositionCurrent,
          standing.PositionStart,
        ),
        championshipPoints: pickFirstValue(
          standing.points_start,
          standing.points_current,
          standing.PointsStart,
          standing.PointsCurrent,
        ),
        projectedChampionshipPoints: pickFirstValue(
          standing.points_current,
          standing.points_start,
          standing.PointsCurrent,
          standing.PointsStart,
        ),
      };
    })
    .sort((left, right) => {
      const leftPosition = left.championshipPosition ?? Number.POSITIVE_INFINITY;
      const rightPosition = right.championshipPosition ?? Number.POSITIVE_INFINITY;
      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }
      return left.driverNumber - right.driverNumber;
    });
}

function extractOpenF1Sectors(lap) {
  const sectorKeys = [
    lap?.segments_sector_1,
    lap?.segments_sector_2,
    lap?.segments_sector_3,
  ];

  return sectorKeys.map((segments) => mapMiniSectorsToColor(segments));
}

function mapMiniSectorsToColor(segments) {
  if (!Array.isArray(segments) || !segments.length) {
    return "unknown";
  }

  if (segments.includes(2064)) return "pit";
  if (segments.includes(2051)) return "purple";
  if (segments.includes(2049)) return "green";
  if (segments.includes(2048)) return "yellow";

  return "unknown";
}

function indexByDriverNumber(items = []) {
  return new Map(items.map((item) => [Number(item.driver_number), item]));
}

function latestByDriverNumber(items = [], dateKey) {
  const indexed = new Map();

  for (const item of items ?? []) {
    const driverNumber = Number(item.driver_number);
    if (!Number.isFinite(driverNumber)) {
      continue;
    }

    const existing = indexed.get(driverNumber);
    const currentDate = new Date(item[dateKey] ?? 0);
    const existingDate = new Date(existing?.[dateKey] ?? 0);

    if (!existing || currentDate >= existingDate) {
      indexed.set(driverNumber, item);
    }
  }

  return indexed;
}

function renderSession(session, rows, undercut) {
  elements.sessionName.textContent = session.session_name ?? "Sesion";
  elements.sessionLocation.textContent = [
    session.meeting_name,
    session.location,
    session.circuit_short_name,
    `Key ${session.session_key}`,
  ]
    .filter(Boolean)
    .join(" - ");

  elements.driverCount.textContent = String(rows.length);
  elements.summaryNote.textContent = undercut.connected
    ? "Live timing local conectado"
    : isLocalRuntime()
      ? "Fallback OpenF1 activo"
      : "OpenF1 historico activo";
}

function renderInactiveSession(session, championship, teamChampionship) {
  elements.sessionName.textContent = state.selectedSeasonYear
    ? `Temporada ${state.selectedSeasonYear}`
    : "No hay carrera activa";
  elements.sessionLocation.textContent = [
    session.meeting_name,
    session.location,
    state.selectedSeasonYear ? "Resultados historicos" : "Mostrando campeonato actual",
  ]
    .filter(Boolean)
    .join(" - ");
  elements.driverCount.textContent = String(championship.length || 0);
  elements.summaryNote.textContent = `${teamChampionship.length || 0} escuderias en tabla`;
}

function toggleDeveloperMenu() {
  elements.devMenuPanel.hidden = !elements.devMenuPanel.hidden;
}

function closeDeveloperMenu() {
  elements.devMenuPanel.hidden = true;
}

function handleGlobalClick(event) {
  if (
    !elements.devMenuPanel.hidden &&
    event.target !== elements.devMenuButton &&
    !elements.devMenuButton.contains(event.target) &&
    !elements.devMenuPanel.contains(event.target)
  ) {
    closeDeveloperMenu();
  }
}

function openPublicConsole() {
  closeDeveloperMenu();
  elements.publicConsole.hidden = false;
  if (!elements.publicConsoleOutput.childElementCount) {
    appendConsoleLineTo(
      elements.publicConsoleOutput,
      "Comandos disponibles: 2023...anio actual, window(apellido)",
      "system",
    );
  }
  window.setTimeout(() => elements.publicConsoleInput.focus(), 0);
}

function openDeveloperPrompt() {
  closeDeveloperMenu();
  elements.devAuthPanel.hidden = false;
  elements.devAuthMessage.textContent = "";
  elements.devCodeInput.value = "";
  window.setTimeout(() => elements.devCodeInput.focus(), 0);
}

function closeDeveloperPrompt() {
  elements.devAuthPanel.hidden = true;
}

function unlockDeveloperConsole() {
  if (elements.devCodeInput.value.trim() !== DEV_ACCESS_KEY) {
    elements.devAuthMessage.textContent = "Codigo incorrecto.";
    return;
  }

  state.developerUnlocked = true;
  closeDeveloperPrompt();
  elements.devConsole.hidden = false;
  appendConsoleLine("Consola desbloqueada.", "system");
  appendConsoleLine(
    "Comandos disponibles: switch-race, switch-standings, 2023...anio actual, window(apellido)",
    "system",
  );
  elements.devConsoleInput.value = "";
  window.setTimeout(() => elements.devConsoleInput.focus(), 0);
}

async function handleConsoleCommand(scope) {
  if (scope === "private" && !state.developerUnlocked) {
    return;
  }

  const input = scope === "private" ? elements.devConsoleInput : elements.publicConsoleInput;
  const output = scope === "private" ? elements.devConsoleOutput : elements.publicConsoleOutput;
  const command = input.value.trim();
  if (!command) {
    return;
  }

  appendConsoleLineTo(output, `> ${command}`);
  input.value = "";

  if (scope === "private" && command === "switch-race") {
    state.selectedSeasonYear = null;
    state.forcedMode = "live";
    appendConsoleLineTo(output, "Modo carrera forzado.", "system");
    applyForcedModeIfNeeded();
    return;
  }

  if (scope === "private" && command === "switch-standings") {
    state.selectedSeasonYear = null;
    state.forcedMode = "standings";
    appendConsoleLineTo(output, "Modo standings forzado.", "system");
    applyForcedModeIfNeeded();
    return;
  }

  if (/^\d{4}$/.test(command)) {
    const year = Number(command);
    const currentYear = new Date().getUTCFullYear();

    if (year < 2023 || year > currentYear) {
      appendConsoleLineTo(output, `Ano invalido. Usa un ano entre 2023 y ${currentYear}.`, "error");
      return;
    }

    state.selectedSeasonYear = year;
    state.forcedMode = "standings";
    appendConsoleLineTo(output, `Cargando temporada ${year}...`, "system");
    loadDashboard({ silent: true });
    return;
  }

  const windowMatch = command.match(/^window\((.+)\)$/i);
  if (windowMatch) {
    await runDriverWindowCommand(windowMatch[1], output);
    return;
  }

  appendConsoleLineTo(output, "Comando no reconocido.", "error");
}

function appendConsoleLine(message, tone = "") {
  appendConsoleLineTo(elements.devConsoleOutput, message, tone);
}

function appendConsoleLineTo(target, message, tone = "") {
  const line = document.createElement("div");
  line.className = `dev-console-line${tone ? ` ${tone}` : ""}`;
  line.textContent = message;
  target.appendChild(line);
  target.scrollTop = target.scrollHeight;
}

async function runDriverWindowCommand(rawQuery, output = elements.devConsoleOutput) {
  const query = rawQuery.trim();
  if (!query) {
    appendConsoleLineTo(output, "Usa window(apellido). Ejemplo: window(verstappen)", "error");
    return;
  }

  appendConsoleLineTo(output, `Buscando ventana de carrera para ${query}...`, "system");

  try {
    const driver = await searchDriverCareerMatch(query);
    const career = await buildDriverCareerWindow(driver);
    openDriverWindow(career);
    appendConsoleLineTo(output, `Ventana abierta para ${career.fullName}.`, "system");
  } catch (error) {
    appendConsoleLineTo(output, error.message ?? "No pude calcular la ventana del piloto.", "error");
  }
}

function openDriverWindow(career) {
  state.activeDriverWindow = career;
  elements.driverWindowName.textContent = career.fullName;
  elements.driverWindowMeta.textContent = `${career.shortName} · ${career.firstSeason}-${career.lastSeason}`;
  elements.driverWindowPodiums.textContent = String(career.podiums);
  elements.driverWindowWins.textContent = String(career.wins);
  elements.driverWindowTitles.textContent = String(career.championships);
  elements.driverWindowSeasons.textContent = String(career.seasons);
  elements.driverWindowLastRace.textContent = career.lastRaceResult;
  elements.driverWindowPanel.hidden = false;
  elements.driverWindowCard.style.top = "96px";
  const preferredLeft = Math.round(window.innerWidth * 0.32);
  const maxLeft = Math.max(12, window.innerWidth - elements.driverWindowCard.offsetWidth - 12);
  elements.driverWindowCard.style.left = `${clamp(preferredLeft, 12, maxLeft)}px`;
}

function closeDriverWindow() {
  state.activeDriverWindow = null;
  elements.driverWindowPanel.hidden = true;
}

function startDriverWindowDrag(event) {
  if (event.target.closest("button")) {
    return;
  }

  const rect = elements.driverWindowCard.getBoundingClientRect();
  state.driverWindowDrag = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };
  elements.driverWindowHandle.setPointerCapture?.(event.pointerId);
}

function moveDriverWindow(event) {
  if (!state.driverWindowDrag || elements.driverWindowPanel.hidden) {
    return;
  }

  const maxLeft = Math.max(12, window.innerWidth - elements.driverWindowCard.offsetWidth - 12);
  const maxTop = Math.max(12, window.innerHeight - elements.driverWindowCard.offsetHeight - 12);
  const left = clamp(event.clientX - state.driverWindowDrag.offsetX, 12, maxLeft);
  const top = clamp(event.clientY - state.driverWindowDrag.offsetY, 12, maxTop);

  elements.driverWindowCard.style.left = `${left}px`;
  elements.driverWindowCard.style.top = `${top}px`;
}

function stopDriverWindowDrag() {
  state.driverWindowDrag = null;
}

async function searchDriverCareerMatch(query) {
  const payload = await fetchF1ApiJson(
    `/drivers/search?q=${encodeURIComponent(query)}&limit=10`,
  );
  const matches = payload?.drivers ?? [];

  if (!matches.length) {
    throw new Error(`No encontre pilotos para "${query}".`);
  }

  const normalizedQuery = normalizeText(query);
  const scored = matches
    .map((driver) => ({
      driver,
      score: scoreDriverMatch(driver, normalizedQuery),
    }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const second = scored[1];

  if (second && best.score === second.score && best.score < 400) {
    const options = scored
      .slice(0, 3)
      .map(({ driver }) => `${driver.name} ${driver.surname}`)
      .join(", ");
    throw new Error(`Encontre varios pilotos parecidos: ${options}. Usa un apellido mas especifico.`);
  }

  return best.driver;
}

function scoreDriverMatch(driver, normalizedQuery) {
  const fullName = normalizeText(`${driver?.name ?? ""} ${driver?.surname ?? ""}`.trim());
  const surname = normalizeText(driver?.surname ?? "");
  const driverId = normalizeText(driver?.driverId ?? "");
  const shortName = normalizeText(driver?.shortName ?? "");

  if (surname === normalizedQuery) return 1000;
  if (fullName === normalizedQuery) return 950;
  if (driverId === normalizedQuery) return 900;
  if (shortName === normalizedQuery) return 850;
  if (surname.startsWith(normalizedQuery)) return 700;
  if (fullName.startsWith(normalizedQuery)) return 650;
  if (surname.includes(normalizedQuery)) return 500;
  if (fullName.includes(normalizedQuery) || driverId.includes(normalizedQuery)) return 400;

  return 0;
}

async function buildDriverCareerWindow(driver) {
  const seasons = await collectDriverSeasonProfiles(driver.driverId);

  if (!seasons.length) {
    throw new Error(`No encontre temporadas cargadas para ${driver.name} ${driver.surname}.`);
  }

  const allResults = seasons.flatMap((season) => season.results);
  const wins = allResults.filter((result) => extractRacePosition(result) === 1).length;
  const podiums = allResults.filter((result) => {
    const position = extractRacePosition(result);
    return position !== null && position <= 3;
  }).length;

  const lastEntry = allResults
    .slice()
    .sort((left, right) => getRaceTimestamp(right) - getRaceTimestamp(left))[0];

  const completedSeasonYears = seasons
    .map((season) => season.year)
    .filter((year) => year < new Date().getUTCFullYear());

  const championshipYears = [];
  for (const year of completedSeasonYears) {
    const standing = await fetchDriverStandingForYear(year, driver);
    if (standing && Number(standing.position) === 1) {
      championshipYears.push(year);
    }
  }

  return {
    fullName: `${driver.name} ${driver.surname}`.trim(),
    shortName: driver.shortName ?? driver.driverId ?? "DRV",
    wins,
    podiums,
    championships: championshipYears.length,
    seasons: seasons.length,
    firstSeason: seasons[0].year,
    lastSeason: seasons[seasons.length - 1].year,
    lastRaceResult: formatLastRaceResult(lastEntry),
  };
}

async function collectDriverSeasonProfiles(driverId) {
  const currentYear = new Date().getUTCFullYear();
  const seasons = [];
  let foundAny = false;
  let missingAfterCareer = 0;

  for (let year = currentYear; year >= 1950; year -= 1) {
    const payload = await fetchOptionalF1ApiJson(`/${year}/drivers/${driverId}`);
    const results = normalizeDriverResultsPayload(payload);

    if (results.length) {
      seasons.push({
        year,
        results,
      });
      foundAny = true;
      missingAfterCareer = 0;
      continue;
    }

    if (foundAny) {
      missingAfterCareer += 1;
      if (missingAfterCareer >= 5) {
        break;
      }
    }
  }

  return seasons.sort((left, right) => left.year - right.year);
}

function normalizeDriverResultsPayload(payload) {
  const candidates = [
    payload?.results,
    payload?.raceResults,
    payload?.races,
    payload?.driver?.results,
    payload?.data?.results,
  ];

  const rawResults = candidates.find(Array.isArray) ?? [];
  return rawResults.filter(Boolean);
}

async function fetchDriverStandingForYear(year, driver) {
  const payload = await fetchOptionalF1ApiJson(`/${year}/drivers-championship`);
  const candidates = [
    payload?.drivers_championship,
    payload?.driversChampionship,
    payload?.standings,
    payload?.drivers,
    payload?.data,
  ];
  const standings = candidates.find(Array.isArray) ?? [];
  const normalizedDriverId = normalizeText(driver?.driverId ?? "");
  const normalizedFullName = normalizeText(`${driver?.name ?? ""} ${driver?.surname ?? ""}`.trim());
  const normalizedSurname = normalizeText(driver?.surname ?? "");

  return (
    standings.find((entry) => {
      const entryDriverId = normalizeText(entry?.driverId ?? "");
      const entryFullName = normalizeText(
        `${entry?.driver?.name ?? ""} ${entry?.driver?.surname ?? ""}`.trim(),
      );
      const entrySurname = normalizeText(entry?.driver?.surname ?? "");

      return (
        entryDriverId === normalizedDriverId ||
        entryFullName === normalizedFullName ||
        entrySurname === normalizedSurname
      );
    }) ??
    null
  );
}

async function fetchF1ApiJson(path) {
  let lastError = null;

  for (const base of F1_API_BASES) {
    try {
      return await fetchJson(`${base}${path}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No pude conectar con la API historica de pilotos.");
}

async function fetchOptionalF1ApiJson(path) {
  try {
    return await fetchF1ApiJson(path);
  } catch (error) {
    return null;
  }
}

function extractRacePosition(result) {
  const numeric = Number(
    result?.result?.finishingPosition ??
      result?.position ??
      result?.classificationPosition ??
      result?.finishPosition,
  );

  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getRaceTimestamp(result) {
  const rawDate =
    result?.race?.date ??
    result?.date ??
    result?.raceDate ??
    result?.race?.date ??
    result?.race?.raceDate ??
    result?.scheduled ??
    "";

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatLastRaceResult(result) {
  if (!result) {
    return "Sin resultado disponible";
  }

  const position = extractRacePosition(result);
  const raceName =
    result?.race?.name ??
    result?.raceName ??
    result?.race?.raceName ??
    result?.grandPrix ??
    result?.race?.grandPrix ??
    "Carrera";
  const year =
    result?.season ??
    result?.year ??
    result?.race?.season ??
    new Date(getRaceTimestamp(result)).getUTCFullYear();

  if (position !== null) {
    return `${raceName} ${year}: P${position}`;
  }

  const status =
    (result?.result?.retired ? "DNF" : null) ??
    result?.status ??
    result?.raceStatus ??
    result?.result?.status ??
    (result?.retired ? "DNF" : "Sin clasificar");

  return `${raceName} ${year}: ${status}`;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function applyForcedModeIfNeeded() {
  if (!state.forcedMode || !state.lastData) {
    return;
  }

  if (state.forcedMode === "standings") {
    const standingsSession = state.lastData.standingsSession;
    const championship = state.lastData.standingsChampionship ?? [];
    const teamChampionship = state.lastData.standingsTeamChampionship ?? [];
    const drivers = state.lastData.standingsDrivers ?? [];

    if (standingsSession) {
      renderInactiveSession(standingsSession, championship, teamChampionship);
      renderStandingsView(championship, teamChampionship, drivers);
      state.mode = "standings";
    }
    return;
  }

  if (state.forcedMode === "live") {
    const session = state.lastData.liveSession ?? state.lastData.standingsSession;
    const rows =
      state.lastData.undercut?.connected && state.lastData.liveRows?.length
        ? state.lastData.liveRows
        : buildBlankRaceRows(
            state.lastData.standingsDrivers ?? state.lastData.liveDrivers ?? [],
            state.lastData.standingsChampionship ?? state.lastData.liveChampionship ?? [],
          );

    renderSession(
      session ?? { session_name: "Race", meeting_name: "Sin carrera activa" },
      rows,
      state.lastData.undercut ?? disconnectedUndercut("Modo carrera forzado."),
    );
    renderLiveView(rows);
    state.mode = "live";
  }
}

function setNextEvent(session) {
  state.nextEvent = session;
  renderNextEventCountdown();
}

function renderNextEventCountdown() {
  if (!state.nextEvent) {
    elements.nextEventCountdown.textContent = "--:--";
    elements.nextEventName.textContent = state.selectedSeasonYear
      ? `Season ${state.selectedSeasonYear}`
      : "Sin agenda";
    elements.nextEventMeta.textContent = state.selectedSeasonYear
      ? "Modo historico: sin proximo evento"
      : "No encontre proximos eventos";
    return;
  }

  const target = new Date(state.nextEvent.date_start);
  const diffMs = target.getTime() - Date.now();

  elements.nextEventName.textContent = state.nextEvent.session_name ?? "Proximo evento";
  elements.nextEventMeta.textContent = [
    state.nextEvent.meeting_name,
    state.nextEvent.location,
    formatEventDate(target),
  ]
    .filter(Boolean)
    .join(" - ");

  if (diffMs <= 0) {
    elements.nextEventCountdown.textContent = "Ahora";
    return;
  }

  elements.nextEventCountdown.textContent = formatCountdown(diffMs);
}

function renderSourceStatus({ undercut, rows, session, teamChampionship, championship }) {
  elements.openf1Status.textContent = "Conectado";
  elements.openf1Note.textContent = `${championship.length} pilotos y ${teamChampionship.length} equipos para ${session.session_key}.`;

  elements.undercutStatus.textContent = undercut.connected ? "Conectado" : "Offline";
  elements.undercutNote.textContent = undercut.note;
}

function renderLiveView(rows) {
  elements.towerShell.hidden = false;
  elements.standingsShell.hidden = true;
  if (!rows.length) {
    elements.driversBoard.innerHTML = `
      <div class="board-empty">No hubo pilotos para mostrar en esta sesion.</div>
    `;
    return;
  }

  elements.driversBoard.innerHTML = rows
    .map((row) => {
      const trackPosition = row.trackPosition ?? "?";
      const champPosition = row.championshipPosition ?? "--";
      const projectedPosition = row.projectedChampionshipPosition ?? "--";
      const lapTime = row.lapTime ?? "--:--.---";
      const teamColor = escapeHtml(row.teamColor);
      const projectedClass = getProjectedClass(
        row.championshipPosition,
        row.projectedChampionshipPosition,
      );
      const driverLabel = row.broadcastName || row.acronym;

      return `
        <article class="tower-row" style="--row-color:${teamColor}">
          <div class="pos-badge">
            <span class="pos-number">${escapeHtml(row.driverNumber)}</span>
            <span class="pos-track">P${escapeHtml(trackPosition)}</span>
          </div>
          <div class="driver-stack">
            <div class="driver-meta">
              <div class="driver-topline">
                <span class="driver-name">${escapeHtml(driverLabel)}</span>
                <span class="driver-number">${escapeHtml(row.acronym)}</span>
              </div>
              <span class="driver-subtle">Numero ${escapeHtml(row.driverNumber)}</span>
            </div>
          </div>
          <div class="team-meta">
            <span class="team-name">${escapeHtml(row.teamName)}</span>
            <span class="team-line"></span>
            <span class="team-subtle">Escuderia</span>
          </div>
          <div class="lap-stack">
            <span class="lap-time">${escapeHtml(lapTime)}</span>
            <span class="lap-subtle">Ultima vuelta</span>
          </div>
          <div class="sector-stack">
            <div class="sector-track">
              ${row.sectors
                .map((sector) => `<span class="sector-chip ${escapeHtml(sector)}"></span>`)
                .join("")}
            </div>
            <div class="sector-labels">
              <span>S1</span>
              <span>S2</span>
              <span>S3</span>
            </div>
          </div>
          <div class="rank-stack">
            <span class="rank-label">Champ actual</span>
            <span class="rank-main">P${escapeHtml(champPosition)}</span>
            <span class="rank-points">${formatPoints(row.championshipPoints)}</span>
          </div>
          <div class="rank-stack">
            <span class="rank-label">Proyeccion</span>
            <span class="rank-main ${projectedClass}">P${escapeHtml(projectedPosition)}</span>
            <span class="rank-points">${formatPoints(row.projectedChampionshipPoints)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStandingsView(driverStandings, teamStandings, drivers) {
  elements.towerShell.hidden = true;
  elements.standingsShell.hidden = false;

  const driversByNumber = indexByDriverNumber(drivers);

  elements.driversStandingsBody.innerHTML = driverStandings.length
    ? driverStandings
        .slice()
        .sort((a, b) => Number(a.position_current ?? 999) - Number(b.position_current ?? 999))
        .map((entry) => {
          const driver = driversByNumber.get(Number(entry.driver_number)) ?? {};
          return `
            <div class="standings-row">
              <span class="standings-pos">P${escapeHtml(entry.position_current ?? "--")}</span>
              <div class="standings-name">
                <span class="standings-title">${escapeHtml(
                  driver.broadcast_name ?? driver.full_name ?? driver.name_acronym ?? `#${entry.driver_number}`,
                )}</span>
                <span class="standings-sub">#${escapeHtml(entry.driver_number)} · ${escapeHtml(
                  driver.name_acronym ?? "UNK",
                )}</span>
              </div>
              <div class="standings-name">
                <span class="standings-title">${escapeHtml(driver.team_name ?? "Equipo")}</span>
                <span class="standings-sub">Pilotos</span>
              </div>
              <span class="standings-points">${escapeHtml(formatPoints(entry.points_current))}</span>
            </div>
          `;
        })
        .join("")
    : '<div class="board-empty">No hay tabla de pilotos disponible para esta sesion.</div>';

  elements.teamsStandingsBody.innerHTML = teamStandings.length
    ? teamStandings
        .slice()
        .sort((a, b) => Number(a.position_current ?? 999) - Number(b.position_current ?? 999))
        .map((entry) => {
          return `
            <div class="standings-row standings-row-team">
              <span class="standings-pos">P${escapeHtml(entry.position_current ?? "--")}</span>
              <div class="standings-name">
                <span class="standings-title">${escapeHtml(entry.team_name ?? "Escuderia")}</span>
                <span class="standings-sub">Constructores</span>
              </div>
              <span class="standings-points">${escapeHtml(formatPoints(entry.points_current))}</span>
            </div>
          `;
        })
        .join("")
    : '<div class="board-empty">No hay tabla de constructores disponible para esta sesion.</div>';
}

function renderLoading() {
  elements.towerShell.hidden = false;
  elements.standingsShell.hidden = true;
  elements.driversBoard.innerHTML = `<div class="board-empty">${escapeHtml(
    getLoadingMessage(),
  )}</div>`;
}

function renderError(error) {
  state.mode = "standings";
  elements.openf1Status.textContent = "Error";
  elements.openf1Note.textContent = "No pude completar la carga de OpenF1.";
  elements.undercutStatus.textContent = canUseLocalUndercut() ? "Sin validar" : "Deshabilitado";
  elements.undercutNote.textContent = canUseLocalUndercut()
    ? "La carga principal fallo antes de usar el timing local."
    : getUndercutDisabledNote();
  elements.driverCount.textContent = "0";
  elements.summaryNote.textContent = "Revisa la session key o la conexion y vuelve a intentar.";
  setMessage(error.message ?? "Ocurrio un error inesperado.", "error");

  if (state.lastData?.standingsSession) {
    renderInactiveSession(
      state.lastData.standingsSession,
      state.lastData.standingsChampionship ?? [],
      state.lastData.standingsTeamChampionship ?? [],
    );
    renderStandingsView(
      state.lastData.standingsChampionship ?? [],
      state.lastData.standingsTeamChampionship ?? [],
      state.lastData.standingsDrivers ?? [],
    );
    return;
  }

  elements.towerShell.hidden = true;
  elements.standingsShell.hidden = false;
  elements.driversStandingsBody.innerHTML = `
    <div class="board-empty">No pude cargar la tabla de pilotos. Revisa la conexion y vuelve a intentar.</div>
  `;
  elements.teamsStandingsBody.innerHTML = `
    <div class="board-empty">No pude cargar la tabla de constructores. Revisa la conexion y vuelve a intentar.</div>
  `;
}

function setMessage(message, tone = "info") {
  elements.messageBar.hidden = false;
  elements.messageBar.className = `message-bar${tone === "error" ? " error" : ""}`;
  elements.messageBar.textContent = message;
}

async function fetchJson(url) {
  const ttlMs = getOpenF1CacheTtl(url);
  const cached = readCache(url, ttlMs);

  if (cached?.isFresh) {
    return cached.data;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (cached?.data) {
        return cached.data;
      }

      throw new Error(`Fallo la consulta a ${url} (${response.status}).`);
    }

    const data = await response.json();
    writeCache(url, data, ttlMs);
    return data;
  } catch (error) {
    if (cached?.data) {
      return cached.data;
    }

    throw error;
  }
}

async function fetchOptionalJson(url) {
  try {
    return await fetchJson(url);
  } catch (error) {
    return [];
  }
}

function formatLapTime(seconds) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return null;
  }

  const wholeMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - wholeMinutes * 60;

  return `${String(wholeMinutes).padStart(2, "0")}:${remainingSeconds
    .toFixed(3)
    .padStart(6, "0")}`;
}

function formatPoints(points) {
  if (typeof points !== "number" || Number.isNaN(points)) {
    return "Sin puntos";
  }

  return `${points.toFixed(0)} pts`;
}

function formatCountdown(diffMs) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatEventDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getProjectedClass(startPosition, projectedPosition) {
  if (
    typeof startPosition !== "number" ||
    Number.isNaN(startPosition) ||
    typeof projectedPosition !== "number" ||
    Number.isNaN(projectedPosition)
  ) {
    return "same";
  }

  if (projectedPosition < startPosition) {
    return "good";
  }

  if (projectedPosition > startPosition) {
    return "bad";
  }

  return "same";
}

function formatClock(date) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return null;
}

function pickFirstValue(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

init();

