/**
 * SKHY Timetable Studio - Interactive Timetable Grid Engine
 * 시간표 시각화, 오버랩 계산, 드래그 앤 드롭 이동 및 리사이징 엔진
 */

const TimetableGrid = (function () {
  const START_HOUR = 8;   // 그리드 시작: 08:00
  const END_HOUR = 22;    // 그리드 종료: 22:00
  const TOTAL_HOURS = END_HOUR - START_HOUR; // 14시간
  const TOTAL_MINUTES = TOTAL_HOURS * 60;    // 840분
  const SNAP_MINUTES = 15; // 드래그 시 스냅 단위 (15분)

  let containerEl = null;
  let currentTasks = [];
  let isReadOnly = false;
  let onTaskClickCallback = null;
  let onTaskChangeCallback = null;
  let onGridSlotClickCallback = null;

  /**
   * 시간표 엔진 초기화
   */
  function init(container, options = {}) {
    containerEl = container;
    onTaskClickCallback = options.onTaskClick || null;
    onTaskChangeCallback = options.onTaskChange || null;
    onGridSlotClickCallback = options.onGridSlotClick || null;
  }

  /**
   * '09:30' 문자열을 자정(00:00) 기준 분(minute)으로 변환
   */
  function timeToMinutes(timeStr) {
    if (!timeStr) return START_HOUR * 60;
    const parts = String(timeStr).trim().split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  /**
   * 분(minute)을 '09:30' 형태의 문자열로 변환
   */
  function minutesToTime(totalMinutes) {
    const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, totalMinutes));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  /**
   * 분을 스냅 단위(15분)로 반올림
   */
  function snapMinutes(mins) {
    return Math.round(mins / SNAP_MINUTES) * SNAP_MINUTES;
  }

  /**
   * 겹치는 일정(Overlap) 자동 분할 배치 알고리즘
   */
  function layoutClusters(tasks) {
    if (!tasks || tasks.length === 0) return [];

    // 1. 시작 시간 기준 정렬
    const sorted = [...tasks].map(t => ({
      ...t,
      _startM: Math.max(START_HOUR * 60, timeToMinutes(t.start_time)),
      _endM: Math.min(END_HOUR * 60, Math.max(timeToMinutes(t.start_time) + 15, timeToMinutes(t.end_time)))
    })).sort((a, b) => {
      if (a._startM !== b._startM) return a._startM - b._startM;
      return (b._endM - b._startM) - (a._endM - a._startM);
    });

    // 2. 겹치는 블록들을 클러스터로 그룹화
    const clusters = [];
    let currentCluster = [];
    let clusterEnd = -1;

    sorted.forEach(task => {
      if (task._startM < clusterEnd) {
        currentCluster.push(task);
        clusterEnd = Math.max(clusterEnd, task._endM);
      } else {
        if (currentCluster.length > 0) {
          clusters.push(currentCluster);
        }
        currentCluster = [task];
        clusterEnd = task._endM;
      }
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // 3. 각 클러스터 내에서 컬럼(열) 번호 배정
    const positionedTasks = [];

    clusters.forEach(cluster => {
      const columns = []; // columns[colIndex] = 마지막 종료 시간

      cluster.forEach(task => {
        let placed = false;
        for (let c = 0; c < columns.length; c++) {
          if (columns[c] <= task._startM) {
            columns[c] = task._endM;
            task._col = c;
            placed = true;
            break;
          }
        }
        if (!placed) {
          task._col = columns.length;
          columns.push(task._endM);
        }
      });

      const totalCols = columns.length;
      cluster.forEach(task => {
        task._totalCols = totalCols;
        positionedTasks.push(task);
      });
    });

    return positionedTasks;
  }

  /**
   * 전체 그리드 렌더링
   */
  function render(tasks, readOnly = false) {
    currentTasks = tasks || [];
    isReadOnly = readOnly;

    if (!containerEl) return;
    containerEl.innerHTML = "";

    // 메인 타임라인 래퍼
    const gridWrapper = document.createElement("div");
    gridWrapper.className = "relative flex w-full select-none bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden";

    // 1. 좌측 시간 라벨 컬럼
    const timeColumn = document.createElement("div");
    timeColumn.className = "w-16 flex-shrink-0 border-r border-slate-100 bg-slate-50/60 flex flex-col py-3";

    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const hourDiv = document.createElement("div");
      hourDiv.className = "h-20 relative flex items-start justify-center text-xs font-semibold text-slate-500";
      hourDiv.innerHTML = `<span class="-mt-2.5 bg-slate-100/90 px-1.5 py-0.5 rounded text-[11px] font-mono tracking-tight text-slate-600">${String(h).padStart(2, "0")}:00</span>`;
      timeColumn.appendChild(hourDiv);
    }
    gridWrapper.appendChild(timeColumn);

    // 2. 우측 스케줄 인터랙션 그리드 본문
    const scheduleBody = document.createElement("div");
    scheduleBody.className = "relative flex-1 py-3 bg-white";
    scheduleBody.style.height = `${TOTAL_HOURS * 80 + 24}px`; // 1시간 = 80px 높이

    // 배경 그리드 가이드라인 (1시간 실선, 30분 점선)
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const hourRow = document.createElement("div");
      hourRow.className = "h-20 border-b border-slate-100 relative group cursor-pointer hover:bg-blue-50/20 transition-colors";
      hourRow.dataset.hour = h;

      // 30분 구분선
      const halfHourLine = document.createElement("div");
      halfHourLine.className = "absolute top-10 left-0 right-0 border-b border-dashed border-slate-100/80 pointer-events-none";
      hourRow.appendChild(halfHourLine);

      // 빈 그리드 클릭 시 신규 일정 생성 이벤트
      if (!isReadOnly && onGridSlotClickCallback) {
        hourRow.addEventListener("click", (e) => {
          if (e.target.closest(".task-card")) return;
          const rect = hourRow.getBoundingClientRect();
          const clickY = e.clientY - rect.top;
          const isSecondHalf = clickY >= 40;
          const startM = isSecondHalf ? h * 60 + 30 : h * 60;
          const endM = startM + 60;
          onGridSlotClickCallback({
            start_time: minutesToTime(startM),
            end_time: minutesToTime(endM)
          });
        });
      }

      scheduleBody.appendChild(hourRow);
    }

    // 3. 작업 블록들 렌더링
    const positioned = layoutClusters(currentTasks);
    const startGridM = START_HOUR * 60;

    positioned.forEach(task => {
      const card = createTaskCard(task, startGridM);
      scheduleBody.appendChild(card);
    });

    gridWrapper.appendChild(scheduleBody);
    containerEl.appendChild(gridWrapper);
  }

  /**
   * 개별 Task 블록 카드 요소 생성
   */
  function createTaskCard(task, startGridM) {
    const card = document.createElement("div");
    card.className = "task-card absolute rounded-xl p-2.5 flex flex-col justify-between shadow-sm border transition-all duration-150 cursor-pointer overflow-hidden";
    card.dataset.id = task.id;

    const startM = task._startM;
    const endM = task._endM;
    const durationM = endM - startM;

    // 위치 및 크기 계산 (1분당 80px / 60분 = 1.333px)
    const pxPerMinute = 80 / 60;
    const topPx = (startM - startGridM) * pxPerMinute + 12; // 패딩 보정
    const heightPx = Math.max(38, durationM * pxPerMinute);

    // 컬럼 분할 너비 및 좌측 여백
    const colWidth = 100 / (task._totalCols || 1);
    const leftOffset = (task._col || 0) * colWidth;

    card.style.top = `${topPx}px`;
    card.style.height = `${heightPx}px`;
    card.style.left = `calc(${leftOffset}% + 4px)`;
    card.style.width = `calc(${colWidth}% - 8px)`;
    card.style.zIndex = (10 + (task._col || 0)).toString();

    // 테마 색상 클래스 적용
    const catConfig = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.etc;
    card.className += ` ${catConfig.bg}`;

    // 카드 내부 렌더링
    const isCompact = heightPx < 55;

    card.innerHTML = `
      <!-- 좌측 포인트 컬러 바 -->
      <div class="absolute left-0 top-0 bottom-0 w-1.5 ${catConfig.bar}"></div>

      <!-- 상단 리사이즈 핸들 (읽기전용 아닐 때) -->
      ${!isReadOnly ? '<div class="resize-handle top-handle absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400/30 transition-colors"></div>' : ''}

      <!-- 헤더: 시간 및 카테고리 -->
      <div class="flex items-center justify-between gap-1 pl-1">
        <span class="text-[11px] font-bold font-mono tracking-tight text-slate-700 flex items-center gap-1">
          <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          ${task.start_time} - ${task.end_time}
        </span>
        ${!isCompact ? `<span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${catConfig.badge}">${catConfig.label}</span>` : ''}
      </div>

      <!-- 본문: Task명 & 설명 -->
      <div class="pl-1 mt-0.5 flex-1 min-h-0 overflow-hidden">
        <div class="font-bold text-xs text-slate-900 truncate leading-snug">${escapeHtml(task.task || "제목 없는 일정")}</div>
        ${!isCompact && task.summary ? `<div class="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-tight">${escapeHtml(task.summary)}</div>` : ''}
      </div>

      <!-- 하단: 특이사항 (etc) 태그 -->
      ${!isCompact && task.etc ? `
        <div class="pl-1 mt-1 flex items-center gap-1">
          <span class="text-[10px] bg-white/80 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/80 truncate max-w-full">
            📍 ${escapeHtml(task.etc)}
          </span>
        </div>
      ` : ''}

      <!-- 하단 리사이즈 핸들 -->
      ${!isReadOnly ? '<div class="resize-handle bottom-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400/30 transition-colors"></div>' : ''}
    `;

    // 호버 애니메이션
    card.addEventListener("mouseenter", () => {
      card.style.zIndex = "40";
      card.classList.add("shadow-lg", "scale-[1.01]");
    });
    card.addEventListener("mouseleave", () => {
      card.style.zIndex = (10 + (task._col || 0)).toString();
      card.classList.remove("shadow-lg", "scale-[1.01]");
    });

    // 클릭 시 편집 모달 열기
    card.addEventListener("click", (e) => {
      if (card.dataset.dragged === "true") {
        delete card.dataset.dragged;
        return;
      }
      if (onTaskClickCallback) {
        onTaskClickCallback(task);
      }
    });

    // 드래그 앤 드롭 및 리사이징 바인딩
    if (!isReadOnly) {
      bindDragAndResize(card, task, startGridM);
    }

    return card;
  }

  /**
   * 카드 드래그 이동 및 상/하단 리사이징 이벤트 바인딩
   */
  function bindDragAndResize(card, task, startGridM) {
    const pxPerMinute = 80 / 60;
    const topHandle = card.querySelector(".top-handle");
    const bottomHandle = card.querySelector(".bottom-handle");

    let isInteracting = false;
    let mode = null; // 'move' | 'resize-top' | 'resize-bottom'
    let startY = 0;
    let initialTop = 0;
    let initialHeight = 0;
    let initialStartM = task._startM;
    let initialEndM = task._endM;

    // 플로팅 시간 안내 툴팁
    let tooltip = null;

    function showTooltip(text, x, y) {
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.className = "fixed z-50 bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none transition-transform";
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = text;
      tooltip.style.left = `${x + 15}px`;
      tooltip.style.top = `${y - 10}px`;
    }

    function removeTooltip() {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
        tooltip = null;
      }
    }

    function onPointerDown(e, dragMode) {
      if (e.button !== 0) return; // 좌클릭만
      e.stopPropagation();

      isInteracting = true;
      mode = dragMode;
      startY = e.clientY;

      initialTop = parseFloat(card.style.top);
      initialHeight = parseFloat(card.style.height);
      initialStartM = task._startM;
      initialEndM = task._endM;

      card.classList.add("ring-2", "ring-blue-500", "opacity-90");
      card.style.zIndex = "50";

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    }

    function onPointerMove(e) {
      if (!isInteracting) return;
      card.dataset.dragged = "true";

      const deltaY = e.clientY - startY;
      const deltaMinutesRaw = deltaY / pxPerMinute;
      const deltaMinutes = snapMinutes(deltaMinutesRaw);

      let newStartM = initialStartM;
      let newEndM = initialEndM;

      if (mode === "move") {
        const duration = initialEndM - initialStartM;
        newStartM = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - duration, initialStartM + deltaMinutes));
        newEndM = newStartM + duration;

        const newTop = (newStartM - startGridM) * pxPerMinute + 12;
        card.style.top = `${newTop}px`;
      } else if (mode === "resize-bottom") {
        newEndM = Math.max(initialStartM + SNAP_MINUTES, Math.min(END_HOUR * 60, initialEndM + deltaMinutes));
        const newHeight = (newEndM - initialStartM) * pxPerMinute;
        card.style.height = `${newHeight}px`;
      } else if (mode === "resize-top") {
        newStartM = Math.max(START_HOUR * 60, Math.min(initialEndM - SNAP_MINUTES, initialStartM + deltaMinutes));
        const newTop = (newStartM - startGridM) * pxPerMinute + 12;
        const newHeight = (initialEndM - newStartM) * pxPerMinute;
        card.style.top = `${newTop}px`;
        card.style.height = `${newHeight}px`;
      }

      showTooltip(`${minutesToTime(newStartM)} ~ ${minutesToTime(newEndM)}`, e.clientX, e.clientY);
    }

    function onPointerUp(e) {
      if (!isInteracting) return;
      isInteracting = false;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      removeTooltip();

      card.classList.remove("ring-2", "ring-blue-500", "opacity-90");

      const deltaY = e.clientY - startY;
      const deltaMinutes = snapMinutes(deltaY / pxPerMinute);

      let newStartM = initialStartM;
      let newEndM = initialEndM;

      if (mode === "move") {
        const duration = initialEndM - initialStartM;
        newStartM = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - duration, initialStartM + deltaMinutes));
        newEndM = newStartM + duration;
      } else if (mode === "resize-bottom") {
        newEndM = Math.max(initialStartM + SNAP_MINUTES, Math.min(END_HOUR * 60, initialEndM + deltaMinutes));
      } else if (mode === "resize-top") {
        newStartM = Math.max(START_HOUR * 60, Math.min(initialEndM - SNAP_MINUTES, initialStartM + deltaMinutes));
      }

      // 변경 사항이 실제로 있을 때만 콜백 호출
      if (newStartM !== initialStartM || newEndM !== initialEndM) {
        const updatedTask = {
          ...task,
          start_time: minutesToTime(newStartM),
          end_time: minutesToTime(newEndM)
        };
        delete updatedTask._startM;
        delete updatedTask._endM;
        delete updatedTask._col;
        delete updatedTask._totalCols;

        if (onTaskChangeCallback) {
          onTaskChangeCallback(updatedTask);
        }
      } else {
        // 원래 위치로 원복
        card.style.top = `${initialTop}px`;
        card.style.height = `${initialHeight}px`;
      }
    }

    // 카드 본체 드래그
    card.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".resize-handle")) return;
      onPointerDown(e, "move");
    });

    // 상단 핸들 리사이징
    if (topHandle) {
      topHandle.addEventListener("pointerdown", (e) => onPointerDown(e, "resize-top"));
    }

    // 하단 핸들 리사이징
    if (bottomHandle) {
      bottomHandle.addEventListener("pointerdown", (e) => onPointerDown(e, "resize-bottom"));
    }
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

  return {
    init,
    render,
    timeToMinutes,
    minutesToTime
  };
})();
