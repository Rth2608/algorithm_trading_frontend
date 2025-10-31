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
  errorInfo?: string;             
  symbol?: string;                
}

const API_URL = "http://localhost:8080";
const POLLING_INTERVAL = 3000; // 3초

const AdminPage: React.FC = () => {
  const [registerMessage, setRegisterMessage] = useState("");
  const [loading, setLoading] = useState(false); // 버튼 로딩

  /** symbol → 진행 상태*/
  const [progressMap, setProgressMap] = useState<Record<string, ProgressState>>({});
  /** symbol → job_id*/
  const [symbolJobMap, setSymbolJobMap] = useState<Record<string, string>>({});
  /** job_id 목록 */
  const [jobIds, setJobIds] = useState<string[]>([]);

  /** 최신 상태를 참조하기 위한 ref */
  const progressMapRef = useRef(progressMap);
  useEffect(() => { progressMapRef.current = progressMap; }, [progressMap]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /** 종목 등록 */
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

  /** 모든 종목 백필 시작 */
  const handleBackfill = async () => {
    setLoading(true);
    setProgressMap({});
    setSymbolJobMap({});
    setJobIds([]);

    // 기존 폴링 중지
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

      // 초기 진행 상태 구성
      const initial: Record<string, ProgressState> = {};
      for (const [symbol, jobId] of Object.entries(symbol_job_map)) {
        initial[symbol] = {
          jobId,
          state: "PENDING",
          status: "대기 중...",
          current: 0,
          total: 6, // 1m,5m,15m,1h,4h,1d
          interval_percentage: 0,
          symbol,
        };
      }

      setProgressMap(initial);
      setSymbolJobMap(symbol_job_map);
      setJobIds(job_ids);

      // 즉시 1회 폴링 + 주기 폴링
      await pollBulkStatuses(job_ids, symbol_job_map);
      pollIntervalRef.current = setInterval(
        () => pollBulkStatuses(job_ids, symbol_job_map),
        POLLING_INTERVAL
      );
    } catch (err: any) {
      console.error(err);
      // 에러를 모든 심볼에 일괄 표시하진 않고, 상단 메시지로 충분하면 스킵 가능
      alert(`백필 시작 실패: ${err?.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  /** 벌크 상태 폴링 */
  const pollBulkStatuses = async (
    ids: string[],
    symToJob: Record<string, string>
  ) => {
    if (!ids.length) return;

    try {
      const { data } = await axios.post(`${API_URL}/ohlcv/rest/status/bulk`, {
        job_ids: ids,
      });

      // 응답: { summary, items: [ { job_id, state, status, current, total, interval_percentage, error_info, symbol }, ... ] }
      const items = (data?.items || []) as Array<{
        job_id: string;
        state: CeleryState;
        status: string;
        current?: number;
        total?: number;
        interval_percentage?: number;
        error_info?: string;
        symbol?: string;
      }>;

      if (!Array.isArray(items)) return;

      // job_id → symbol 역 인덱스
      const jobToSymbol: Record<string, string> = {};
      for (const [s, jid] of Object.entries(symToJob)) jobToSymbol[jid] = s;

      // 상태 갱신
      setProgressMap((prev) => {
        const next = { ...prev };
        for (const it of items) {
          const symbol = jobToSymbol[it.job_id] || it.symbol || "UNKNOWN";
          const prevRow = next[symbol];

          // 이미 성공/실패면 덮어쓸 필요는 없지만, 혹시 보강 정보가 있으면 업데이트
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
            errorInfo: it.error_info,
            symbol,
          };

          // 이미 완료된 항목은 유지
          if (alreadyDone && row.state !== "FAILURE" && row.state !== "SUCCESS") {
            continue;
          }
          next[symbol] = row;
        }
        return next;
      });

      // 모두 종료되었는지 확인 → 폴링 중단
      const allDone = items.every(
        (it) => it.state === "SUCCESS" || it.state === "FAILURE"
      );
      if (allDone && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } catch (err) {
      console.error("벌크 상태 폴링 오류:", err);
      // 네트워크 오류 시 다음 주기에 재시도
    }
  };

  // 언마운트 시 폴링 중단
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  /** 테이블 렌더를 위한 정렬된 행 */
  const rows = useMemo(() => {
    const entries = Object.entries(progressMap);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([symbol, p], idx) => {
      const overall =
        p.total > 0 ? Math.min(100, Math.max(0, (p.current / p.total) * 100)) : 0;
      return { idx: idx + 1, symbol, p, overall };
    });
  }, [progressMap]);

  return (
    <div className="flex flex-col items-center justify-center w-screen min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">DB 관리</h1>

      {/* 종목 불러오기 */}
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

      {/* 백필 */}
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

        {/* 진행 현황 리스트 */}
        {rows.length > 0 && (
          <div className="mt-6 text-left space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {rows.map(({ idx, symbol, p, overall }) => (
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

                    {/* 현재 인터벌 상세 진행률 */}
                    {p.state === "PROGRESS" && (
                      <div className="w-full bg-gray-600 rounded-full h-2.5">
                        <div
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(p.interval_percentage)}%` }}
                        />
                      </div>
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
