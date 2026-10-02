/**
 * ==============================================================================
 * SKHY Timetable Studio - Google Apps Script (GAS) 연동 백엔드
 * ==============================================================================
 * 
 * [스프레드시트 정보]
 * - 원본 timetable ID       : 1rRunNn1fnbEjfLgh7FFwphGVwmdvCQY-Fd1wvmlnzdc
 * - 타겟 timetable_fixed ID : 1ISBLWMZNBjVe7yJU7W8QWNGyhlZIV6qBsKDplee2Xpc
 * 
 * [데이터 포맷 변경점]
 * - 기존: 시트 이름별로 개인의 스케줄 관리
 * - 변경: 단일 시트에 모든 사람의 일정을 기록하며, 'sheet_name' 열에 개인 이름이 들어감
 * - 컬럼 구성: [sheet_name, start_time, end_time, task, summary, etc]
 * - 저장 시: timetable_fixed 스프레드시트의 단일 시트에 모든 팀원의 일정을 동일 포맷으로 저장
 * 
 * [배포 방법]
 * 1. 스프레드시트 메뉴 > 확장 프로그램 > Apps Script 클릭
 * 2. 이 코드(Code.gs) 전체를 복사하여 붙여넣고 저장(Ctrl+S)
 * 3. 우측 상단 [배포] > [새 배포] 클릭
 * 4. 유형 선택: [웹 앱 (Web app)]
 *    - 설명: skhy timetable api (sheet_name 통합 포맷)
 *    - 다음 사용자 권한으로 실행: '나(본인 계정)'
 *    - 액세스 권한이 있는 사용자: '모든 사용자(Anyone)' (중요!)
 * 5. [배포] 클릭 후 승인 절차를 완료하고, 생성된 [웹 앱 URL]을 복사하여
 *    웹페이지의 [Google 연동 설정]에 입력하세요.
 */

const SOURCE_SPREADSHEET_ID = "1rRunNn1fnbEjfLgh7FFwphGVwmdvCQY-Fd1wvmlnzdc";
const TARGET_SPREADSHEET_ID = "1ISBLWMZNBjVe7yJU7W8QWNGyhlZIV6qBsKDplee2Xpc";

const COLUMN_HEADERS = ["sheet_name", "start_time", "end_time", "task", "summary", "etc"];

/**
 * 스프레드시트가 열릴 때 상단에 커스텀 메뉴 자동 생성
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📅 시간표 관리")
    .addItem("✨ 샘플 데이터(A_담당/B_팀장/C_파트장 통합 시트) 자동 생성", "populateSampleData")
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

    // 기본 액션: getSheets (모든 팀원 및 시간표 데이터 조회)
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
 * POST 요청 핸들러 (수정 완료된 데이터 timetable_fixed에 단일 시트로 저장)
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
 * 원본 timetable 스프레드시트의 데이터 읽기
 * - sheet_name 열이 있는 경우: 해당 열의 개인별 이름으로 그룹화하여 반환
 * - sheet_name 열이 없는 레거시 시트의 경우: 탭 이름으로 그룹화하여 하위 호환성 유지
 */
function readAllSheetsFromSource(forceRefresh) {
  const cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    const cached = cache.get("sheets_source_data_v2");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch(e) {}
    }
  }

  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const memberMap = {}; // personName -> { sheetName, status, data }
  const memberOrder = [];

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const fallbackSheetName = sheet.getName();
    
    // getDataRange()로 단 1번의 호출로 전체 데이터 취득
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (!values || values.length < 2) continue;

    const headers = values[0].map(h => String(h).trim().toLowerCase());
    
    // 컬럼 인덱스 매핑 (sheet_name 열 지원)
    const colIndex = {
      sheet_name: headers.indexOf("sheet_name"),
      start_time: headers.indexOf("start_time"),
      end_time: headers.indexOf("end_time"),
      task: headers.indexOf("task"),
      summary: headers.indexOf("summary"),
      etc: headers.indexOf("etc")
    };

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      // 비어있는 행 건너뛰기
      if (!row[colIndex.start_time] && !row[colIndex.task]) continue;

      // sheet_name 컬럼이 존재하면 해당 열의 값(개인 이름) 사용, 없으면 시트 탭 이름
      let personName = fallbackSheetName;
      if (colIndex.sheet_name !== -1 && row[colIndex.sheet_name]) {
        const val = String(row[colIndex.sheet_name]).trim();
        if (val) personName = val;
      }

      if (!memberMap[personName]) {
        memberMap[personName] = {
          sheetName: personName,
          status: "draft",
          data: []
        };
        memberOrder.push(personName);
      }

      memberMap[personName].data.push({
        id: "task-" + personName + "-" + r,
        sheet_name: personName,
        start_time: formatTimeValue(row[colIndex.start_time]),
        end_time: formatTimeValue(row[colIndex.end_time]),
        task: String(row[colIndex.task] || ""),
        summary: String(row[colIndex.summary] || ""),
        etc: String(row[colIndex.etc] || "")
      });
    }
  }

  const result = memberOrder.map(name => memberMap[name]);

  // 30초간 서버 캐싱
  try {
    cache.put("sheets_source_data_v2", JSON.stringify(result), 30);
  } catch(e) {}

  return result;
}

/**
 * 타겟 timetable_fixed 스프레드시트에 저장
 * - 모든 사람의 일정을 단일 시트 'timetable_fixed'에 저장
 * - 헤더: [sheet_name, start_time, end_time, task, summary, etc]
 */
function saveSheetsToTarget(sheets) {
  const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const TARGET_SHEET_NAME = "timetable_fixed";

  // 단일 시트 준비
  let targetSheet = ss.getSheetByName(TARGET_SHEET_NAME) || ss.getSheets()[0];
  if (!targetSheet) {
    targetSheet = ss.insertSheet(TARGET_SHEET_NAME);
  } else {
    targetSheet.clear(); // 기존 내용 초기화 후 덮어쓰기
  }
  try {
    targetSheet.setName(TARGET_SHEET_NAME);
  } catch(e) {}

  // 헤더 작성: [sheet_name, start_time, end_time, task, summary, etc]
  targetSheet.getRange(1, 1, 1, COLUMN_HEADERS.length).setValues([COLUMN_HEADERS]);
  
  // 헤더 스타일링 (SK Hynix 브랜드 슬레이트/레드 프리미엄 스타일)
  const headerRange = targetSheet.getRange(1, 1, 1, COLUMN_HEADERS.length);
  headerRange.setBackground("#1E293B"); // 슬레이트 다크
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  targetSheet.setFrozenRows(1);

  // 모든 팀원의 일정을 단일 2차원 배열로 수합
  const allRows = [];
  for (let i = 0; i < sheets.length; i++) {
    const sheetInfo = sheets[i];
    const personName = sheetInfo.sheetName;
    const taskList = sheetInfo.data || [];

    for (let j = 0; j < taskList.length; j++) {
      const item = taskList[j];
      allRows.push([
        personName,
        formatTimeValue(item.start_time),
        formatTimeValue(item.end_time),
        item.task || "",
        item.summary || "",
        item.etc || ""
      ]);
    }
  }

  // 데이터 일괄 쓰기
  if (allRows.length > 0) {
    targetSheet.getRange(2, 1, allRows.length, COLUMN_HEADERS.length).setValues(allRows);
  }

  // 열 너비 자동 맞춤
  for (let c = 1; c <= COLUMN_HEADERS.length; c++) {
    targetSheet.autoResizeColumn(c);
  }

  // 레거시 다중 탭 정리 (단일 시트만 유지)
  const allSheets = ss.getSheets();
  if (allSheets.length > 1) {
    for (let s = 0; s < allSheets.length; s++) {
      const sh = allSheets[s];
      if (sh.getSheetId() !== targetSheet.getSheetId()) {
        try { ss.deleteSheet(sh); } catch(err) {}
      }
    }
  }

  // 캐시 무효화 (저장 후 즉시 최신 데이터 반영)
  try {
    CacheService.getScriptCache().remove("sheets_source_data_v2");
  } catch(e) {}

  return {
    targetSheet: targetSheet.getName(),
    totalRows: allRows.length,
    membersCount: sheets.length
  };
}

/**
 * 디버깅 및 테스트용 샘플 데이터 자동 생성
 * - 단일 시트에 sheet_name 열을 포함하여 A_담당, B_팀장, C_파트장의 일정 생성
 */
function populateSampleData() {
  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName("timetable") || ss.getSheets()[0];
  if (!sheet) {
    sheet = ss.insertSheet("timetable");
  } else {
    sheet.clear();
  }

  // 헤더 추가
  sheet.getRange(1, 1, 1, COLUMN_HEADERS.length).setValues([COLUMN_HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, COLUMN_HEADERS.length);
  headerRange.setBackground("#EA0029");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);

  const sampleRows = [
    // A_담당
    ["A_담당", "08:30", "09:15", "이슈 보고/지시", "출하 라인에서 DRAM PKG High-Speed Fail 발생 보고 및 초동 원인 분석 착수 지시.", "messenger; 발신: A 담당 / 수신: 전원(현장 포함); 초동 원인 분석 지시"],
    ["A_담당", "09:15", "10:00", "분석 지시(문서화)", "전분기 유사 패키지(Lot #3890) 이력과 대조하여 3.2Gbps 고속 영역 타이밍 마진 저하 원인 규명 요청.", "mail; 발신: A 담당 / 수신: B 팀장, C 파트장; 분석 대상 및 요청사항 명시"],
    ["A_담당", "10:00", "11:00", "자료 확인 요청", "전분기 유사 랏 데이터와 비교해 기판 레이아웃 또는 공정 변경점 존재 여부 확인 요청.", "messenger; 발신: A 담당 / 수신: B 팀장; 기판 레이아웃·공정 변경점 확인 요청"],
    ["A_담당", "11:00", "13:00", "데이터 분석 요청(ATE)", "ATE 테스터 스캔 결과에서 비트 에러가 특정 Column 주소에 집중되는지 검토 요청.", "messenger; 발신: A 담당 / 수신: C 파트장; ATE 결과 집중도 확인 요청"],
    ["A_담당", "13:00", "14:00", "데이터 수집 요청", "임원진 보고용으로 고온 챔버 테스트 조건별 Fail 빈도 데이터를 확보하도록 지시.", "messenger; 발신: A 담당 / 수신: 전원; 고온 챔버 조건별 Fail 빈도 요청"],
    ["A_담당", "14:00", "15:00", "회의 안건 공유/준비", "오후 종합 대책 회의 안건 공유 및 추가 스트레스 조건 확정 건 통보.", "mail; 발신: A 담당 / 수신: 전원; 회의 안건 및 준비 사항 공유"],
    ["A_담당", "15:00", "16:00", "분석 공유 요청", "본딩 와이어 인덕턴스가 신호 무결성에 미치는 영향 분석 결과 공유 요청.", "messenger; 발신: A 담당 / 수신: D TL, E TL; 분석 결과 공유 요청"],
    ["A_담당", "16:00", "16:50", "분석 검토 요청", "저속 및 고속 패턴 변경에 따른 타이밍 파라미터(tAA, tRCD) 민감도 결과 검토 지시.", "messenger; 발신: A 담당 / 수신: F TL, G TL; 파라미터 민감도 검토 요청"],
    ["A_담당", "16:50", "17:20", "보고/일정 공지", "일일 분석 결과 최종 승인 및 익일 유관부서 합동 회의 소집 계획 통보.", "mail; 발신: A 담당 / 수신: B 팀장 및 전원; 최종 승인 및 익일 일정 공지"],
    ["A_담당", "17:20", "17:50", "보고서 검토/종결", "최종 분석 보고서 초안 검토 완료 및 하루 업무 마무리 안내.", "messenger; 발신: A 담당 / 수신: 전원; 보고서 초안 검토 완료 및 마무리 인사"],
    
    // B_팀장
    ["B_팀장", "08:35", "09:20", "로그 추출·초기 지시", "A 담당 지시 접수 후 ATE 테스터 로그 추출 및 Fail 어드레스 매핑 착수 예정.", "messenger / 발신: B 팀장 → 수신: A 담당, 관련 팀; 지시사항 접수 및 실행 약속"],
    ["B_팀장", "09:20", "10:15", "데이터 분석 (필터링)", "ATE 테스트 로그에서 3.2Gbps 이상 구간의 비트 에러 집중 영역 필터링 요청 수행.", "agent / 시스템 요청 로그; 필터링 조건: ≥3.2Gbps, 비트 에러 영역 추출 지시"],
    ["B_팀장", "10:15", "11:10", "보고·문서작성", "ATE 로그 분석 및 이전 랏 비교 리포트 발송—고속 클럭 스큐 5% 증가 및 패키지 전원단 노이즈 점검 결과 보고.", "mail / 발신: B 팀장 → 수신: A 담당, C 파트장; 정식 리포트 이메일 발송"],
    ["B_팀장", "11:10", "12:00", "검토 요청·협의", "C 파트장에게 패키지 기판 레이아웃의 기생 인덕턴스 시뮬레이션 데이터 검토 요청.", "messenger / 발신: B 팀장 → 수신: C 파트장; 시뮬레이션 데이터 검토 요청"],
    ["B_팀장", "12:00", "13:30", "시뮬레이션 분석 요청", "tAA, tRCD 타이밍 파라미터 스윕 시뮬레이션 데이터에서 마진 산출 요청 접수.", "agent / 시스템 요청; 타이밍 파라미터 스윕 결과 기반 마진 산출 부탁"],
    ["B_팀장", "13:30", "14:20", "검증 지시(테스트)", "주니어 TL들에게 저속 모드(1.6Gbps)에서의 Pass 여부 재검증용 데이터 추출 지시.", "messenger / 발신: B 팀장 → 수신: 주니어 TL들; 저속 모드 재검증 지시"],
    ["B_팀장", "14:20", "15:15", "테스트 실행·통계 집계", "저속 모드(1.6Gbps) 500개 유닛 다이제스트 테스트 스크립트 실행 및 수율 통계 집계 요청.", "agent / 시스템 요청; 테스트 스크립트 실행 및 통계 자동 집계 지시"],
    ["B_팀장", "15:15", "16:30", "데이터 확인·결과보고", "온도 챔버 85도 조건에서의 Fail 빈도 증가 데이터 확인 완료 보고.", "messenger / 발신: B 팀장 → 수신: 관련자(H TL 등); 85°C 조건 데이터 확인 결과 통보"],
    ["B_팀장", "16:30", "17:15", "보고(중간)", "일일 DRAM Fail 분석 중간 보고 전송—고온·고속 복합 조건에서의 타이밍 위반 원인 잠정 도출.", "mail / 발신: B 팀장 → 수신: A 담당; 중간 분석 보고 이메일 발송"],
    ["B_팀장", "17:15", "17:45", "시스템 운영·백업 확인", "퇴근 전 최종 로그 백업 및 서버 업로드 상태 확인 진행.", "messenger / 발신: B 팀장; 서버 로그 백업 및 업로드 상태 점검 (퇴근 절차)"],

    // C_파트장
    ["C_파트장", "08:40", "09:30", "데이터 분석", "테스트 프로그램 v2.4의 스펙 위반 항목 우선 점검을 시작함.", "messenger; 발신: C_파트장; 스펙 위반 항목 우선 확인 요청"],
    ["C_파트장", "09:30", "10:30", "연락", "DRAM Test Program v2.4 관련 주요 규격 파라미터(tDQSQ, tQHS, tAA)에 대한 spec data 요청을 진행함.", "agent; 발신: C_파트장(요청); 수신: 관련 데이터/엔지니어(명시 없음)"],
    ["C_파트장", "10:30", "11:20", "시뮬레이션/분석", "고속 라우팅 구간 패키지 기판 트레이스의 인덕턴스·커패시턴스가 DRAM 고속 동작에 미치는 영향 조사 지시.", "agent; 발신: C_파트장(요청); 수신: SI/PI 분석 담당(명시 없음)"],
    ["C_파트장", "11:20", "12:10", "연락/지시", "D TL 및 E TL에게 패키지 기판 레이아웃 기생 성분(인덕턴스) 시뮬레이션 수행을 지시함.", "messenger; 발신: C_파트장; 수신: D TL, E TL; 지시사항: 인덕턴스 값 시뮬레이션"],
    ["C_파트장", "12:10", "13:40", "보고(이메일)", "패키지 SI/PI 분석 중간 결과를 B 팀장에게 공유하고 전원 노이즈가 타이밍 마진 저하의 주원인으로 추정됨을 보고함.", "mail; 발신: C_파트장; 수신: B 팀장; 특이사항: 중간 공유 보고서"],
    ["C_파트장", "13:40", "14:35", "연락/지시", "오후에 Checkerboard 및 Walking 등 다른 데이터 패턴을 적용해 스트레스 테스트를 추가 진행하도록 지시함.", "messenger; 발신: C_파트장; 수신: 테스트 팀; 지시패턴: Checkerboard, Walking"],
    ["C_파트장", "14:35", "15:30", "테스트", "고속 IO 핀 대상 Walking 1s/0s 테스트 패턴을 적용하고 에러 비트맵 생성을 요청함.", "agent; 발신: 테스트 요청(시스템/엔지니어); 수신: 테스트 실행 담당"],
    ["C_파트장", "15:30", "16:40", "데이터 검토", "신입 TL들이 정리한 Raw Data 스프레드시트 포맷을 검토하기 시작함.", "messenger; 발신: C_파트장; 수신: 신입 TL들; 특이사항: Raw Data 스프레드시트 포맷 검토"],
    ["C_파트장", "16:40", "17:20", "보고(이메일)", "파라미터 민감도 및 패턴별 Fail 특성 분석을 A 담당 및 B 팀장에게 완료보고함.", "mail; 발신: C_파트장; 수신: A 담당, B 팀장; 특이사항: 분석 완료보고"],
    ["C_파트장", "17:20", "18:00", "문서 준비/정리", "내일 회의에 사용될 자료를 최종 취합하고 18시까지 완료하겠다고 보고함.", "messenger; 발신: C_파트장; 수신: 회의 준비 관련 팀; 완료기한: 18:00"]
  ];

  sheet.getRange(2, 1, sampleRows.length, COLUMN_HEADERS.length).setValues(sampleRows);

  for (let c = 1; c <= COLUMN_HEADERS.length; c++) {
    sheet.autoResizeColumn(c);
  }

  return { createdCount: sampleRows.length, members: ["A_담당", "B_팀장", "C_파트장"] };
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
