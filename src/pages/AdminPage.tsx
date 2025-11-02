import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";

type CeleryState = "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE" | "STARTED" | "UNKNOWN";
type IntervalKey = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
const INTERVAL_ORDER: IntervalKey[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

interface IntervalProgress {
  interval: IntervalKey;
  pct_time: number;
  state: CeleryState;
  last_updated_iso?: string | null;
  latest_open_iso?: string | null;
}

interface SymbolProgress {
  jobId: string;
  state: CeleryState;
  status: string;
  current: number;
  total: number;
  pct_intervals: number;
  symbol: string;
  interval?: string;
  errorInfo?: string;
  last_updated_iso?: string | null;
  latest_open_iso?: string | null;
  intervals: Partial<Record<IntervalKey, IntervalProgress>>;
}

const API_URL = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:8080";
const POLLING_INTERVAL = 3000;
const ACTIVE_CHECK_INTERVAL = 5000;
const api = axios.create({ baseURL: API_URL, timeout: 20000 });

const clampPct = (v: any) => {
  const num = Number(v);
  if (!Number.isFinite(num) || isNaN(num)) return 0;
  return Math.max(0, Math.min(100, num));
};

function computeOverallPct(p: SymbolProgress): number {
  const total = p.total || 0;
  const cur = p.current || 0;
  const pctIntervals = clampPct(p.pct_intervals);

  if (pctIntervals > 0) return Math.round(pctIntervals);

  const curInterval = p.interval as IntervalKey | undefined;
  const curPctTime = curInterval ? clampPct(p.intervals[curInterval]?.pct_time) : 0;
  const blended = total > 0 ? ((cur + curPctTime / 100) / total) * 100 : 0;
  return Math.round(clampPct(blended));
}

const AdminPage: React.FC = () => {
  const [registerMessage, setRegisterMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, SymbolProgress>>({});
  const [symbolJobMap, setSymbolJobMap] = useState<Record<string, string>>({});
  const [jobIds, setJobIds] = useState<string[]>([]);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const isBackfillRunning = useMemo(
    () => Object.values(progressMap).some((p) => p.state === "PROGRESS" || p.state === "STARTED"),
    [progressMap]
  );

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (ids: string[], symToJob: Record<string, string>) => {
    stopPolling();
    if (!ids.length) return;
    void pollBulkStatuses(ids, symToJob);
    pollIntervalRef.current = setInterval(() => {
      if (!document.hidden) void pollBulkStatuses(ids, symToJob);
    }, POLLING_INTERVAL);
  };

  const handleRegisterSymbols = async () => {
    if (isBackfillRunning) return;
    setLoading(true);
    setRegisterMessage("");
    try {
      const res = await api.post(`/admin/register_symbols`);
      setRegisterMessage(res.data?.message || "종목 등록 완료");
    } catch {
      setRegisterMessage("종목 등록 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    if (isBackfillRunning) return;
    setLoading(true);
    setProgressMap({});
    setSymbolJobMap({});
    setJobIds([]);
    stopPolling();

    try {
      const res = await api.post(`/ohlcv/rest/backfill/all-symbols`, {});
      const { symbol_job_map, job_ids } = res.data || {};
      if (!symbol_job_map || !job_ids) throw new Error("symbol_job_map 또는 job_ids 없음");

      const initial: Record<string, SymbolProgress> = {};
      for (const [symbol, jobId] of Object.entries(symbol_job_map)) {
        initial[symbol] = {
          jobId,
          state: "PENDING",
          status: "대기 중...",
          current: 0,
          total: 0,
          pct_intervals: 0,
          symbol,
          interval: undefined,
          last_updated_iso: null,
          latest_open_iso: null,
          intervals: {},
        };
      }

      setProgressMap(initial);
      setSymbolJobMap(symbol_job_map);
      setJobIds(job_ids);
      startPolling(job_ids, symbol_job_map);
    } catch (err: any) {
      alert(`백필 시작 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pollBulkStatuses = async (ids: string[], symToJob: Record<string, string>) => {
    if (!ids.length) return;
    try {
      const { data } = await api.post(`/ohlcv/rest/status/bulk`, { job_ids: ids });
      const items = (data?.items || []) as Array<any>;
      const jobToSymbol = Object.fromEntries(Object.entries(symToJob).map(([s, j]) => [j, s]));

      setProgressMap((prev) => {
        const next: Record<string, SymbolProgress> = { ...prev };
        for (const it of items) {
          const symbolKey = jobToSymbol[it.job_id] || it.symbol || "UNKNOWN";
          const prevRow = next[symbolKey] || {
            jobId: it.job_id,
            state: "UNKNOWN",
            status: "-",
            current: 0,
            total: 0,
            pct_intervals: 0,
            symbol: symbolKey,
            intervals: {},
          };

          const updated: SymbolProgress = {
            ...prevRow,
            jobId: it.job_id,
            state: (it.state || prevRow.state || "UNKNOWN") as CeleryState,
            status: it.status ?? prevRow.status ?? "-",
            current: typeof it.current === "number" ? it.current : prevRow.current,
            total: typeof it.total === "number" ? it.total : prevRow.total,
            pct_intervals: clampPct(it.pct_intervals ?? prevRow.pct_intervals ?? 0),
            interval: it.interval ?? prevRow.interval,
            errorInfo: it.error_info,
            intervals: { ...prevRow.intervals },
          };

          const intv = it.interval as IntervalKey | undefined;
          if (intv) {
            const before = updated.intervals[intv];
            updated.intervals[intv] = {
              interval: intv,
              state: (it.state || before?.state || "PROGRESS") as CeleryState,
              pct_time: clampPct(it.pct_time ?? before?.pct_time ?? 0),
              last_updated_iso: it.last_updated_iso ?? before?.last_updated_iso ?? null,
              latest_open_iso: it.latest_open_iso ?? before?.latest_open_iso ?? null,
            };
          }

          next[symbolKey] = updated;
        }
        return next;
      });

      const allDone = items.every((it) => ["SUCCESS", "FAILURE"].includes(it.state));
      if (allDone) stopPolling();
    } catch (err) {
      console.error("벌크 상태 폴링 오류:", err);
    }
  };

  const loadActiveJobs = async () => {
    try {
      const { data } = await api.get(`/ohlcv/rest/status/active`);
      const activeJobIds = (data?.job_ids || []) as string[];
      const activeSymbolJobMap = (data?.symbol_job_map || {}) as Record<string, string>;
      const items = (data?.items || []) as Array<any>;
      if (!activeJobIds.length) return;

      const jobToSymbol = Object.fromEntries(Object.entries(activeSymbolJobMap).map(([s, j]) => [j, s]));
      const initial: Record<string, SymbolProgress> = {};

      for (const it of items) {
        const sym = (jobToSymbol[it.job_id] || it.symbol || "UNKNOWN") as string;
        initial[sym] = {
          jobId: it.job_id,
          state: (it.state || "UNKNOWN") as CeleryState,
          status: it.status || "-",
          current: it.current || 0,
          total: it.total || 0,
          pct_intervals: clampPct(it.pct_intervals),
          interval: it.interval,
          symbol: sym,
          errorInfo: it.error_info,
          intervals: {},
        };
      }

      setProgressMap(initial);
      setSymbolJobMap(activeSymbolJobMap);
      setJobIds(activeJobIds);
      startPolling(activeJobIds, activeSymbolJobMap);
    } catch (err) {
      console.error("진행 중 작업 조회 실패:", err);
    }
  };

  useEffect(() => {
    void loadActiveJobs();
    const interval = setInterval(() => {
      if (!document.hidden) void loadActiveJobs();
    }, ACTIVE_CHECK_INTERVAL);
    return () => {
      clearInterval(interval);
      stopPolling();
    };
  }, []);

  const rows = useMemo(
    () =>
      Object.entries(progressMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([symbol, p], idx) => ({
          idx: idx + 1,
          symbol,
          p,
          overallPct: computeOverallPct(p),
        })),
    [progressMap]
  );

  const scrollToBottom = () => {
    listContainerRef.current?.scrollTo({ top: listContainerRef.current.scrollHeight, behavior: "smooth" });
  };
  const scrollToTop = () => {
    listContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col items-center w-screen min-h-screen p-6 md:p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">DB 관리</h1>

      {/* 종목 등록 */}
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-3xl text-center shadow-xl border border-gray-700 mb-6 sticky top-0 z-20 backdrop-blur bg-gray-800/95">
        <h2 className="text-lg font-semibold mb-4 text-cyan-400">1. 종목 불러오기</h2>
        <button
          onClick={handleRegisterSymbols}
          disabled={loading || isBackfillRunning}
          className={`w-full px-4 py-2 rounded-md font-semibold text-white ${
            loading || isBackfillRunning ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading || isBackfillRunning ? "불러오는 중..." : "서버 내부 CSV에서 불러오기"}
        </button>
        {registerMessage && (
          <p className={`text-sm mt-3 ${registerMessage.includes("실패") ? "text-red-400" : "text-green-400"}`}>
            {registerMessage}
          </p>
        )}
      </div>

      {/* OHLCV 백필 패널 */}
      <div className="bg-gray-800 w-full max-w-5xl rounded-lg shadow-xl border border-gray-700">
        <div className="p-4 md:p-6 border-b border-gray-700 sticky top-[84px] md:top-[96px] bg-gray-800/95 backdrop-blur z-10">
          <h2 className="text-lg font-semibold mb-4 text-green-400">2. OHLCV 데이터 백필</h2>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <button
              onClick={handleBackfill}
              disabled={loading || isBackfillRunning}
              className={`w-full md:w-auto px-4 py-2 rounded-md font-semibold text-white ${
                loading || isBackfillRunning ? "bg-green-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {loading || isBackfillRunning ? "작업 진행 중..." : "모든 종목 백필 시작"}
            </button>
            <div className="flex-1" />
            <div className="flex gap-2">
              <button onClick={scrollToTop} className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-xs">
                맨 위로
              </button>
              <button onClick={scrollToBottom} className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-xs">
                맨 아래로
              </button>
            </div>
          </div>
        </div>

        <div ref={listContainerRef} className="px-4 md:px-6 pb-16 max-h-[70vh] overflow-y-auto">
          {rows.length > 0 ? (
            <div className="mt-4 space-y-4">
              {rows.map(({ idx, symbol, p, overallPct }) => (
                <div
                  key={symbol}
                  className={`p-4 rounded-lg ${
                    p.state === "FAILURE"
                      ? "bg-red-900/50"
                      : p.state === "SUCCESS"
                      ? "bg-green-900/50"
                      : "bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {idx}. {symbol}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        p.state === "SUCCESS"
                          ? "text-green-300 border-green-400"
                          : p.state === "FAILURE"
                          ? "text-red-300 border-red-400"
                          : "text-blue-300 border-blue-400"
                      }`}
                    >
                      {p.state}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 mt-1 truncate">{p.status || "-"}</p>

                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-300 mb-1">
                      <span>인터벌 진행률</span>
                      <span>
                        {p.current}/{p.total} · {overallPct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2.5">
                      <div
                        className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${overallPct}%` }}
                      />
                    </div>
                  </div>

                  {/* interval bars */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {INTERVAL_ORDER.map((iv) => {
                      const ivp = p.intervals[iv];
                      const pct = Math.round(clampPct(ivp?.pct_time ?? 0));
                      const tag =
                        ivp?.state === "SUCCESS"
                          ? "완료"
                          : ivp?.state === "FAILURE"
                          ? "실패"
                          : ivp
                          ? "진행중"
                          : "대기";
                      return (
                        <div key={iv} className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-300">{iv}</span>
                            <span className="text-gray-400">
                              {pct}% · {tag}
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">진행 중인 작업이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
