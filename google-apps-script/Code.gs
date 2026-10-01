/**
 * ==============================================================================
 * SKHY Timetable Studio - Google Apps Script (GAS) 연동 백엔드
 * ==============================================================================
 * 
 * [스프레드시트 정보]
 * - 원본 timetable ID       : 1rRunNn1fnbEjfLgh7FFwphGVwmdvCQY-Fd1wvmlnzdc
 * - 타겟 timetable_fixed ID : 1ISBLWMZNBjVe7yJU7W8QWNGyhlZIV6qBsKDplee2Xpc
 * 
 * [배포 방법]
 * 1. 스프레드시트 메뉴 > 확장 프로그램 > Apps Script 클릭
 * 2. 이 코드(Code.gs) 전체를 복사하여 붙여넣고 저장(Ctrl+S)
 * 3. 우측 상단 [배포] > [새 배포] 클릭
 * 4. 유형 선택: [웹 앱 (Web app)]
 *    - 설명: skhy timetable api
 *    - 다음 사용자 권한으로 실행: '나(본인 계정)'
 *    - 액세스 권한이 있는 사용자: '모든 사용자(Anyone)' (중요!)
 * 5. [배포] 클릭 후 승인 절차를 완료하고, 생성된 [웹 앱 URL]을 복사하여
 *    웹페이지의 [Google 연동 설정]에 입력하세요.
 */

const SOURCE_SPREADSHEET_ID = "1rRunNn1fnbEjfLgh7FFwphGVwmdvCQY-Fd1wvmlnzdc";
const TARGET_SPREADSHEET_ID = "1ISBLWMZNBjVe7yJU7W8QWNGyhlZIV6qBsKDplee2Xpc";

const COLUMN_HEADERS = ["start_time", "end_time", "task", "summary", "etc"];

/**
 * 스프레드시트가 열릴 때 상단에 커스텀 메뉴 자동 생성
 * 스프레드시트 메뉴에서 바로 [✨ 샘플 데이터 자동 생성]을 실행할 수 있습니다.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📅 시간표 관리")
    .addItem("✨ 샘플 데이터(홍길동/김철수/이영희 시트) 자동 생성", "populateSampleData")
    .addToUi();
}

/**
 * GET 요청 핸들러 (데이터 조회 및 샘플 생성)
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "getSheets";

    if (action === "initSampleData") {
      const initResult = populateSampleData();
      return jsonResponse({
        success: true,
        message: "샘플 데이터가 원본 timetable 시트에 성공적으로 생성되었습니다.",
        data: initResult
      });
    }

    // 기본 액션: getSheets (모든 시트 및 시간표 데이터 조회)
    const sheetsData = readAllSheetsFromSource();
    return jsonResponse({
      success: true,
      sheets: sheetsData
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * POST 요청 핸들러 (수정 완료된 데이터 timetable_fixed에 저장)
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action || "saveFixed";

    if (action === "saveFixed") {
      const sheets = postData.sheets || [];
      const saveResult = saveSheetsToTarget(sheets);
      return jsonResponse({
        success: true,
        message: "timetable_fixed 스프레드시트에 성공적으로 저장되었습니다.",
        details: saveResult,
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({
      success: false,
      error: "알 수 없는 액션: " + action
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * 원본 timetable 스프레드시트의 모든 시트 데이터 읽기 (CacheService 고속 캐싱 적용)
 */
function readAllSheetsFromSource(forceRefresh) {
  const cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    const cached = cache.get("sheets_source_data_v1");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch(e) {}
    }
  }

  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const result = [];

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sheetName = sheet.getName();
    
    // getDataRange()로 단 1번의 API 호출을 통해 전체 데이터 취득 (성능 대폭 향상)
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (!values || values.length < 2) {
      result.push({
        sheetName: sheetName,
        status: "draft",
        data: []
      });
      continue;
    }

    const headers = values[0].map(h => String(h).trim().toLowerCase());
    
    // 컬럼 인덱스 매핑
    const colIndex = {
      start_time: headers.indexOf("start_time"),
      end_time: headers.indexOf("end_time"),
      task: headers.indexOf("task"),
      summary: headers.indexOf("summary"),
      etc: headers.indexOf("etc")
    };

    const rowsData = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      // 비어있는 행 건너뛰기
      if (!row[colIndex.start_time] && !row[colIndex.task]) continue;

      rowsData.push({
        id: "task-" + i + "-" + r,
        start_time: formatTimeValue(row[colIndex.start_time]),
        end_time: formatTimeValue(row[colIndex.end_time]),
        task: String(row[colIndex.task] || ""),
        summary: String(row[colIndex.summary] || ""),
        etc: String(row[colIndex.etc] || "")
      });
    }

    result.push({
      sheetName: sheetName,
      status: "draft",
      data: rowsData
    });
  }

  // 30초간 서버 캐싱하여 연속 요청 시 0.1초 초고속 응답
  try {
    cache.put("sheets_source_data_v1", JSON.stringify(result), 30);
  } catch(e) {}

  return result;
}

/**
 * 타겟 timetable_fixed 스프레드시트에 저장
 */
function saveSheetsToTarget(sheets) {
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const updatedSheets = [];

  for (let i = 0; i < sheets.length; i++) {
    const sheetInfo = sheets[i];
    const sheetName = sheetInfo.sheetName;
    const taskList = sheetInfo.data || [];

    let targetSheet = ss.getSheetByName(sheetName);
    if (!targetSheet) {
      targetSheet = ss.insertSheet(sheetName);
    } else {
      targetSheet.clear(); // 기존 내용 초기화 후 덮어쓰기
    }

    // 헤더 작성
    targetSheet.getRange(1, 1, 1, COLUMN_HEADERS.length).setValues([COLUMN_HEADERS]);
    
    // 헤더 스타일링 (보기 좋게 포맷팅)
    const headerRange = targetSheet.getRange(1, 1, 1, COLUMN_HEADERS.length);
    headerRange.setBackground("#3b82f6");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    targetSheet.setFrozenRows(1);

    // 데이터 행 작성
    if (taskList.length > 0) {
      const rowValues = taskList.map(item => [
        formatTimeValue(item.start_time),
        formatTimeValue(item.end_time),
        item.task || "",
        item.summary || "",
        item.etc || ""
      ]);

      targetSheet.getRange(2, 1, rowValues.length, COLUMN_HEADERS.length).setValues(rowValues);
    }

    // 열 너비 자동 맞춤
    for (let c = 1; c <= COLUMN_HEADERS.length; c++) {
      targetSheet.autoResizeColumn(c);
    }

    updatedSheets.push({
      sheetName: sheetName,
      rowCount: taskList.length,
      status: sheetInfo.status || "completed"
    });
  }

  // 기본 생성된 빈 'Sheet1'이 있고 다른 시트가 존재하면 정리
  const allSheets = ss.getSheets();
  if (allSheets.length > 1) {
    const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("시트1");
    if (defaultSheet && defaultSheet.getLastRow() === 0) {
      try { ss.deleteSheet(defaultSheet); } catch(e) {}
    }
  }

  // 캐시 무효화 (저장 후 즉시 최신 데이터 반영)
  try {
    CacheService.getScriptCache().remove("sheets_source_data_v1");
  } catch(e) {}

  return updatedSheets;
}

/**
 * 빈 timetable 원본 시트에 디버깅용 샘플 데이터 자동 생성
 */
function populateSampleData() {
  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  
  const sampleSheets = [
    {
      name: "홍길동",
      data: [
        ["09:00", "10:00", "팀 주간 스크럼", "주간 업무 진행상황 공유 및 이슈 논의", "대회의실 A / 온오프라인"],
        ["10:00", "11:30", "시간표 UI 컴포넌트 개발", "Tailwind 기반 타임라인 그리드 렌더링 구현", "집중 업무 시간"],
        ["11:30", "12:30", "점심 식사 및 휴식", "팀원들과 식사", "사내 식당"],
        ["12:30", "14:00", "구글 Apps Script API 연동", "doGet/doPost 엔드포인트 및 CORS 검증", "우선순위 높음"],
        ["14:00", "15:30", "외부 파트너사 기술 미팅", "클라우드 인프라 아키텍처 검토 회의", "Google Meet 화상"],
        ["15:30", "18:00", "드래그 앤 드롭 인터랙션 구현", "시간 블록 리사이징 및 위치 이동 핸들러 작업", "테스트 코드 포함"]
      ]
    },
    {
      name: "김철수",
      data: [
        ["09:30", "10:30", "팀 주간 스크럼", "주간 업무 공유", "대회의실 A"],
        ["10:30", "12:00", "데이터베이스 스키마 설계", "timetable_fixed 동기화 테이블 최적화", "ERD 작성"],
        ["12:00", "13:00", "점심 식사", "개인 일정", "외부 식당"],
        ["13:00", "15:00", "코드 리뷰 및 리팩토링", "PR #14 피드백 반영 및 단위 테스트 실행", "GitHub"],
        ["15:00", "17:00", "스프레드시트 권한 보안 점검", "OAuth 및 API Key 유효성 검사", "보안팀 협업"],
        ["17:00", "18:30", "일일 회고 및 내일 계획", "스프린트 백로그 정리", "지라(Jira) 갱신"]
      ]
    },
    {
      name: "이영희",
      data: [
        ["09:00", "10:00", "팀 주간 스크럼", "팀원 주간 업무 싱크", "대회의실 A"],
        ["10:00", "12:30", "UI/UX 대시보드 와이어프레임", "대형 날짜 배너 및 개인별 완료 상태 뱃지 디자인", "Figma 작업"],
        ["12:30", "13:30", "점심 식사", "휴식", "카페"],
        ["13:30", "16:00", "반응형 모바일 뷰 최적화", "화면 크기별 타임라인 스케일링 테스트", "디바이스 테스트"],
        ["16:00", "17:30", "사용자 테스트(UT) 진행", "사내 프로토타입 시연 및 피드백 수집", "피드백 문서화"],
        ["17:30", "18:00", "디자인 시스템 가이드 정리", "컬러 팔레트 및 아이콘 에셋 내보내기", "디자인 핸드오프"]
      ]
    }
  ];

  for (let s = 0; s < sampleSheets.length; s++) {
    const sInfo = sampleSheets[s];
    let sheet = ss.getSheetByName(sInfo.name);
    if (!sheet) {
      sheet = ss.insertSheet(sInfo.name);
    } else {
      sheet.clear();
    }

    // 헤더 추가
    sheet.getRange(1, 1, 1, COLUMN_HEADERS.length).setValues([COLUMN_HEADERS]);
    const headerRange = sheet.getRange(1, 1, 1, COLUMN_HEADERS.length);
    headerRange.setBackground("#3b82f6");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);

    // 데이터 추가
    sheet.getRange(2, 1, sInfo.data.length, COLUMN_HEADERS.length).setValues(sInfo.data);

    for (let c = 1; c <= COLUMN_HEADERS.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }

  // 기존 빈 Sheet1 삭제
  const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("시트1");
  if (defaultSheet && ss.getSheets().length > sampleSheets.length) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  return { createdSheets: sampleSheets.map(s => s.name) };
}

/**
 * 시간 포맷 통일 유틸리티 (09:00 형식으로 변환)
 */
function formatTimeValue(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const hours = String(val.getHours()).padStart(2, "0");
    const minutes = String(val.getMinutes()).padStart(2, "0");
    return hours + ":" + minutes;
  }
  const str = String(val).trim();
  // 정규식: "9:00", "09:00", "09:00:00" 등
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const h = match[1].padStart(2, "0");
    const m = match[2];
    return h + ":" + m;
  }
  return str;
}

/**
 * JSON 응답 생성 유틸리티
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
