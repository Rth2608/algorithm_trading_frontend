import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";

type CeleryState = "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE" | "UNKNOWN";

interface ProgressState {
  jobId: string;
  state: CeleryState;
  status: string;

  current: number;
  total: number;
  interval_percentage: number;

  chunk_current?: number;
  chunk_total?: number;
  chunk_pct?: number;

  errorInfo?: string;
  symbol?: string;
  interval?: string;
}

const API_URL = "http://localhost:8080";
const POLLING_INTERVAL = 3000; // 3초

const AdminPage: React.FC = () => {
  const [registerMessage, setRegisterMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [progressMap, setProgressMap] = useState<Record<string, ProgressState>>({});
  const [symbolJobMap, setSymbolJobMap] = useState<Record<string, string>>({});
  const [jobIds, setJobIds] = useState<string[]>([]);

  const progressMapRef = useRef(progressMap);
  useEffect(() => { progressMapRef.current = progressMap; }, [progressMap]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleRegisterSymbols = async () => {
    setLoading(true);
    setRegisterMessage("");
    try {
      const res = await axios.post(`${API_URL}/admin/register_symbols`);
      setRegisterMessage(res.data.message || "종목 등록 완료");
    } catch (err: any) {
      console.error(err);
      setRegisterMessage("종목 등록 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    setLoading(true);
    setProgressMap({});
    setSymbolJobMap({});
    setJobIds([]);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      const res = await axios.post(`${API_URL}/ohlcv/rest/backfill/all-symbols`, {});
      const { symbol_job_map, job_ids } = res.data as {
        message: string;
        symbols_count: number;
        job_ids: string[];
        symbol_job_map: Record<string, string>;
      };

      if (!symbol_job_map || !job_ids) {
        throw new Error("백엔드 응답에 symbol_job_map 또는 job_ids가 없습니다.");
      }

      const initial: Record<string, ProgressState> = {};
      for (const [symbol, jobId] of Object.entries(symbol_job_map)) {
        initial[symbol] = {
          jobId,
          state: "PENDING",
          status: "대기 중...",
          current: 0,
          total: 6,
          interval_percentage: 0,

          chunk_current: 0,
          chunk_total: 0,
          chunk_pct: 0,
          symbol,
          interval: undefined,
        };
      }

      setProgressMap(initial);
      setSymbolJobMap(symbol_job_map);
      setJobIds(job_ids);

      await pollBulkStatuses(job_ids, symbol_job_map);
      pollIntervalRef.current = setInterval(
        () => pollBulkStatuses(job_ids, symbol_job_map),
        POLLING_INTERVAL
      );
    } catch (err: any) {
      console.error(err);
      alert(`백필 시작 실패: ${err?.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  const pollBulkStatuses = async (
    ids: string[],
    symToJob: Record<string, string>
  ) => {
    if (!ids.length) return;

    try {
      const { data } = await axios.post(`${API_URL}/ohlcv/rest/status/bulk`, {
        job_ids: ids,
      });

      const items = (data?.items || []) as Array<{
        job_id: string;
        state: CeleryState;
        status: string;
        current?: number;
        total?: number;
        interval_percentage?: number;
        error_info?: string;
        symbol?: string;
        interval?: string;

        chunk_current?: number;
        chunk_total?: number;
        chunk_pct?: number;
      }>;

      if (!Array.isArray(items)) return;

      const jobToSymbol: Record<string, string> = {};
      for (const [s, jid] of Object.entries(symToJob)) jobToSymbol[jid] = s;

      setProgressMap((prev) => {
        const next = { ...prev };
        for (const it of items) {
          const symbol = jobToSymbol[it.job_id] || it.symbol || "UNKNOWN";
          const prevRow = next[symbol];

          const alreadyDone =
            prevRow &&
            (prevRow.state === "SUCCESS" || prevRow.state === "FAILURE");

          const row: ProgressState = {
            jobId: it.job_id,
            state: it.state,
            status: it.status ?? prevRow?.status ?? "-",
            current: typeof it.current === "number" ? it.current : prevRow?.current ?? 0,
            total: typeof it.total === "number" ? it.total : prevRow?.total ?? 6,
            interval_percentage:
              typeof it.interval_percentage === "number"
                ? it.interval_percentage
                : prevRow?.interval_percentage ?? 0,

            chunk_current:
              typeof it.chunk_current === "number"
                ? it.chunk_current
                : prevRow?.chunk_current ?? 0,
            chunk_total:
              typeof it.chunk_total === "number"
                ? it.chunk_total
                : prevRow?.chunk_total ?? 0,
            chunk_pct:
              typeof it.chunk_pct === "number"
                ? it.chunk_pct
                : prevRow?.chunk_pct ?? 0,

            interval: it.interval ?? prevRow?.interval,
            errorInfo: it.error_info,
            symbol,
          };

          if (alreadyDone && row.state !== "FAILURE" && row.state !== "SUCCESS") {
            continue;
          }
          next[symbol] = row;
        }
        return next;
      });

      const allDone = items.every(
        (it) => it.state === "SUCCESS" || it.state === "FAILURE"
      );
      if (allDone && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } catch (err) {
      console.error("벌크 상태 폴링 오류:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const rows = useMemo(() => {
    const entries = Object.entries(progressMap);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([symbol, p], idx) => {
      const overall =
        p.total > 0 ? Math.min(100, Math.max(0, (p.current / p.total) * 100)) : 0;
      const chunkPct = Math.round(p.chunk_pct ?? 0);
      return { idx: idx + 1, symbol, p, overall, chunkPct };
    });
  }, [progressMap]);

  return (
    <div className="flex flex-col items-center justify-center w-screen min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">DB 관리</h1>

      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg text-center shadow-xl border border-gray-700 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-cyan-400">1. 종목 불러오기</h2>
        <button
          onClick={handleRegisterSymbols}
          disabled={loading}
          className={`w-full px-4 py-2 rounded-md font-semibold text-white ${
            loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 transition-colors"
          }`}
        >
          {loading ? "불러오는 중..." : "서버 내부 CSV에서 불러오기"}
        </button>

        {registerMessage && (
          <p className={`text-sm mt-3 ${registerMessage.includes("실패") ? "text-red-400" : "text-green-400"}`}>
            {registerMessage}
          </p>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-5xl text-center shadow-xl border border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-green-400">2. OHLCV 데이터 백필</h2>
        <button
          onClick={handleBackfill}
          disabled={loading}
          className={`w-full max-w-lg px-4 py-2 rounded-md font-semibold text-white ${
            loading ? "bg-green-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 transition-colors"
          }`}
        >
          {loading ? "작업 시작 중..." : "모든 종목 백필 시작"}
        </button>

        {rows.length > 0 && (
          <div className="mt-6 text-left space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {rows.map(({ idx, symbol, p, overall, chunkPct }) => (
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
                  <h3 className="text-lg font-semibold text-white">
                    {idx}. {symbol}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      p.state === "SUCCESS"
                        ? "bg-green-100/10 text-green-300 border-green-500/30"
                        : p.state === "FAILURE"
                        ? "bg-red-100/10 text-red-300 border-red-500/30"
                        : p.state === "PROGRESS"
                        ? "bg-blue-100/10 text-blue-300 border-blue-500/30"
                        : "bg-gray-100/10 text-gray-300 border-gray-500/30"
                    }`}
                  >
                    {p.state}
                  </span>
                </div>

                {p.state === "FAILURE" ? (
                  <p className="text-red-300 text-sm mt-1">{p.errorInfo || p.status}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-300 mt-1 truncate">{p.status}</p>

                    {/* 전체 인터벌 진행률 */}
                    <div className="w-full bg-gray-600 rounded-full h-2.5 my-2">
                      <div
                        className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${overall}%` }}
                      />
                    </div>

                    {/* 현재 인터벌 상세 진행률 (chunk) */}
                    {p.state === "PROGRESS" && (
                      <>
                        <div className="flex items-center justify-between text-xs text-gray-300 mt-1">
                          <span>{p.interval || "-"}</span>
                          <span>
                            {(p.chunk_current ?? 0)}/{(p.chunk_total ?? 0)} · {chunkPct}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2.5">
                          <div
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${chunkPct}%` }}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
