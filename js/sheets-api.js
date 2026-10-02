/**
 * SKHY Timetable Studio - Google Apps Script & Google Sheets API 모듈
 * [신규 포맷]: 단일 시트에 sheet_name 열을 기반으로 개인별(A_담당, B_팀장, C_파트장) 일정 관리 및 timetable_fixed 저장 지원
 */

const SheetsApi = (function () {
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxd5c5sHok_UUWu-_pLsvQ0VBxSjPdIrM0tqXKoZ5vcgIZcLHNNXTFUdQF34abiynSfvA/exec";
  const SOURCE_SPREADSHEET_ID = "1rRunNn1fnbEjfLgh7FFwphGVwmdvCQY-Fd1wvmlnzdc";
  const GAS_URL_KEY = "skhy_gas_web_app_url";
  const LOCAL_CACHE_KEY = "skhy_timetable_cache_v3"; // v3: 이전 'Main'/'시트1' 단일 탭 캐시 자동 무효화

  /**
   * 저장된 Google Apps Script Web App URL 반환
   */
  function getGasUrl() {
    return localStorage.getItem(GAS_URL_KEY) || DEFAULT_GAS_URL;
  }

  /**
   * Google Apps Script Web App URL 설정
   */
  function setGasUrl(url) {
    if (url) {
      localStorage.setItem(GAS_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(GAS_URL_KEY);
    }
  }

  /**
   * 연동 URL 설정 여부 확인
   */
  function isConfigured() {
    const url = getGasUrl();
    return Boolean(url && url.startsWith("https://script.google.com/macros/s/"));
  }

  /**
   * 로컬 캐시에서 데이터 가져오기
   * - 캐시에 'Main', '시트1' 등 잘못된 단일 탭이 들어있다면 무시하고 최신 Mock(A_담당, B_팀장, C_파트장) 사용
   */
  function getLocalData() {
    try {
      const saved = localStorage.getItem(LOCAL_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          const hasInvalidSheetName = parsed.sheets.some(
            s => s.sheetName === "Main" || s.sheetName === "시트1" || s.sheetName === "Sheet1" || s.sheetName === "timetable"
          );
          if (!hasInvalidSheetName) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn("로컬 캐시 파싱 실패:", e);
    }
    return JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
  }

  /**
   * 로컬 캐시에 데이터 저장
   */
  function saveLocalData(data) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("로컬 캐시 저장 오류:", e);
    }
  }

  /**
   * 시간 포맷 통일 유틸리티 (09:00 형식으로 변환)
   */
  function formatTimeStr(val) {
    if (!val) return "";
    val = String(val).trim();
    if (val.startsWith("Date(")) {
      const parts = val.match(/\d+/g);
      if (parts && parts.length >= 5) {
        return parts[3].padStart(2, "0") + ":" + parts[4].padStart(2, "0");
      }
    }
    const match = val.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return match[1].padStart(2, "0") + ":" + match[2];
    }
    return val;
  }

  /**
   * Google Visualization API (JSONP)를 활용하여 원본 시트에서 실시간 직접 읽기
   * - Apps Script 배포 상태와 무관하게 sheet_name 열을 직접 읽어 팀원별(A_담당, B_팀장, C_파트장)로 즉시 분할
   */
  function fetchDirectFromGoogleSheet() {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !document) {
        return reject(new Error("브라우저 환경이 아닙니다."));
      }

      const callbackName = "gvizCallback_" + Math.random().toString(36).substring(2, 9);
      const script = document.createElement("script");
      const timeoutTimer = setTimeout(() => {
        cleanup();
        reject(new Error("구글 시트 직접 조회 타임아웃"));
      }, 6000);

      function cleanup() {
        clearTimeout(timeoutTimer);
        try { delete window[callbackName]; } catch (e) {}
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (json) {
        cleanup();
        try {
          if (!json || !json.table || !json.table.rows) {
            throw new Error("유효하지 않은 구글 시트 테이블 데이터");
          }

          const cols = (json.table.cols || []).map(c => String(c.label || "").trim().toLowerCase());
          const sheetNameIdx = cols.indexOf("sheet_name") !== -1 ? cols.indexOf("sheet_name") : 0;
          const startTimeIdx = cols.indexOf("start_time") !== -1 ? cols.indexOf("start_time") : 1;
          const endTimeIdx = cols.indexOf("end_time") !== -1 ? cols.indexOf("end_time") : 2;
          const taskIdx = cols.indexOf("task") !== -1 ? cols.indexOf("task") : 3;
          const summaryIdx = cols.indexOf("summary") !== -1 ? cols.indexOf("summary") : 4;
          const etcIdx = cols.indexOf("etc") !== -1 ? cols.indexOf("etc") : 5;

          const memberMap = {};
          const memberOrder = [];

          json.table.rows.forEach((r, idx) => {
            const c = r.c || [];
            if (!c[sheetNameIdx] && !c[taskIdx]) return;

            const personName = c[sheetNameIdx] ? String(c[sheetNameIdx].v || "").trim() : "미지정";
            if (!personName || personName === "Main" || personName === "시트1" || personName === "Sheet1") {
              return;
            }

            if (!memberMap[personName]) {
              memberMap[personName] = {
                sheetName: personName,
                status: "draft",
                updatedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
                data: []
              };
              memberOrder.push(personName);
            }

            const startTime = formatTimeStr(c[startTimeIdx] ? (c[startTimeIdx].f || c[startTimeIdx].v) : "");
            const endTime = formatTimeStr(c[endTimeIdx] ? (c[endTimeIdx].f || c[endTimeIdx].v) : "");
            const task = c[taskIdx] ? String(c[taskIdx].v || "") : "";
            const summary = c[summaryIdx] ? String(c[summaryIdx].v || "") : "";
            const etc = c[etcIdx] ? String(c[etcIdx].v || "") : "";

            memberMap[personName].data.push({
              id: `task-${personName}-${idx + 1}`,
              sheet_name: personName,
              start_time: startTime,
              end_time: endTime,
              task: task,
              summary: summary,
              etc: etc,
              category: guessCategory(task, summary)
            });
          });

          if (memberOrder.length === 0) {
            throw new Error("sheet_name으로 분류된 팀원 데이터가 없습니다.");
          }

          const sheets = memberOrder.map(name => memberMap[name]);
          resolve(sheets);
        } catch (e) {
          reject(e);
        }
      };

      script.src = `https://docs.google.com/spreadsheets/d/${SOURCE_SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&_=${Date.now()}`;
      script.onerror = () => {
        cleanup();
        reject(new Error("구글 시트 gviz 스크립트 로드 실패"));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * GAS에서 넘어온 원시 시트 목록 검증 및 재그룹화
   */
  function regroupRawSheets(rawSheets) {
    if (!Array.isArray(rawSheets) || rawSheets.length === 0) return null;

    // 1. 이미 복수 팀원으로 분할되어 있고 탭 이름(Main, 시트1 등)이 아닌 경우
    const isGenericTabOnly = rawSheets.length === 1 && (
      rawSheets[0].sheetName === "Main" || rawSheets[0].sheetName === "시트1" || 
      rawSheets[0].sheetName === "Sheet1" || rawSheets[0].sheetName === "timetable"
    );

    if (!isGenericTabOnly && rawSheets.length > 0) {
      return rawSheets.map(s => ({
        sheetName: s.sheetName,
        status: s.status || "draft",
        updatedAt: s.updatedAt || new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        data: (s.data || []).map(item => ({
          ...item,
          sheet_name: item.sheet_name || s.sheetName,
          start_time: formatTimeStr(item.start_time),
          end_time: formatTimeStr(item.end_time),
          category: item.category || guessCategory(item.task, item.summary)
        }))
      }));
    }

    // 2. 단일 시트('Main')로 넘어왔으나 task 내부에 sheet_name 속성이 있는 경우
    const memberMap = {};
    const memberOrder = [];

    rawSheets.forEach(s => {
      (s.data || []).forEach(item => {
        const pName = (item.sheet_name || "").trim();
        if (!pName || pName === "Main" || pName === "시트1" || pName === "Sheet1") return;

        if (!memberMap[pName]) {
          memberMap[pName] = {
            sheetName: pName,
            status: s.status || "draft",
            updatedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
            data: []
          };
          memberOrder.push(pName);
        }

        memberMap[pName].data.push({
          ...item,
          sheet_name: pName,
          start_time: formatTimeStr(item.start_time),
          end_time: formatTimeStr(item.end_time),
          category: item.category || guessCategory(item.task, item.summary)
        });
      });
    });

    if (memberOrder.length > 0) {
      return memberOrder.map(name => memberMap[name]);
    }

    return null; // 분할 실패 -> fetchDirectFromGoogleSheet로 fallback
  }

  /**
   * 원본 timetable 시트에서 데이터 불러오기
   * - 1순위: 원본 시트에서 sheet_name 열 기반 실시간 직접 조회 (가장 빠르고 정확)
   * - 2순위: Google Apps Script Web App 조회
   * - 3순위: 로컬 캐시 / Mock 데이터
   */
  async function fetchSheetsData(timeoutMs = 6000) {
    let sheets = null;
    let fetchError = null;

    // 1단계: 원본 구글 시트에서 sheet_name 열 기반으로 실시간 직접 파싱 (100% 최신 데이터)
    try {
      const directSheets = await fetchDirectFromGoogleSheet();
      if (directSheets && directSheets.length > 0) {
        sheets = directSheets;
      }
    } catch (directErr) {
      console.warn("[SheetsApi] 구글 시트 gviz 직접 파싱 fallback:", directErr);
    }

    // 2단계: 직접 파싱이 실패한 경우 Google Apps Script Web App 호출 시도
    const gasUrl = getGasUrl();
    if ((!sheets || sheets.length === 0) && gasUrl) {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${gasUrl}?action=getSheets`, {
          method: "GET",
          mode: "cors",
          signal: controller.signal
        });
        clearTimeout(timeoutTimer);

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && Array.isArray(resJson.sheets) && resJson.sheets.length > 0) {
            const parsedSheets = regroupRawSheets(resJson.sheets);
            if (parsedSheets && parsedSheets.length > 0) {
              sheets = parsedSheets;
            }
          }
        }
      } catch (err) {
        clearTimeout(timeoutTimer);
        fetchError = err;
      }
    }

    // 3단계: 오프라인 / 네트워크 오류 시 로컬 캐시 / Mock 데이터 사용
    if (!sheets || sheets.length === 0) {
      return {
        source: "local_fallback",
        error: fetchError ? fetchError.message : "오프라인 모드",
        data: getLocalData()
      };
    }

    const fullData = {
      currentDate: new Date().toISOString().split("T")[0],
      sheets: sheets
    };

    saveLocalData(fullData);
    return {
      source: "google",
      data: fullData
    };
  }

  /**
   * 수정 완료된 데이터를 타겟 스프레드시트 (timetable_fixed)에 저장
   * - 모든 팀원의 일정을 단일 시트에 [sheet_name, start_time, end_time, task, summary, etc] 형식으로 전송
   */
  async function saveFixedData(sheetsData) {
    // 1. 로컬 캐시 백업
    const fullState = {
      currentDate: new Date().toISOString().split("T")[0],
      sheets: sheetsData
    };
    saveLocalData(fullState);

    const gasUrl = getGasUrl();
    if (!gasUrl) {
      return {
        success: true,
        source: "local",
        message: "로컬 브라우저에 임시 저장되었습니다. (Google 시트에 실제 반영하려면 [Google 연동 설정]에서 Web App URL을 등록해주세요.)"
      };
    }

    try {
      // Apps Script 웹 앱으로 POST 전송
      const payload = {
        action: "saveFixed",
        sheets: sheetsData.map(s => ({
          sheetName: s.sheetName,
          status: s.status,
          data: s.data.map(item => ({
            sheet_name: s.sheetName,
            start_time: formatTimeStr(item.start_time),
            end_time: formatTimeStr(item.end_time),
            task: item.task || "",
            summary: item.summary || "",
            etc: item.etc || ""
          }))
        }))
      };

      const response = await fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // GAS redirection CORS 친화적 헤더
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || "저장 실패");
      }

      return {
        success: true,
        source: "google",
        message: "구글 스프레드시트(timetable_fixed)의 단일 시트에 모든 팀원의 일정이 성공적으로 동기화되었습니다!",
        details: resJson.details
      };
    } catch (error) {
      console.error("[SheetsApi] 구글 시트 저장 실패:", error);
      throw error;
    }
  }

  /**
   * 빈 timetable 원본 시트에 샘플 데이터 자동 생성 요청
   */
  async function initSampleDataOnSource() {
    const gasUrl = getGasUrl();
    if (!gasUrl) {
      throw new Error("먼저 [Google 연동 설정]에서 Apps Script Web App URL을 등록해주세요.");
    }

    const response = await fetch(`${gasUrl}?action=initSampleData`, {
      method: "GET",
      mode: "cors"
    });

    const resJson = await response.json();
    if (!resJson.success) {
      throw new Error(resJson.error || "샘플 생성 실패");
    }

    return resJson;
  }

  /**
   * 업무명/내용을 분석하여 카테고리 자동 추론
   */
  function guessCategory(task, summary) {
    const text = ((task || "") + " " + (summary || "")).toLowerCase();
    if (text.includes("회의") || text.includes("미팅") || text.includes("스크럼") || text.includes("싱크") || text.includes("공유") || text.includes("소집") || text.includes("연락") || text.includes("보고")) {
      return "meeting";
    }
    if (text.includes("개발") || text.includes("구현") || text.includes("코드") || text.includes("api") || text.includes("인프라") || text.includes("쿼리") || text.includes("시뮬레이션") || text.includes("스크립트") || text.includes("추출") || text.includes("매핑") || text.includes("테스트") || text.includes("패턴")) {
      return "dev";
    }
    if (text.includes("디자인") || text.includes("기획") || text.includes("와이어프레임") || text.includes("figma") || text.includes("ui") || text.includes("레이아웃") || text.includes("패키지") || text.includes("pkg")) {
      return "design";
    }
    if (text.includes("검토") || text.includes("리뷰") || text.includes("점검") || text.includes("피드백") || text.includes("분석") || text.includes("지시") || text.includes("확인") || text.includes("승인") || text.includes("ate") || text.includes("fail") || text.includes("마진")) {
      return "review";
    }
    if (text.includes("식사") || text.includes("점심") || text.includes("휴식") || text.includes("커피") || text.includes("산책") || text.includes("마감") || text.includes("퇴근")) {
      return "break";
    }
    return "etc";
  }

  return {
    getGasUrl,
    setGasUrl,
    isConfigured,
    getLocalData,
    saveLocalData,
    fetchSheetsData,
    saveFixedData,
    initSampleDataOnSource,
    guessCategory,
    formatTimeStr
  };
})();
