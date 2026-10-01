/**
 * SKHY Timetable Studio - Google Apps Script & Local Storage API 모듈
 */

const SheetsApi = (function () {
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxd5c5sHok_UUWu-_pLsvQ0VBxSjPdIrM0tqXKoZ5vcgIZcLHNNXTFUdQF34abiynSfvA/exec";
  const GAS_URL_KEY = "skhy_gas_web_app_url";
  const LOCAL_CACHE_KEY = "skhy_timetable_cache_v1";

  /**
   * 저장된 Google Apps Script Web App URL 반환 (미설정 시 기본 배포 URL 반환)
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
   */
  function getLocalData() {
    try {
      const saved = localStorage.getItem(LOCAL_CACHE_KEY);
      if (saved) {
        return JSON.parse(saved);
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
   * 원본 timetable 시트에서 데이터 불러오기
   * (연동 URL이 있으면 구글 시트에서 가져오고, 없거나 오류 발생 시 로컬 캐시/Mock 사용)
   */
  async function fetchSheetsData() {
    const gasUrl = getGasUrl();

    if (!gasUrl) {
      console.info("[SheetsApi] Apps Script URL 미설정 -> 로컬 Mock 데이터를 사용합니다.");
      return {
        source: "local",
        data: getLocalData()
      };
    }

    try {
      const response = await fetch(`${gasUrl}?action=getSheets`, {
        method: "GET",
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || "데이터 불러오기 실패");
      }

      // 구글 시트 데이터 정규화
      const sheets = (resJson.sheets || []).map(s => ({
        sheetName: s.sheetName,
        status: s.status || "draft",
        updatedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        data: (s.data || []).map(item => ({
          ...item,
          category: guessCategory(item.task, item.summary)
        }))
      }));

      const fullData = {
        currentDate: new Date().toISOString().split("T")[0],
        sheets: sheets.length > 0 ? sheets : getLocalData().sheets
      };

      saveLocalData(fullData);
      return {
        source: "google",
        data: fullData
      };
    } catch (error) {
      console.warn("[SheetsApi] 구글 시트 통신 오류 -> 로컬 캐시 데이터를 유지합니다.", error);
      return {
        source: "local_fallback",
        error: error.message,
        data: getLocalData()
      };
    }
  }

  /**
   * 수정 완료된 데이터를 타겟 스프레드시트 (timetable_fixed)에 저장
   */
  async function saveFixedData(sheetsData) {
    // 1. 항상 로컬 캐시에 최신 상태 백업
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
            start_time: item.start_time,
            end_time: item.end_time,
            task: item.task,
            summary: item.summary,
            etc: item.etc
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
        message: "구글 스프레드시트(timetable_fixed)에 모든 시트가 성공적으로 반영되었습니다!",
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
    if (text.includes("회의") || text.includes("미팅") || text.includes("스크럼") || text.includes("싱크")) {
      return "meeting";
    }
    if (text.includes("개발") || text.includes("구현") || text.includes("코드") || text.includes("api") || text.includes("인프라") || text.includes("쿼리")) {
      return "dev";
    }
    if (text.includes("디자인") || text.includes("기획") || text.includes("와이어프레임") || text.includes("figma") || text.includes("ui")) {
      return "design";
    }
    if (text.includes("검토") || text.includes("리뷰") || text.includes("테스트") || text.includes("점검") || text.includes("피드백")) {
      return "review";
    }
    if (text.includes("식사") || text.includes("점심") || text.includes("휴식") || text.includes("커피") || text.includes("산책")) {
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
    guessCategory
  };
})();
