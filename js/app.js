/**
 * SKHY Timetable Studio - Main Application Controller
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
    // 날짜
    dateTitle: document.getElementById("dateTitle"),
    dayOfWeekBadge: document.getElementById("dayOfWeekBadge"),
    prevDayBtn: document.getElementById("prevDayBtn"),
    nextDayBtn: document.getElementById("nextDayBtn"),
    todayBtn: document.getElementById("todayBtn"),
    datePickerInput: document.getElementById("datePickerInput"),

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
   * 이벤트 리스너 등록
   */
  function setupEventListeners() {
    // 날짜 이동
    elements.prevDayBtn.addEventListener("click", () => changeDate(-1));
    elements.nextDayBtn.addEventListener("click", () => changeDate(1));
    elements.todayBtn.addEventListener("click", () => setDate(new Date().toISOString().split("T")[0]));
    elements.datePickerInput.addEventListener("change", (e) => setDate(e.target.value));

    // 뷰 모드 전환
    elements.viewGridBtn.addEventListener("click", () => switchViewMode("grid"));
    elements.viewTableBtn.addEventListener("click", () => switchViewMode("table"));

    // 개인별 완료 상태 토글 버튼
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
   * 초기 데이터 불러오기
   */
  async function loadInitialData() {
    showLoading(true);
    try {
      const res = await SheetsApi.fetchSheetsData();
      state.sheets = res.data.sheets || [];
      state.currentDate = res.data.currentDate || "2026-10-01";
      state.activeSheetIndex = 0;

      if (res.source === "google") {
        showToast("구글 스프레드시트(timetable)에서 데이터를 성공적으로 불러왔습니다.", "success");
      } else {
        showToast("디버깅용 Mock 데이터를 불러왔습니다. 자유롭게 수정해보세요!", "info");
      }

      renderAll();
    } catch (e) {
      console.error(e);
      showToast("데이터 로드 중 오류가 발생했습니다: " + e.message, "error");
    } finally {
      showLoading(false);
    }
  }

  /**
   * 원본 데이터 다시 새로고침
   */
  async function refreshData() {
    if (confirm("원본 스프레드시트에서 데이터를 다시 불러오시겠습니까? 현재 저장되지 않은 로컬 수정사항은 덮어씌워질 수 있습니다.")) {
      await loadInitialData();
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
   * 상단 대형 날짜 헤더 렌더링
   */
  function renderDateHeader() {
    const curDate = new Date(state.currentDate);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, "0");
    const d = String(curDate.getDate()).padStart(2, "0");
    const dayName = days[curDate.getDay()];

    elements.dateTitle.textContent = `${y}년 ${m}월 ${d}일`;
    elements.dayOfWeekBadge.textContent = `${dayName}요일`;
    elements.datePickerInput.value = state.currentDate;

    // 오늘 날짜인지 판별
    const todayStr = new Date().toISOString().split("T")[0];
    if (state.currentDate === todayStr) {
      elements.todayBtn.classList.add("bg-blue-100", "text-blue-700");
    } else {
      elements.todayBtn.classList.remove("bg-blue-100", "text-blue-700");
    }
  }

  /**
   * 상단 시트/개인 탭 바 렌더링
   */
  function renderSheetTabs() {
    elements.sheetTabs.innerHTML = "";

    state.sheets.forEach((sheet, index) => {
      const isActive = index === state.activeSheetIndex;
      const isCompleted = sheet.status === "completed";

      const tab = document.createElement("button");
      tab.className = `group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
        isActive
          ? "bg-white text-blue-600 shadow-sm border border-slate-200/80 ring-2 ring-blue-500/10"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
      }`;

      // 상태 아이콘 & 뱃지
      const statusIcon = isCompleted
        ? `<span class="flex h-2 w-2 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>`
        : `<span class="h-2 w-2 rounded-full bg-amber-400"></span>`;

      const taskCount = (sheet.data || []).length;

      tab.innerHTML = `
        <div class="flex items-center gap-1.5">
          ${statusIcon}
          <span class="truncate max-w-[120px]">👤 ${escapeHtml(sheet.sheetName)}</span>
        </div>
        <span class="px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
          isActive ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
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
   * 현재 활성 개인 대시보드 헤더 렌더링
   */
  function renderActiveSheetHeader() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    elements.activePersonName.textContent = sheet.sheetName;
    const isCompleted = sheet.status === "completed";

    if (isCompleted) {
      elements.personStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300";
      elements.personStatusBadge.innerHTML = `
        <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
        <span>수정 완료 (확정됨)</span>
      `;

      elements.toggleCompleteBtn.className = "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200";
      elements.toggleCompleteBtn.innerHTML = `
        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        <span>다시 수정하기</span>
      `;
    } else {
      elements.personStatusBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300";
      elements.personStatusBadge.innerHTML = `
        <svg class="w-3.5 h-3.5 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        <span>수정 진행 중 (Draft)</span>
      `;

      elements.toggleCompleteBtn.className = "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all";
      elements.toggleCompleteBtn.innerHTML = `
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
        <span>${escapeHtml(sheet.sheetName)} 님 수정 완료 (확정)</span>
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
   * 테이블(스프레드시트 형태) 뷰 렌더링
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
        <td class="py-3 px-4 font-mono font-bold text-slate-700 text-xs">${task.start_time}</td>
        <td class="py-3 px-4 font-mono font-bold text-slate-700 text-xs">${task.end_time}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900 text-sm break-keep">${escapeHtml(task.task)}</div>
          <span class="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded border ${catConfig.badge}">${catConfig.label}</span>
        </td>
        <td class="py-3 px-4 text-xs text-slate-600 max-w-sm break-keep leading-relaxed">${escapeHtml(task.summary || "-")}</td>
        <td class="py-3 px-4 text-xs text-slate-500 break-keep">${escapeHtml(task.etc || "-")}</td>
        <td class="py-3 px-4 text-right">
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
   * 개인별 수정 완료 상태 토글 (완료 <-> 수정 중)
   */
  function toggleActiveSheetStatus() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    if (sheet.status === "completed") {
      sheet.status = "draft";
      showToast(`${sheet.sheetName} 님의 시간표를 다시 수정 모드로 전환했습니다.`, "info");
    } else {
      sheet.status = "completed";
      showToast(`✓ ${sheet.sheetName} 님의 시간표 수정이 완료(확정)되었습니다!`, "success");
    }

    SheetsApi.saveLocalData({ currentDate: state.currentDate, sheets: state.sheets });
    renderAll();
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
            <span class="w-2.5 h-2.5 rounded-full ${isComp ? 'bg-emerald-500' : 'bg-amber-400'}"></span>
            <span class="font-bold text-slate-800">${escapeHtml(s.sheetName)}</span>
          </div>
          <div class="flex items-center gap-3 text-xs">
            <span class="text-slate-500">${count}개 일정</span>
            <span class="px-2 py-0.5 rounded font-semibold ${isComp ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
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

  /**
   * 날짜 변경 유틸리티
   */
  function changeDate(daysOffset) {
    const d = new Date(state.currentDate);
    d.setDate(d.getDate() + daysOffset);
    setDate(d.toISOString().split("T")[0]);
  }

  function setDate(dateStr) {
    state.currentDate = dateStr;
    renderAll();
  }

  function switchViewMode(mode) {
    state.viewMode = mode;
    if (mode === "grid") {
      elements.viewGridBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-600 shadow-sm border border-slate-200";
      elements.viewTableBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800";
    } else {
      elements.viewGridBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800";
      elements.viewTableBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-600 shadow-sm border border-slate-200";
    }
    renderAll();
  }

  function updateConnectionBadge() {
    if (SheetsApi.isConfigured()) {
      elements.connectionBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300";
      elements.connectionBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Google 시트 연결됨`;
    } else {
      elements.connectionBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300";
      elements.connectionBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span> Mock / 오프라인 모드`;
    }
  }

  function getActiveSheet() {
    if (!state.sheets || state.sheets.length === 0) return null;
    return state.sheets[state.activeSheetIndex] || state.sheets[0];
  }

  function showLoading(show) {
    state.isLoading = show;
    // 간단한 로딩 인디케이터 처리
    if (elements.refreshDataBtn) {
      if (show) {
        elements.refreshDataBtn.classList.add("animate-spin");
      } else {
        elements.refreshDataBtn.classList.remove("animate-spin");
      }
    }
  }

  /**
   * 토스트 알림 표시
   */
  function showToast(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    const bgMap = {
      success: "bg-emerald-800 text-white border-emerald-700",
      error: "bg-rose-800 text-white border-rose-700",
      info: "bg-slate-900 text-white border-slate-800"
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border transition-all duration-300 transform translate-y-2 opacity-0 ${bgMap[type] || bgMap.info}`;
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
