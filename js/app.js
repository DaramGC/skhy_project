/**
 * SKHY Timetable Studio - Main Application Controller (Clean SK Careers Light Edition)
 */

(function () {
  // 전역 상태
  const state = {
    currentDate: "2026-10-01",
    sheets: [],
    activeSheetIndex: 0,
    viewMode: "grid", // 'grid' | 'table'
    isLoading: false,
    editingTask: null, // 모달에서 편집 중인 Task
    editingTaskIndex: -1
  };

  // DOM 요소 캐시
  const elements = {
    // 날짜 & 실시간 시계
    dateTitle: document.getElementById("dateTitle"),
    dayOfWeekBadge: document.getElementById("dayOfWeekBadge"),
    liveClockDisplay: document.getElementById("liveClockDisplay"),

    // 탭 & 통계
    sheetTabs: document.getElementById("sheetTabs"),
    addSheetBtn: document.getElementById("addSheetBtn"),
    activePersonName: document.getElementById("activePersonName"),
    personStatusBadge: document.getElementById("personStatusBadge"),
    toggleCompleteBtn: document.getElementById("toggleCompleteBtn"),
    statTaskCount: document.getElementById("statTaskCount"),
    statTotalHours: document.getElementById("statTotalHours"),
    statOverallProgress: document.getElementById("statOverallProgress"),

    // 뷰 & 컨테이너
    timetableContainer: document.getElementById("timetableContainer"),
    tableViewContainer: document.getElementById("tableViewContainer"),
    tableTbody: document.getElementById("tableTbody"),
    viewGridBtn: document.getElementById("viewGridBtn"),
    viewTableBtn: document.getElementById("viewTableBtn"),

    // 상단 액션 버튼
    saveFixedBtn: document.getElementById("saveFixedBtn"),
    refreshDataBtn: document.getElementById("refreshDataBtn"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),
    addNewTaskBtn: document.getElementById("addNewTaskBtn"),
    connectionBadge: document.getElementById("connectionBadge"),

    // 모달들
    taskModal: document.getElementById("taskModal"),
    taskModalTitle: document.getElementById("taskModalTitle"),
    taskForm: document.getElementById("taskForm"),
    taskIdInput: document.getElementById("taskIdInput"),
    startTimeInput: document.getElementById("startTimeInput"),
    endTimeInput: document.getElementById("endTimeInput"),
    taskNameInput: document.getElementById("taskNameInput"),
    summaryInput: document.getElementById("summaryInput"),
    etcInput: document.getElementById("etcInput"),
    categorySelect: document.getElementById("categorySelect"),
    deleteTaskBtn: document.getElementById("deleteTaskBtn"),
    closeTaskModalBtn: document.getElementById("closeTaskModalBtn"),

    // 설정 모달
    settingsModal: document.getElementById("settingsModal"),
    gasUrlInput: document.getElementById("gasUrlInput"),
    saveSettingsBtn: document.getElementById("saveSettingsBtn"),
    closeSettingsModalBtn: document.getElementById("closeSettingsModalBtn"),
    initSampleBtn: document.getElementById("initSampleBtn"),
    resetLocalMockBtn: document.getElementById("resetLocalMockBtn"),

    // 저장 확인 모달
    saveConfirmModal: document.getElementById("saveConfirmModal"),
    saveConfirmSummary: document.getElementById("saveConfirmSummary"),
    confirmSaveBtn: document.getElementById("confirmSaveBtn"),
    cancelSaveBtn: document.getElementById("cancelSaveBtn"),

    // 토스트 알림 컨테이너
    toastContainer: document.getElementById("toastContainer")
  };

  /**
   * 애플리케이션 초기화
   */
  async function init() {
    setupEventListeners();
    startLiveClock();
    updateConnectionBadge();

    // 타임테이블 엔진 초기화
    TimetableGrid.init(elements.timetableContainer, {
      onTaskClick: handleTaskClick,
      onTaskChange: handleTaskChangeFromGrid,
      onGridSlotClick: handleGridSlotClick
    });

    // 데이터 로드
    await loadInitialData();
  }

  /**
   * 실시간 디지털 시계 시작 (1초 주기 업데이트)
   */
  function startLiveClock() {
    function updateClock() {
      if (!elements.liveClockDisplay) return;
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      elements.liveClockDisplay.textContent = `${h}:${m}:${s} KST`;
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  /**
   * 이벤트 리스너 등록
   */
  function setupEventListeners() {
    // 뷰 모드 전환
    elements.viewGridBtn.addEventListener("click", () => switchViewMode("grid"));
    elements.viewTableBtn.addEventListener("click", () => switchViewMode("table"));

    // 개인별 완료 상태 토글 버튼 (확정 시 timetable_fixed 즉시 동기화)
    elements.toggleCompleteBtn.addEventListener("click", toggleActiveSheetStatus);

    // 일정 추가 버튼
    elements.addNewTaskBtn.addEventListener("click", () => openTaskModal());

    // 저장 / 새로고침 / 설정 모달
    elements.saveFixedBtn.addEventListener("click", openSaveConfirmModal);
    elements.refreshDataBtn.addEventListener("click", refreshData);
    elements.openSettingsBtn.addEventListener("click", openSettingsModal);

    // 시트 추가 버튼
    elements.addSheetBtn.addEventListener("click", promptAddNewSheet);

    // Task 모달 이벤트
    elements.closeTaskModalBtn.addEventListener("click", closeTaskModal);
    elements.taskForm.addEventListener("submit", handleTaskFormSubmit);
    elements.deleteTaskBtn.addEventListener("click", handleDeleteTask);

    // 설정 모달 이벤트
    elements.closeSettingsModalBtn.addEventListener("click", closeSettingsModal);
    elements.saveSettingsBtn.addEventListener("click", handleSaveSettings);
    elements.initSampleBtn.addEventListener("click", handleInitSampleData);
    elements.resetLocalMockBtn.addEventListener("click", handleResetLocalMock);

    // 저장 확인 모달 이벤트
    elements.cancelSaveBtn.addEventListener("click", () => elements.saveConfirmModal.classList.add("hidden"));
    elements.confirmSaveBtn.addEventListener("click", executeSaveToFixed);

    // ESC 키로 모달 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeTaskModal();
        closeSettingsModal();
        elements.saveConfirmModal.classList.add("hidden");
      }
    });
  }

  /**
   * 스켈레톤 로딩 UI 렌더링 (클린 쉬머 효과)
   */
  function renderSkeletonLoading() {
    // 1. 탭 스켈레톤
    elements.sheetTabs.innerHTML = `
      <div class="h-10 w-28 rounded-xl skeleton-shimmer border border-slate-200"></div>
      <div class="h-10 w-28 rounded-xl skeleton-shimmer border border-slate-200"></div>
      <div class="h-10 w-28 rounded-xl skeleton-shimmer border border-slate-200"></div>
    `;

    // 2. 메인 시간표 스켈레톤
    elements.timetableContainer.innerHTML = `
      <div class="w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="h-6 w-48 rounded-lg skeleton-shimmer"></div>
          <div class="h-6 w-32 rounded-lg skeleton-shimmer"></div>
        </div>
        <div class="space-y-4 py-2">
          <div class="h-24 w-full rounded-2xl skeleton-shimmer border border-slate-100 flex items-center px-6">
            <div class="h-4 w-1/3 bg-slate-200/80 rounded-md"></div>
          </div>
          <div class="h-32 w-full rounded-2xl skeleton-shimmer border border-slate-100 flex items-center px-6">
            <div class="h-4 w-1/2 bg-slate-200/80 rounded-md"></div>
          </div>
          <div class="h-24 w-full rounded-2xl skeleton-shimmer border border-slate-100 flex items-center px-6">
            <div class="h-4 w-2/5 bg-slate-200/80 rounded-md"></div>
          </div>
        </div>
        <div class="text-center py-2 text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
          <svg class="w-4 h-4 text-[#EA0029] animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span class="text-slate-600 font-medium">Google 스프레드시트 실시간 데이터를 안전하게 동기화하고 있습니다...</span>
        </div>
      </div>
    `;
  }

  /**
   * 초기 데이터 불러오기 (SWR - Stale While Revalidate 캐시 즉시 렌더링 전략)
   */
  async function loadInitialData(isManualRefresh = false) {
    // 1. 로컬 캐시 확인 (0ms 즉시 화면 표출)
    const local = SheetsApi.getLocalData();
    const hasValidCache = local && local.sheets && local.sheets.length > 0;

    if (hasValidCache && !isManualRefresh) {
      state.sheets = local.sheets;
      state.currentDate = local.currentDate || "2026-10-01";
      state.activeSheetIndex = 0;
      renderAll(); // 캐시 데이터로 즉각 렌더링 (체감 대기시간 0초!)

      // 상단 뱃지에 백그라운드 동기화 중 표시
      elements.connectionBadge.className = "ml-1 sm:ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-[#EA0029] border border-rose-200 shadow-2xs";
      elements.connectionBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-[#EA0029] animate-ping"></span> 시트 동기화 중...`;
    } else {
      renderSkeletonLoading();
      showLoading(true);
    }

    try {
      // 2. 백그라운드에서 최신 Google Sheet 데이터 조회
      const res = await SheetsApi.fetchSheetsData();
      state.sheets = res.data.sheets || [];
      state.currentDate = res.data.currentDate || "2026-10-01";
      
      if (state.activeSheetIndex >= state.sheets.length) {
        state.activeSheetIndex = 0;
      }

      renderAll();
      updateConnectionBadge();

      if (isManualRefresh) {
        showToast("구글 스프레드시트에서 최신 데이터를 새로고침했습니다.", "success", 2500);
      }
    } catch (e) {
      console.error(e);
      updateConnectionBadge();
      if (!hasValidCache) {
        showToast("데이터 로드 중 오류가 발생했습니다: " + e.message, "error");
      }
    } finally {
      showLoading(false);
    }
  }

  /**
   * 원본 데이터 다시 새로고침
   */
  async function refreshData() {
    if (confirm("원본 timetable 구글 스프레드시트에서 데이터를 다시 불러오시겠습니까?")) {
      await loadInitialData(true);
    }
  }

  /**
   * UI 전체 다시 그리기
   */
  function renderAll() {
    renderDateHeader();
    renderSheetTabs();
    renderActiveSheetHeader();
    renderStatistics();

    const activeSheet = getActiveSheet();
    if (!activeSheet) return;

    if (state.viewMode === "grid") {
      elements.timetableContainer.classList.remove("hidden");
      elements.tableViewContainer.classList.add("hidden");
      TimetableGrid.render(activeSheet.data, activeSheet.status === "completed");
    } else {
      elements.timetableContainer.classList.add("hidden");
      elements.tableViewContainer.classList.remove("hidden");
      renderTableView(activeSheet);
    }
  }

  /**
   * 상단 대형 날짜 헤더 렌더링 (SK Careers 포맷)
   */
  function renderDateHeader() {
    const curDate = new Date(state.currentDate);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, "0");
    const d = String(curDate.getDate()).padStart(2, "0");
    const dayIdx = curDate.getDay();

    elements.dateTitle.textContent = `${y}. ${m}. ${d}`;
    elements.dayOfWeekBadge.textContent = `${days[dayIdx]}요일 (TODAY)`;
  }

  /**
   * 상단 시트/개인 탭 바 렌더링 (클린 화이트 에디션)
   */
  function renderSheetTabs() {
    elements.sheetTabs.innerHTML = "";

    state.sheets.forEach((sheet, index) => {
      const isActive = index === state.activeSheetIndex;
      const isCompleted = sheet.status === "completed";

      const tab = document.createElement("button");
      tab.className = `group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
        isActive
          ? "bg-white text-[#EA0029] shadow-xs border border-slate-200/90 ring-2 ring-[#EA0029]/20 font-bold"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent"
      }`;

      // 상태 아이콘 & 뱃지
      const statusIcon = isCompleted
        ? `<span class="flex h-2 w-2 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>`
        : `<span class="h-2 w-2 rounded-full bg-[#EA0029]"></span>`;

      const taskCount = (sheet.data || []).length;

      tab.innerHTML = `
        <div class="flex items-center gap-1.5">
          ${statusIcon}
          <span class="truncate max-w-[130px]">👤 ${escapeHtml(sheet.sheetName)}</span>
        </div>
        <span class="px-1.5 py-0.2 rounded-md text-[11px] font-mono-code ${
          isActive ? "bg-rose-50 text-[#EA0029] font-bold" : "bg-slate-100 text-slate-500"
        }">${taskCount}</span>
      `;

      tab.addEventListener("click", () => {
        state.activeSheetIndex = index;
        renderAll();
      });

      elements.sheetTabs.appendChild(tab);
    });
  }

  /**
   * 현재 활성 개인 대시보드 헤더 렌더링 (SK Careers 클린 스타일)
   */
  function renderActiveSheetHeader() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    elements.activePersonName.textContent = sheet.sheetName;
    const isCompleted = sheet.status === "completed";

    if (isCompleted) {
      elements.personStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs";
      elements.personStatusBadge.innerHTML = `
        <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
        <span>확정 완료</span>
      `;

      elements.toggleCompleteBtn.className = "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200";
      elements.toggleCompleteBtn.innerHTML = `
        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        <span>다시 수정하기</span>
      `;
    } else {
      elements.personStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#EA0029] border border-rose-200 shadow-2xs";
      elements.personStatusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-[#EA0029] animate-pulse"></span>
        <span>수정 진행 중 (Draft)</span>
      `;

      elements.toggleCompleteBtn.className = "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#EA0029] to-[#FF6A00] hover:from-[#D00024] hover:to-[#E65F00] shadow-md shadow-[#EA0029]/25 hover:shadow-lg hover:shadow-[#EA0029]/35 transition-all transform hover:-translate-y-0.5";
      elements.toggleCompleteBtn.innerHTML = `
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
        <span>${escapeHtml(sheet.sheetName)} 님 일정 확정</span>
      `;
    }
  }

  /**
   * 상단 통계 수치 렌더링
   */
  function renderStatistics() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    const tasks = sheet.data || [];
    elements.statTaskCount.textContent = `${tasks.length}개`;

    // 총 소요 시간 계산
    let totalM = 0;
    tasks.forEach(t => {
      const s = TimetableGrid.timeToMinutes(t.start_time);
      const e = TimetableGrid.timeToMinutes(t.end_time);
      if (e > s) totalM += (e - s);
    });

    const hours = Math.floor(totalM / 60);
    const mins = totalM % 60;
    elements.statTotalHours.textContent = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;

    // 전체 인원 완료 현황
    const totalSheets = state.sheets.length;
    const completedSheets = state.sheets.filter(s => s.status === "completed").length;
    elements.statOverallProgress.textContent = `${completedSheets} / ${totalSheets}명 완료`;
  }

  /**
   * 테이블(스프레드시트 형태) 뷰 렌더링 (클린 화이트 스타일)
   */
  function renderTableView(sheet) {
    elements.tableTbody.innerHTML = "";
    const tasks = sheet.data || [];

    if (tasks.length === 0) {
      elements.tableTbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400">등록된 일정이 없습니다. 우측 상단 [+ 새 일정 추가] 버튼을 눌러보세요.</td></tr>`;
      return;
    }

    tasks.forEach((task, idx) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50/80 transition-colors border-b border-slate-100";

      const catConfig = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.etc;

      tr.innerHTML = `
        <td class="py-3.5 px-4 font-mono-code font-bold text-slate-800 text-xs">${task.start_time}</td>
        <td class="py-3.5 px-4 font-mono-code font-bold text-slate-800 text-xs">${task.end_time}</td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-900 text-sm break-keep">${escapeHtml(task.task)}</div>
          <span class="inline-block mt-1 text-[10px] px-2 py-0.5 rounded border ${catConfig.badge}">${catConfig.label}</span>
        </td>
        <td class="py-3.5 px-4 text-xs text-slate-600 max-w-sm break-keep leading-relaxed">${escapeHtml(task.summary || "-")}</td>
        <td class="py-3.5 px-4 text-xs text-slate-500 break-keep">${escapeHtml(task.etc || "-")}</td>
        <td class="py-3.5 px-4 text-right">
          <button class="edit-row-btn px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg mr-1 transition-colors">수정</button>
          <button class="delete-row-btn px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors">삭제</button>
        </td>
      `;

      tr.querySelector(".edit-row-btn").addEventListener("click", () => openTaskModal(task, idx));
      tr.querySelector(".delete-row-btn").addEventListener("click", () => {
        if (confirm(`'${task.task}' 일정을 삭제하시겠습니까?`)) {
          sheet.data.splice(idx, 1);
          SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
          renderAll();
          showToast("일정이 삭제되었습니다.", "info");
        }
      });

      elements.tableTbody.appendChild(tr);
    });
  }

  /**
   * 개인별 수정 완료 상태 토글 & timetable_fixed 즉시 실시간 동기화
   */
  async function toggleActiveSheetStatus() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    if (sheet.status === "completed") {
      sheet.status = "draft";
      SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
      renderAll();
      showToast(`${sheet.sheetName} 님의 시간표를 다시 수정 모드로 전환했습니다.`, "info");
      return;
    }

    // 1. 상태를 '완료(completed)'로 변경 후 로컬 백업
    sheet.status = "completed";
    SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
    renderAll();

    // 2. 버튼 로딩 상태 표시
    elements.toggleCompleteBtn.disabled = true;
    elements.toggleCompleteBtn.innerHTML = `
      <svg class="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      <span>timetable_fixed에 저장 중...</span>
    `;

    // 3. timetable_fixed 스프레드시트에 즉시 전송 & 동기화
    try {
      const res = await SheetsApi.saveFixedData(state.sheets);
      showToast(`✓ ${sheet.sheetName} 님의 일정이 확정되어 timetable_fixed 구글 시트에 반영되었습니다!`, "success", 4500);
    } catch (e) {
      console.error(e);
      showToast(`timetable_fixed 자동 저장 실패: ${e.message}`, "error", 4500);
    } finally {
      elements.toggleCompleteBtn.disabled = false;
      renderAll();
    }
  }

  /**
   * 타임테이블 블록 클릭 시 모달 열기
   */
  function handleTaskClick(task) {
    const sheet = getActiveSheet();
    const idx = (sheet.data || []).findIndex(t => t.id === task.id);
    openTaskModal(task, idx);
  }

  /**
   * 타임테이블 드래그/리사이징 변경 발생 시 데이터 업데이트
   */
  function handleTaskChangeFromGrid(updatedTask) {
    const sheet = getActiveSheet();
    const taskIndex = (sheet.data || []).findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
      sheet.data[taskIndex] = {
        ...sheet.data[taskIndex],
        start_time: updatedTask.start_time,
        end_time: updatedTask.end_time
      };

      // 수정 중 상태로 전환 (완료 상태였더라도 수정이 발생하면 재검토 필요)
      if (sheet.status === "completed") {
        sheet.status = "draft";
      }

      SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
      renderAll();
      showToast(`시간 변경: ${updatedTask.start_time} ~ ${updatedTask.end_time}`, "info", 1800);
    }
  }

  /**
   * 빈 그리드 슬롯 클릭 시 신규 일정 모달 열기
   */
  function handleGridSlotClick(slotInfo) {
    openTaskModal({
      id: "task-" + Date.now(),
      start_time: slotInfo.start_time,
      end_time: slotInfo.end_time,
      task: "",
      summary: "",
      etc: "",
      category: "dev"
    }, -1);
  }

  /**
   * Task 편집/생성 모달 열기
   */
  function openTaskModal(task = null, index = -1) {
    state.editingTask = task;
    state.editingTaskIndex = index;

    if (task && index !== -1) {
      elements.taskModalTitle.textContent = "일정 상세 수정";
      elements.taskIdInput.value = task.id || "";
      elements.startTimeInput.value = task.start_time || "09:00";
      elements.endTimeInput.value = task.end_time || "10:00";
      elements.taskNameInput.value = task.task || "";
      elements.summaryInput.value = task.summary || "";
      elements.etcInput.value = task.etc || "";
      elements.categorySelect.value = task.category || "dev";
      elements.deleteTaskBtn.classList.remove("hidden");
    } else {
      elements.taskModalTitle.textContent = "새 일정 등록";
      elements.taskIdInput.value = (task && task.id) || ("task-" + Date.now());
      elements.startTimeInput.value = (task && task.start_time) || "09:00";
      elements.endTimeInput.value = (task && task.end_time) || "10:30";
      elements.taskNameInput.value = (task && task.task) || "";
      elements.summaryInput.value = (task && task.summary) || "";
      elements.etcInput.value = (task && task.etc) || "";
      elements.categorySelect.value = (task && task.category) || "dev";
      elements.deleteTaskBtn.classList.add("hidden");
    }

    elements.taskModal.classList.remove("hidden");
    elements.taskNameInput.focus();
  }

  function closeTaskModal() {
    elements.taskModal.classList.add("hidden");
    state.editingTask = null;
    state.editingTaskIndex = -1;
  }

  /**
   * Task 폼 제출 (저장)
   */
  function handleTaskFormSubmit(e) {
    e.preventDefault();
    const sheet = getActiveSheet();
    if (!sheet) return;

    const newTask = {
      id: elements.taskIdInput.value || ("task-" + Date.now()),
      start_time: elements.startTimeInput.value,
      end_time: elements.endTimeInput.value,
      task: elements.taskNameInput.value.trim(),
      summary: elements.summaryInput.value.trim(),
      etc: elements.etcInput.value.trim(),
      category: elements.categorySelect.value
    };

    if (!newTask.task) {
      alert("일정 명칭(Task)을 입력해주세요.");
      return;
    }

    if (state.editingTaskIndex >= 0) {
      sheet.data[state.editingTaskIndex] = newTask;
      showToast("일정이 수정되었습니다.", "success");
    } else {
      sheet.data.push(newTask);
      showToast("새 일정이 추가되었습니다.", "success");
    }

    closeTaskModal();
    SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
    renderAll();
  }

  /**
   * Task 삭제
   */
  function handleDeleteTask() {
    const sheet = getActiveSheet();
    if (!sheet || state.editingTaskIndex < 0) return;

    if (confirm("이 일정을 정말 삭제하시겠습니까?")) {
      sheet.data.splice(state.editingTaskIndex, 1);
      closeTaskModal();
      SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
      renderAll();
      showToast("일정이 삭제되었습니다.", "info");
    }
  }

  /**
   * 신규 시트(개인) 추가
   */
  function promptAddNewSheet() {
    const name = prompt("새로 추가할 개인 또는 시트 이름을 입력하세요 (예: 박지민):");
    if (!name || !name.trim()) return;

    const trimmed = name.trim();
    if (state.sheets.some(s => s.sheetName === trimmed)) {
      alert("이미 동일한 이름의 시트가 존재합니다.");
      return;
    }

    state.sheets.push({
      sheetName: trimmed,
      status: "draft",
      data: []
    });

    state.activeSheetIndex = state.sheets.length - 1;
    SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
    renderAll();
    showToast(`'${trimmed}' 시트가 새로 생성되었습니다.`, "success");
  }

  /**
   * 저장 확인 모달 열기
   */
  function openSaveConfirmModal() {
    const summaryList = state.sheets.map(s => {
      const isComp = s.status === "completed";
      const count = (s.data || []).length;
      return `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 text-sm">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${isComp ? 'bg-emerald-500' : 'bg-[#EA0029]'}"></span>
            <span class="font-bold text-slate-800">${escapeHtml(s.sheetName)}</span>
          </div>
          <div class="flex items-center gap-3 text-xs">
            <span class="text-slate-500 font-mono-code">${count}개 일정</span>
            <span class="px-2 py-0.5 rounded font-semibold ${isComp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-[#EA0029]'}">
              ${isComp ? '확정 완료' : '수정 중'}
            </span>
          </div>
        </div>
      `;
    }).join("");

    elements.saveConfirmSummary.innerHTML = summaryList;
    elements.saveConfirmModal.classList.remove("hidden");
  }

  /**
   * timetable_fixed로 실제 저장 실행
   */
  async function executeSaveToFixed() {
    elements.saveConfirmModal.classList.add("hidden");
    showLoading(true);

    try {
      const result = await SheetsApi.saveFixedData(state.sheets);
      showToast(result.message, "success", 4000);
    } catch (e) {
      console.error(e);
      showToast("구글 시트 저장 실패: " + e.message, "error", 5000);
    } finally {
      showLoading(false);
    }
  }

  /**
   * 설정 모달 관리
   */
  function openSettingsModal() {
    elements.gasUrlInput.value = SheetsApi.getGasUrl();
    elements.settingsModal.classList.remove("hidden");
  }

  function closeSettingsModal() {
    elements.settingsModal.classList.add("hidden");
  }

  function handleSaveSettings() {
    const url = elements.gasUrlInput.value.trim();
    SheetsApi.setGasUrl(url);
    updateConnectionBadge();
    closeSettingsModal();
    showToast("연동 설정이 저장되었습니다.", "success");
    if (url) {
      loadInitialData();
    }
  }

  async function handleInitSampleData() {
    if (!SheetsApi.isConfigured()) {
      alert("먼저 Apps Script Web App URL을 등록해주세요.");
      return;
    }
    if (confirm("원본 timetable 시트에 샘플 시트 및 데이터를 생성하시겠습니까?")) {
      showLoading(true);
      try {
        const res = await SheetsApi.initSampleDataOnSource();
        showToast("구글 시트에 샘플 데이터가 성공적으로 생성되었습니다!", "success");
        closeSettingsModal();
        await loadInitialData();
      } catch (e) {
        showToast("샘플 생성 실패: " + e.message, "error");
      } finally {
        showLoading(false);
      }
    }
  }

  function handleResetLocalMock() {
    if (confirm("로컬 캐시를 초기 Mock 데이터 상태로 리셋하시겠습니까?")) {
      localStorage.removeItem("skhy_timetable_cache_v1");
      closeSettingsModal();
      loadInitialData();
      showToast("초기 Mock 데이터로 복원되었습니다.", "info");
    }
  }

  function switchViewMode(mode) {
    state.viewMode = mode;
    if (mode === "grid") {
      elements.viewGridBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#EA0029] shadow-2xs border border-slate-200";
      elements.viewTableBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800";
    } else {
      elements.viewGridBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800";
      elements.viewTableBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#EA0029] shadow-2xs border border-slate-200";
    }
    renderAll();
  }

  function updateConnectionBadge() {
    if (SheetsApi.isConfigured()) {
      elements.connectionBadge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs";
      elements.connectionBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Google 시트 연결됨`;
    } else {
      elements.connectionBadge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs";
      elements.connectionBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span> Mock / 오프라인 모드`;
    }
  }

  function getActiveSheet() {
    if (!state.sheets || state.sheets.length === 0) return null;
    return state.sheets[state.activeSheetIndex] || state.sheets[0];
  }

  function showLoading(show) {
    state.isLoading = show;
    if (elements.refreshDataBtn) {
      if (show) {
        elements.refreshDataBtn.classList.add("animate-spin");
      } else {
        elements.refreshDataBtn.classList.remove("animate-spin");
      }
    }
  }

  /**
   * 토스트 알림 표시 (Clean Light Toast)
   */
  function showToast(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    const bgMap = {
      success: "bg-slate-900 text-white border-slate-800 shadow-lg",
      error: "bg-rose-900 text-white border-rose-800 shadow-lg",
      info: "bg-slate-900 text-white border-slate-800 shadow-lg"
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-300 transform translate-y-2 opacity-0 ${bgMap[type] || bgMap.info}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    elements.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-2", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 앱 기동
  document.addEventListener("DOMContentLoaded", init);
})();
