/**
 * SKHY Timetable Studio - Interactive Timetable Grid Engine (Clean SK Careers Light Theme)
 * 가독성 극대화 및 손쉬운 드래그/리사이징 인터랙션 엔진
 */

const TimetableGrid = (function () {
  const START_HOUR = 8;    // 그리드 시작: 08:00
  const END_HOUR = 22;     // 그리드 종료: 22:00
  const TOTAL_HOURS = END_HOUR - START_HOUR; // 14시간
  const SNAP_MINUTES = 15;  // 스냅 단위 (15분)
  const TOP_PADDING = 28;   // 상단 여백 (08:00 라벨 및 최상단 블록이 레이아웃과 겹치지 않도록 안전 여백 확보)
  
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
   * 전체 타임라인 그리드 렌더링 (SK Careers Clean White 스타일)
   */
  function render(tasks, readOnly = false) {
    currentTasks = tasks || [];
    isReadOnly = readOnly;

    if (!containerEl) return;
    containerEl.innerHTML = "";

    // 1시간당 높이 비율 재계산
    pxPerMinute = hourHeight / 60;

    // 메인 타임라인 래퍼 (클린 화이트 에디션)
    const gridWrapper = document.createElement("div");
    gridWrapper.className = "relative flex w-full select-none bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden";

    // 1. 좌측 시간 라벨 컬럼 (모바일: w-16 슬림화, 데스크탑: w-28)
    const timeColumn = document.createElement("div");
    timeColumn.className = "w-16 sm:w-24 md:w-28 flex-shrink-0 border-r border-slate-300 bg-slate-50/70 relative";
    timeColumn.style.height = `${TOTAL_HOURS * hourHeight + TOP_PADDING + 28}px`;

    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const topPos = (h - START_HOUR) * hourHeight + TOP_PADDING;
      const hourDiv = document.createElement("div");
      hourDiv.className = "absolute left-0 right-0 flex items-center justify-center -translate-y-1/2";
      hourDiv.style.top = `${topPos}px`;
      
      hourDiv.innerHTML = `
        <div class="flex flex-col items-center bg-white px-1 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-lg border border-slate-300 text-slate-800 shadow-2xs hover:border-[#EA0029]/50 transition-colors">
          <span class="text-[11px] sm:text-xs md:text-[13px] font-mono-code font-extrabold tracking-tight text-slate-900">
            ${String(h).padStart(2, "0")}:00
          </span>
          <span class="text-[9px] font-mono-code text-slate-500 font-semibold tracking-tight -mt-0.5 hidden sm:inline-block">
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
    scheduleBody.className = "relative flex-1 bg-white";
    scheduleBody.style.height = `${TOTAL_HOURS * hourHeight + TOP_PADDING + 28}px`;

    // 배경 그리드 가이드라인 (진하고 선명한 1시간 실선, 30분 점선)
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const rowTop = (h - START_HOUR) * hourHeight + TOP_PADDING;
      const hourRow = document.createElement("div");
      hourRow.style.top = `${rowTop}px`;
      hourRow.style.height = `${hourHeight}px`;
      hourRow.className = "absolute left-0 right-0 border-b border-slate-300 group cursor-pointer hover:bg-slate-50/80 transition-colors";
      hourRow.dataset.hour = h;

      if (h === START_HOUR) {
        hourRow.classList.add("border-t", "border-slate-300");
      }

      // 30분 구분선 (선명한 점선)
      const halfHourLine = document.createElement("div");
      halfHourLine.style.top = `${hourHeight / 2}px`;
      halfHourLine.className = "absolute left-0 right-0 border-b border-dashed border-slate-200 pointer-events-none";
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
   * 실시간 현재 시간 표시 라인 (SK Red)
   */
  function renderCurrentTimeIndicator(body) {
    const now = new Date();
    const currentM = now.getHours() * 60 + now.getMinutes();
    const startGridM = START_HOUR * 60;
    const endGridM = END_HOUR * 60;

    if (currentM >= startGridM && currentM <= endGridM) {
      const topPx = (currentM - startGridM) * pxPerMinute + TOP_PADDING;
      const line = document.createElement("div");
      line.className = "current-time-line";
      line.style.top = `${topPx}px`;

      line.innerHTML = `
        <div class="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-[#EA0029] animate-ping opacity-75"></div>
        <div class="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-[#EA0029]"></div>
        <span class="absolute left-3 -top-2.5 bg-[#EA0029] text-white font-mono-code font-bold text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full shadow-xs">
          ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} LIVE
        </span>
      `;
      body.appendChild(line);
    }
  }

  /**
   * 개별 Task 블록 카드 요소 생성 (SK Careers Clean Card)
   */
  function createTaskCard(task, startGridM, scheduleBody) {
    const card = document.createElement("div");
    card.dataset.id = task.id;

    const startM = task._startM;
    const endM = task._endM;
    const durationM = endM - startM;
    const durationText = formatDurationText(startM, endM);

    // 위치 및 크기 계산 (최소 높이 46px 보장)
    const topPx = (startM - startGridM) * pxPerMinute + TOP_PADDING;
    const heightPx = Math.max(46, durationM * pxPerMinute);

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

    // 높이 및 소요시간 단계 판별 (45분 이하 일정은 30분과 동일한 컴팩트 가로 인라인 레이아웃 적용)
    const isShort = durationM <= 45 || heightPx < 75;
    const isMedium = !isShort && heightPx < 110;
    const isTall = !isShort && heightPx >= 110;

    card.className = `task-card absolute rounded-xl ${isShort ? 'px-2 sm:px-2.5 py-1 sm:py-1.5 justify-center' : 'p-2 sm:p-2.5 justify-between'} flex flex-col border cursor-grab overflow-hidden transition-all ${catConfig.bg}`;

    // 호버 시 전체 내용 툴팁
    card.title = `[${task.start_time} ~ ${task.end_time} (${durationText})] ${task.task || '일정'}\n• 설명: ${task.summary || '(없음)'}\n• 특이사항: ${task.etc || '(없음)'}`;

    let innerContent = `
      <!-- 좌측 포인트 컬러 바 -->
      <div class="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 ${catConfig.bar}"></div>

      <!-- 상단 리사이즈 핸들 -->
      ${!isReadOnly ? `
        <div class="resize-handle top-handle absolute top-0 left-0 right-0 h-4 flex items-center justify-center cursor-row-resize z-30">
          <div class="handle-bar w-8 sm:w-10 h-1 rounded-full"></div>
        </div>
      ` : ''}
    `;

    if (isShort) {
      // 1. 짧은 일정 (15분 ~ 45분): 가로 인라인 압축 레이아웃으로 모든 필수 정보 한눈에 노출
      innerContent += `
        <div class="flex items-center justify-between gap-1 pl-1 sm:pl-2 pr-1 h-full min-h-0">
          <div class="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span class="text-[10px] sm:text-[11px] font-bold font-mono-code tracking-tight text-slate-800 flex items-center gap-0.5 flex-shrink-0">
              <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#EA0029]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              ${task.start_time}-${task.end_time}
            </span>
            <span class="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 rounded border shadow-2xs ${catConfig.badge} flex-shrink-0">${catConfig.label}</span>
            <span class="font-extrabold text-[11px] sm:text-xs text-slate-900 truncate min-w-0">${escapeHtml(task.task || "제목 없음")}</span>
            ${task.summary ? `<span class="text-[10px] sm:text-[11px] text-slate-500 truncate hidden md:inline font-normal">• ${escapeHtml(task.summary)}</span>` : ''}
            ${task.etc ? `<span class="text-[9px] sm:text-[10px] bg-white/90 text-slate-600 px-1 sm:px-1.5 py-0.2 rounded border border-slate-200 truncate hidden xl:inline">📍 ${escapeHtml(task.etc)}</span>` : ''}
          </div>
          <span class="text-[9px] sm:text-[10px] font-semibold font-mono-code text-slate-600 bg-white/80 px-1 sm:px-1.5 py-0.2 rounded border border-slate-200 shadow-2xs flex-shrink-0">
            ${durationText}
          </span>
        </div>
      `;
    } else {
      // 2. 표준 및 세로 확장 레이아웃
      innerContent += `
        <!-- 헤더: 시간 + 소요시간 + 카테고리 -->
        <div class="flex items-center justify-between gap-1 pl-1 sm:pl-1.5 pt-0.5 flex-shrink-0">
          <div class="flex items-center gap-1 sm:gap-1.5">
            <span class="text-[10px] sm:text-[11px] font-bold font-mono-code tracking-tight text-slate-800 flex items-center gap-0.5 sm:gap-1">
              <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#EA0029]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              ${task.start_time} - ${task.end_time}
            </span>
            <span class="text-[9px] sm:text-[10px] font-semibold font-mono-code text-slate-600 bg-white/80 px-1 sm:px-1.5 py-0.2 rounded border border-slate-200 shadow-2xs">
              ${durationText}
            </span>
          </div>
          <span class="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shadow-2xs ${catConfig.badge}">${catConfig.label}</span>
        </div>

        <!-- 본문: Task 제목 -->
        <div class="pl-1 sm:pl-1.5 flex-1 min-h-0 flex flex-col justify-center my-0.5">
          <div class="font-extrabold text-[11px] sm:text-xs md:text-[13px] text-slate-900 leading-snug line-clamp-2 break-keep">
            ${escapeHtml(task.task || "제목 없는 일정")}
          </div>
          ${task.summary ? `
            <div class="text-[10px] sm:text-[11px] text-slate-600 line-clamp-2 break-keep leading-relaxed mt-0.5">
              ${escapeHtml(task.summary)}
            </div>
          ` : ''}
        </div>
      `;

      // 하단부: 특이사항 (etc) 표시
      if (task.etc && isTall) {
        innerContent += `
          <div class="pl-1 sm:pl-1.5 pb-0.5 flex items-center gap-1 flex-shrink-0">
            <span class="text-[9px] sm:text-[10px] font-medium bg-white/90 text-slate-700 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-200/90 truncate max-w-full shadow-2xs">
              📍 ${escapeHtml(task.etc)}
            </span>
          </div>
        `;
      }
    }

    // 하단 리사이즈 핸들
    if (!isReadOnly) {
      innerContent += `
        <div class="resize-handle bottom-handle absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center cursor-row-resize z-30">
          <div class="handle-bar w-8 sm:w-10 h-1 rounded-full"></div>
        </div>
      `;
    }

    card.innerHTML = innerContent;

    // 호버 애니메이션
    card.addEventListener("mouseenter", () => {
      card.style.zIndex = "40";
      card.classList.add("shadow-md", "scale-[1.006]");
    });
    card.addEventListener("mouseleave", () => {
      card.style.zIndex = (10 + (task._col || 0)).toString();
      card.classList.remove("shadow-md", "scale-[1.006]");
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
   * 카드 드래그 이동 및 상/하단 리사이징 이벤트 바인딩 (모바일 롱프레스 & PC 즉시 드래그)
   */
  function bindDragAndResize(card, task, startGridM, scheduleBody) {
    const topHandle = card.querySelector(".top-handle");
    const bottomHandle = card.querySelector(".bottom-handle");

    let isInteracting = false;
    let mode = null; // 'move' | 'resize-top' | 'resize-bottom'
    let startX = 0;
    let startY = 0;
    let initialTop = 0;
    let initialHeight = 0;
    let initialStartM = task._startM;
    let initialEndM = task._endM;

    // 모바일 롱프레스 타이머 (220ms 누르면 드래그 활성화)
    let longPressTimer = null;
    const LONG_PRESS_DELAY = 220;

    // 실시간 플로팅 시간 안내 툴팁 & 가이드라인
    let tooltip = null;
    let guideLine = null;

    function showTooltip(text, x, y) {
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.className = "fixed z-50 bg-slate-900/90 backdrop-blur-md text-white text-xs font-mono-code font-bold px-3 py-1.5 rounded-xl shadow-xl pointer-events-none transition-transform border border-slate-700/80";
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = text;
      tooltip.style.left = `${Math.min(window.innerWidth - 180, Math.max(10, x + 15))}px`;
      tooltip.style.top = `${Math.max(10, y - 35)}px`;
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

    function startActiveDrag(e, dragMode) {
      isInteracting = true;
      mode = dragMode;
      startY = e.clientY;

      initialTop = parseFloat(card.style.top);
      initialHeight = parseFloat(card.style.height);
      initialStartM = task._startM;
      initialEndM = task._endM;

      card.classList.add("ring-2", "ring-[#EA0029]", "shadow-2xl", "scale-[1.02]", "opacity-95");
      card.style.zIndex = "50";
      document.body.style.cursor = dragMode === "move" ? "grabbing" : "row-resize";

      // 햅틱 진동 피드백 (모바일 지원 기기)
      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch(err) {}
      }

      const durText = formatDurationText(initialStartM, initialEndM);
      showTooltip(`⏱️ ${minutesToTime(initialStartM)} ~ ${minutesToTime(initialEndM)} (${durText})`, e.clientX, e.clientY);
      showGuideLine(initialTop);

      if (e.target && e.target.setPointerCapture) {
        try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
      }
    }

    function onPointerDown(e, dragMode) {
      if (e.button && e.button !== 0) return; // 마우스 우클릭 무시

      startX = e.clientX;
      startY = e.clientY;

      if (dragMode === "resize-top" || dragMode === "resize-bottom") {
        // 리사이즈 핸들은 명시적 터치이므로 즉시 리사이즈 모드 진입
        e.stopPropagation();
        e.preventDefault();
        startActiveDrag(e, dragMode);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
        document.addEventListener("pointercancel", onPointerUp);
        return;
      }

      // 카드 본체 이동 (dragMode === 'move')
      if (e.pointerType === "mouse") {
        // 마우스(PC)는 0ms 즉시 드래그
        e.stopPropagation();
        e.preventDefault();
        startActiveDrag(e, "move");
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      } else {
        // 터치(모바일)는 롱프레스 대기 (기본 스크롤 방해하지 않음)
        clearTimeout(longPressTimer);

        longPressTimer = setTimeout(() => {
          // 220ms 유지됨 -> 드래그 모드 활성화!
          startActiveDrag(e, "move");
        }, LONG_PRESS_DELAY);

        document.addEventListener("pointermove", onPointerMove, { passive: false });
        document.addEventListener("pointerup", onPointerUp);
        document.addEventListener("pointercancel", onPointerUp);
      }
    }

    function onPointerMove(e) {
      // 롱프레스 대기 중 손가락이 8px 이상 움직이면 -> 스크롤 제스처로 판단하여 롱프레스 취소
      if (!isInteracting) {
        if (longPressTimer) {
          const moveDist = Math.hypot(e.clientX - startX, e.clientY - startY);
          if (moveDist > 8) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }
        return;
      }

      // 드래그가 활성화된 경우에만 브라우저 스크롤을 막고 일정 위치 이동
      if (e.cancelable) {
        e.preventDefault();
      }
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

        const newTop = (newStartM - startGridM) * pxPerMinute + TOP_PADDING;
        card.style.top = `${newTop}px`;
        showGuideLine(newTop);
      } else if (mode === "resize-bottom") {
        newEndM = Math.max(initialStartM + SNAP_MINUTES, Math.min(END_HOUR * 60, initialEndM + deltaMinutes));
        const newHeight = Math.max(46, (newEndM - initialStartM) * pxPerMinute);
        card.style.height = `${newHeight}px`;
        showGuideLine(initialTop + newHeight);
      } else if (mode === "resize-top") {
        newStartM = Math.max(START_HOUR * 60, Math.min(initialEndM - SNAP_MINUTES, initialStartM + deltaMinutes));
        const newTop = (newStartM - startGridM) * pxPerMinute + TOP_PADDING;
        const newHeight = Math.max(46, (initialEndM - newStartM) * pxPerMinute);
        card.style.top = `${newTop}px`;
        card.style.height = `${newHeight}px`;
        showGuideLine(newTop);
      }

      const durText = formatDurationText(newStartM, newEndM);
      showTooltip(`⏱️ ${minutesToTime(newStartM)} ~ ${minutesToTime(newEndM)} (${durText})`, e.clientX, e.clientY);
    }

    function onPointerUp(e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);

      if (!isInteracting) return;
      isInteracting = false;
      document.body.style.cursor = "";
      removeTooltipAndGuide();

      if (e.target && e.target.releasePointerCapture) {
        try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
      }

      card.classList.remove("ring-2", "ring-[#EA0029]", "shadow-2xl", "scale-[1.02]", "opacity-95");

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

  function setHourHeight(newHeight) {
    if (newHeight && newHeight >= 60 && newHeight <= 300) {
      hourHeight = newHeight;
      pxPerMinute = hourHeight / 60;
      if (containerEl && currentTasks) {
        render(currentTasks, isReadOnly);
      }
    }
  }

  function getHourHeight() {
    return hourHeight;
  }

  return {
    init,
    render,
    timeToMinutes,
    minutesToTime,
    formatDurationText,
    setHourHeight,
    getHourHeight
  };
})();
