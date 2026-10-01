/**
 * SKHY Timetable Studio - Interactive Timetable Grid Engine
 * 가독성 극대화 및 손쉬운 드래그/리사이징 인터랙션 엔진
 */

const TimetableGrid = (function () {
  const START_HOUR = 8;    // 그리드 시작: 08:00
  const END_HOUR = 22;     // 그리드 종료: 22:00
  const TOTAL_HOURS = END_HOUR - START_HOUR; // 14시간
  const SNAP_MINUTES = 15;  // 스냅 단위 (15분)
  
  // 1시간당 세로 픽셀 높이 (96px: 1분 = 1.6px, 30분 = 48px, 1시간 = 96px)
  let hourHeight = 96;
  let pxPerMinute = hourHeight / 60; // 1.6px

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
   * 분 단위 소요 시간 텍스트 변환 (예: 1시간 30분)
   */
  function formatDurationText(startM, endM) {
    const diff = Math.max(0, endM - startM);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0 && m > 0) return `${h}시간 ${m}분`;
    if (h > 0) return `${h}시간`;
    return `${m}분`;
  }

  /**
   * 분을 스냅 단위(15분)로 반올림
   */
  function snapMinutes(mins) {
    return Math.round(mins / SNAP_MINUTES) * SNAP_MINUTES;
  }

  /**
   * 겹치는 일정(Overlap) 클러스터링 및 가로 열 분할 알고리즘
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
      const columns = [];

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
   * 전체 타임라인 그리드 렌더링
   */
  function render(tasks, readOnly = false) {
    currentTasks = tasks || [];
    isReadOnly = readOnly;

    if (!containerEl) return;
    containerEl.innerHTML = "";

    // 1시간당 높이 비율 재계산
    pxPerMinute = hourHeight / 60;

    // 메인 타임라인 래퍼 (사이버펑크 다크)
    const gridWrapper = document.createElement("div");
    gridWrapper.className = "relative flex w-full select-none bg-[#090D16] rounded-2xl shadow-2xl border border-slate-800/90 overflow-hidden";

    // 1. 좌측 시간 라벨 컬럼 (더 크고 선명한 사이버 HUD 폰트)
    const timeColumn = document.createElement("div");
    timeColumn.className = "w-24 sm:w-28 flex-shrink-0 border-r border-slate-800/80 bg-[#060910] flex flex-col py-4";

    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const hourDiv = document.createElement("div");
      hourDiv.style.height = `${hourHeight}px`;
      hourDiv.className = "relative flex items-start justify-center text-xs font-semibold text-slate-500";
      hourDiv.innerHTML = `
        <div class="-mt-3.5 flex flex-col items-center bg-[#0F1523] px-2.5 sm:px-3 py-1 rounded-lg border border-amber-500/35 text-amber-300 shadow-[0_0_10px_rgba(255,230,0,0.12)] hover:border-amber-400 transition-colors">
          <span class="text-xs sm:text-sm font-mono-cyber font-extrabold tracking-wider text-[#FFE600] drop-shadow-xs">
            ${String(h).padStart(2, "0")}:00
          </span>
          <span class="text-[9px] font-mono-cyber text-slate-400 font-bold tracking-tight -mt-0.5">
            ${h < 12 ? 'AM' : 'PM'}
          </span>
        </div>
      `;
      timeColumn.appendChild(hourDiv);
    }
    gridWrapper.appendChild(timeColumn);

    // 2. 우측 스케줄 인터랙션 그리드 본문
    const scheduleBody = document.createElement("div");
    scheduleBody.id = "timetableScheduleBody";
    scheduleBody.className = "relative flex-1 py-4 bg-[#0A0E17]";
    scheduleBody.style.height = `${TOTAL_HOURS * hourHeight + 32}px`;

    // 배경 그리드 가이드라인 (1시간 실선, 30분 점선)
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const hourRow = document.createElement("div");
      hourRow.style.height = `${hourHeight}px`;
      hourRow.className = "border-b border-slate-800/60 relative group cursor-pointer hover:bg-slate-800/20 transition-colors";
      hourRow.dataset.hour = h;

      // 30분 구분선
      const halfHourLine = document.createElement("div");
      halfHourLine.style.top = `${hourHeight / 2}px`;
      halfHourLine.className = "absolute left-0 right-0 border-b border-dashed border-slate-800/40 pointer-events-none";
      hourRow.appendChild(halfHourLine);

      // 빈 그리드 클릭 시 신규 일정 생성 이벤트
      if (!isReadOnly && onGridSlotClickCallback) {
        hourRow.addEventListener("click", (e) => {
          if (e.target.closest(".task-card")) return;
          const rect = hourRow.getBoundingClientRect();
          const clickY = e.clientY - rect.top;
          const isSecondHalf = clickY >= (hourHeight / 2);
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

    // 현재 시간 표시선 (당일인 경우)
    renderCurrentTimeIndicator(scheduleBody);

    // 3. 작업 블록들 렌더링
    const positioned = layoutClusters(currentTasks);
    const startGridM = START_HOUR * 60;

    positioned.forEach(task => {
      const card = createTaskCard(task, startGridM, scheduleBody);
      scheduleBody.appendChild(card);
    });

    gridWrapper.appendChild(scheduleBody);
    containerEl.appendChild(gridWrapper);
  }

  /**
   * 실시간 현재 시간 표시 라인 (Neon SK Red 레이저)
   */
  function renderCurrentTimeIndicator(body) {
    const now = new Date();
    const currentM = now.getHours() * 60 + now.getMinutes();
    const startGridM = START_HOUR * 60;
    const endGridM = END_HOUR * 60;

    if (currentM >= startGridM && currentM <= endGridM) {
      const topPx = (currentM - startGridM) * pxPerMinute + 16;
      const line = document.createElement("div");
      line.className = "current-time-line";
      line.style.top = `${topPx}px`;

      line.innerHTML = `
        <div class="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-[#FF003C] animate-ping"></div>
        <div class="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-[#FF003C]"></div>
        <span class="absolute left-3 -top-2.5 bg-[#FF003C] text-white font-mono-cyber font-bold text-[10px] px-2 py-0.2 rounded shadow-[0_0_10px_#FF003C]">
          ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} LIVE
        </span>
      `;
      body.appendChild(line);
    }
  }

  /**
   * 개별 Task 블록 카드 요소 생성 (사이버펑크 네온 다크)
   */
  function createTaskCard(task, startGridM, scheduleBody) {
    const card = document.createElement("div");
    card.dataset.id = task.id;

    const startM = task._startM;
    const endM = task._endM;
    const durationM = endM - startM;
    const durationText = formatDurationText(startM, endM);

    // 위치 및 크기 계산 (최소 높이 46px 보장)
    const topPx = (startM - startGridM) * pxPerMinute + 16;
    const heightPx = Math.max(46, durationM * pxPerMinute);

    // 컬럼 분할 너비 및 좌측 여백
    const colWidth = 100 / (task._totalCols || 1);
    const leftOffset = (task._col || 0) * colWidth;

    card.style.top = `${topPx}px`;
    card.style.height = `${heightPx}px`;
    card.style.left = `calc(${leftOffset}% + 6px)`;
    card.style.width = `calc(${colWidth}% - 12px)`;
    card.style.zIndex = (10 + (task._col || 0)).toString();

    // 테마 색상 클래스 적용
    const catConfig = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.etc;
    card.className = `task-card absolute rounded-xl p-2.5 flex flex-col justify-between border cursor-grab overflow-hidden ${catConfig.bg}`;

    // 호버 시 전체 내용 툴팁
    card.title = `[${task.start_time} ~ ${task.end_time} (${durationText})] ${task.task || '일정'}\n• 설명: ${task.summary || '(없음)'}\n• 특이사항: ${task.etc || '(없음)'}`;

    // 높이 단계 판별 (가독성 분기)
    const isShort = heightPx < 68;
    const isMedium = heightPx >= 68 && heightPx < 105;
    const isTall = heightPx >= 105;

    let innerContent = `
      <!-- 좌측 포인트 컬러 바 -->
      <div class="absolute left-0 top-0 bottom-0 w-1.5 ${catConfig.bar}"></div>

      <!-- 상단 리사이즈 핸들 (20px 내부 터치 영역 & 중앙 손잡이 바) -->
      ${!isReadOnly ? `
        <div class="resize-handle top-handle absolute top-0 left-0 right-0 h-5 flex items-center justify-center cursor-row-resize z-30">
          <div class="handle-bar w-12 h-1.5 rounded-full"></div>
        </div>
      ` : ''}

      <!-- 헤더: 시간 + 소요시간 + 카테고리 -->
      <div class="flex items-center justify-between gap-1.5 pl-1.5 pt-1 flex-shrink-0">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-bold font-mono-cyber tracking-tight text-slate-100 flex items-center gap-1">
            <svg class="w-3 h-3 text-[#FF003C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${task.start_time} - ${task.end_time}
          </span>
          <span class="text-[10px] font-semibold font-mono-cyber text-amber-300 bg-black/70 px-1.5 py-0.2 rounded border border-amber-500/30">
            ${durationText}
          </span>
        </div>
        ${!isShort ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${catConfig.badge}">${catConfig.label}</span>` : ''}
      </div>

      <!-- 본문: Task 제목 (네온 고대비, break-keep, 최대 2줄) -->
      <div class="pl-1.5 flex-1 min-h-0 flex flex-col justify-center my-0.5">
        <div class="font-extrabold text-xs sm:text-[13px] text-white leading-snug line-clamp-2 break-keep drop-shadow-xs">
          ${escapeHtml(task.task || "제목 없는 일정")}
        </div>
        ${isTall && task.summary ? `
          <div class="text-[11px] text-slate-300 line-clamp-2 break-keep leading-relaxed mt-1">
            ${escapeHtml(task.summary)}
          </div>
        ` : ''}
      </div>
    `;

    // 하단부: 특이사항 (etc) 표시
    if (!isShort && task.etc) {
      innerContent += `
        <div class="pl-1.5 pb-0.5 flex items-center gap-1 flex-shrink-0">
          <span class="text-[10px] font-medium bg-black/80 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700/80 truncate max-w-full shadow-xs">
            📍 ${escapeHtml(task.etc)}
          </span>
        </div>
      `;
    }

    // 하단 리사이즈 핸들
    if (!isReadOnly) {
      innerContent += `
        <div class="resize-handle bottom-handle absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center cursor-row-resize z-30">
          <div class="handle-bar w-12 h-1.5 rounded-full"></div>
        </div>
      `;
    }

    card.innerHTML = innerContent;

    // 호버 애니메이션
    card.addEventListener("mouseenter", () => {
      card.style.zIndex = "40";
      card.classList.add("shadow-md", "scale-[1.008]");
    });
    card.addEventListener("mouseleave", () => {
      card.style.zIndex = (10 + (task._col || 0)).toString();
      card.classList.remove("shadow-md", "scale-[1.008]");
    });

    // 클릭 시 편집 모달 열기
    card.addEventListener("click", () => {
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
      bindDragAndResize(card, task, startGridM, scheduleBody);
    }

    return card;
  }

  /**
   * 카드 드래그 이동 및 상/하단 리사이징 이벤트 바인딩 (초간편 인터랙션)
   */
  function bindDragAndResize(card, task, startGridM, scheduleBody) {
    const topHandle = card.querySelector(".top-handle");
    const bottomHandle = card.querySelector(".bottom-handle");

    let isInteracting = false;
    let mode = null; // 'move' | 'resize-top' | 'resize-bottom'
    let startY = 0;
    let initialTop = 0;
    let initialHeight = 0;
    let initialStartM = task._startM;
    let initialEndM = task._endM;

    // 실시간 플로팅 시간 안내 툴팁 & 가이드라인
    let tooltip = null;
    let guideLine = null;

    function showTooltip(text, x, y) {
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.className = "fixed z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl shadow-2xl pointer-events-none transition-transform border border-slate-700/80";
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = text;
      tooltip.style.left = `${x + 18}px`;
      tooltip.style.top = `${y - 14}px`;
    }

    function showGuideLine(topPos) {
      if (!guideLine && scheduleBody) {
        guideLine = document.createElement("div");
        guideLine.className = "time-guide-line";
        scheduleBody.appendChild(guideLine);
      }
      if (guideLine) {
        guideLine.style.top = `${topPos}px`;
      }
    }

    function removeTooltipAndGuide() {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
        tooltip = null;
      }
      if (guideLine && guideLine.parentNode) {
        guideLine.parentNode.removeChild(guideLine);
        guideLine = null;
      }
    }

    function onPointerDown(e, dragMode) {
      if (e.button !== 0) return; // 좌클릭만
      e.stopPropagation();
      e.preventDefault();

      isInteracting = true;
      mode = dragMode;
      startY = e.clientY;

      initialTop = parseFloat(card.style.top);
      initialHeight = parseFloat(card.style.height);
      initialStartM = task._startM;
      initialEndM = task._endM;

      card.classList.add("ring-2", "ring-[#EA0029]", "shadow-2xl", "opacity-95");
      card.style.zIndex = "50";
      document.body.style.cursor = dragMode === "move" ? "grabbing" : "row-resize";

      // 포인터 캡처 (마우스가 카드 밖으로 빠르게 벗어나도 완벽히 추적)
      if (e.target && e.target.setPointerCapture) {
        try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
      }

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

        const newTop = (newStartM - startGridM) * pxPerMinute + 16;
        card.style.top = `${newTop}px`;
        showGuideLine(newTop);
      } else if (mode === "resize-bottom") {
        newEndM = Math.max(initialStartM + SNAP_MINUTES, Math.min(END_HOUR * 60, initialEndM + deltaMinutes));
        const newHeight = Math.max(46, (newEndM - initialStartM) * pxPerMinute);
        card.style.height = `${newHeight}px`;
        showGuideLine(initialTop + newHeight);
      } else if (mode === "resize-top") {
        newStartM = Math.max(START_HOUR * 60, Math.min(initialEndM - SNAP_MINUTES, initialStartM + deltaMinutes));
        const newTop = (newStartM - startGridM) * pxPerMinute + 16;
        const newHeight = Math.max(46, (initialEndM - newStartM) * pxPerMinute);
        card.style.top = `${newTop}px`;
        card.style.height = `${newHeight}px`;
        showGuideLine(newTop);
      }

      const durText = formatDurationText(newStartM, newEndM);
      showTooltip(`⏱️ ${minutesToTime(newStartM)} ~ ${minutesToTime(newEndM)} (${durText})`, e.clientX, e.clientY);
    }

    function onPointerUp(e) {
      if (!isInteracting) return;
      isInteracting = false;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
      removeTooltipAndGuide();

      if (e.target && e.target.releasePointerCapture) {
        try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
      }

      card.classList.remove("ring-2", "ring-[#EA0029]", "shadow-2xl", "opacity-95");

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
        // 원래 위치로 복원
        card.style.top = `${initialTop}px`;
        card.style.height = `${initialHeight}px`;
      }
    }

    // 카드 본체 드래그 (이동)
    card.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".resize-handle")) return;
      onPointerDown(e, "move");
    });

    // 상단 핸들 리사이징 (시작 시간 조절)
    if (topHandle) {
      topHandle.addEventListener("pointerdown", (e) => onPointerDown(e, "resize-top"));
    }

    // 하단 핸들 리사이징 (종료 시간 조절)
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
    minutesToTime,
    formatDurationText
  };
})();
