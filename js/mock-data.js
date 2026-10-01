/**
 * SKHY Timetable Studio - Mock / Initial Test Data
 * 실제 구글 스프레드시트 연동 전이나 오프라인 환경에서도 즉시 테스트할 수 있도록 제공되는 데이터입니다.
 */

const INITIAL_MOCK_DATA = {
  currentDate: "2026-10-01",
  sheets: [
    {
      sheetName: "홍길동",
      status: "completed", // 'draft' | 'completed'
      updatedAt: "2026-10-01 10:30",
      data: [
        {
          id: "task-hkd-1",
          start_time: "09:00",
          end_time: "10:00",
          task: "팀 주간 스크럼 및 스프린트 계획",
          summary: "이번 주 핵심 목표 수립 및 부서별 담당 업무 진행 현황 싱크업",
          etc: "대회의실 A / 화상회의 병행",
          category: "meeting"
        },
        {
          id: "task-hkd-2",
          start_time: "10:00",
          end_time: "11:45",
          task: "프론트엔드 타임라인 시각화 컴포넌트 개발",
          summary: "드래그 앤 드롭 및 리사이징 인터랙션 구현, 겹침 시간 자동 계산 로직 적용",
          etc: "우선순위 높음 / 집중 개발",
          category: "dev"
        },
        {
          id: "task-hkd-3",
          start_time: "11:45",
          end_time: "13:00",
          task: "점심 식사 및 휴식",
          summary: "동료들과 점심 식사 및 사내 카페테리아 커피 타임",
          etc: "지하 1층 식당",
          category: "break"
        },
        {
          id: "task-hkd-4",
          start_time: "13:00",
          end_time: "14:30",
          task: "구글 Apps Script API 연동 모듈 최적화",
          summary: "doGet/doPost 엔드포인트 테스트 및 timetable_fixed 저장 오류 예외처리",
          etc: "API 응답시간 < 300ms 목표",
          category: "dev"
        },
        {
          id: "task-hkd-5",
          start_time: "14:30",
          end_time: "16:00",
          task: "외부 고객사 기술 요구사항 미팅",
          summary: "시간표 데이터 연동 규격 및 보안 정책 검토 보고",
          etc: "Google Meet / 클라이언트 참석",
          category: "meeting"
        },
        {
          id: "task-hkd-6",
          start_time: "16:30",
          end_time: "18:00",
          task: "코드 리뷰 및 단위 테스트 작성",
          summary: "GitHub PR 검토 및 Jest 유닛 테스트 커버리지 점검",
          etc: "PR #24 머지 예정",
          category: "review"
        }
      ]
    },
    {
      sheetName: "김철수",
      status: "draft", // 수정 중
      updatedAt: "2026-10-01 11:15",
      data: [
        {
          id: "task-kcs-1",
          start_time: "09:30",
          end_time: "10:30",
          task: "팀 주간 스크럼",
          summary: "금주 백엔드 작업 일정 및 이슈 보고",
          etc: "대회의실 A",
          category: "meeting"
        },
        {
          id: "task-kcs-2",
          start_time: "10:30",
          end_time: "12:00",
          task: "스프레드시트 데이터 동기화 백엔드 구축",
          summary: "Google Sheets API 권한 분기 및 배치 쓰기 트랜잭션 구성",
          etc: "Apps Script 기반",
          category: "dev"
        },
        {
          id: "task-kcs-3",
          start_time: "12:00",
          end_time: "13:00",
          task: "점심 식사",
          summary: "팀원들과 식사",
          etc: "인근 식당",
          category: "break"
        },
        {
          id: "task-kcs-4",
          start_time: "13:30",
          end_time: "15:30",
          task: "데이터베이스 인덱싱 및 쿼리 튜닝",
          summary: "시트 데이터 로딩 병목 지점 개선 및 캐싱 로직 추가",
          etc: "응답 지연 개선",
          category: "dev"
        },
        {
          id: "task-kcs-5",
          start_time: "16:00",
          end_time: "17:30",
          task: "보안 취약점 및 OAuth 토큰 점검",
          summary: "CORS 설정 및 스크립트 실행 권한 정책 점검",
          etc: "보안팀 가이드라인 준수",
          category: "review"
        }
      ]
    },
    {
      sheetName: "이영희",
      status: "draft",
      updatedAt: "2026-10-01 09:40",
      data: [
        {
          id: "task-lyh-1",
          start_time: "09:00",
          end_time: "10:00",
          task: "팀 주간 스크럼",
          summary: "디자인 시스템 업데이트 현황 공유",
          etc: "대회의실 A",
          category: "meeting"
        },
        {
          id: "task-lyh-2",
          start_time: "10:00",
          end_time: "12:30",
          task: "시간표 웹 UI/UX 비주얼 디자인 리뉴얼",
          summary: "대형 날짜 배너, 개인별 상태 뱃지, 카드 호버 인터랙션 디자인",
          etc: "Figma 파일 버전 2.1",
          category: "design"
        },
        {
          id: "task-lyh-3",
          start_time: "12:30",
          end_time: "13:30",
          task: "점심 식사 및 산책",
          summary: "휴식",
          etc: "회사 주변 공원",
          category: "break"
        },
        {
          id: "task-lyh-4",
          start_time: "14:00",
          end_time: "16:00",
          task: "사용자 사용성 테스트 (UT) 및 피드백 정리",
          summary: "시간표 드래그 및 리사이징 반응성 사용자 피드백 수렴",
          etc: "5명 대상 인터뷰",
          category: "design"
        },
        {
          id: "task-lyh-5",
          start_time: "16:30",
          end_time: "18:00",
          task: "디자인 토큰 정리 및 개발팀 핸드오프",
          summary: "Tailwind 색상 팔레트 및 아이콘 에셋 내보내기",
          etc: "Slack 전달 완료",
          category: "review"
        }
      ]
    }
  ]
};

// SK Careers 스타일 클린 파스텔 컬러 팔레트 (화이트 배경 최적화)
const CATEGORY_COLORS = {
  meeting: {
    bg: "bg-sky-50/90 border-sky-200/90 text-slate-900 shadow-2xs hover:border-sky-300",
    badge: "bg-sky-100/90 text-sky-800 border-sky-200",
    bar: "bg-sky-500",
    label: "회의 / 미팅"
  },
  dev: {
    bg: "bg-indigo-50/90 border-indigo-200/90 text-slate-900 shadow-2xs hover:border-indigo-300",
    badge: "bg-indigo-100/90 text-indigo-800 border-indigo-200",
    bar: "bg-indigo-600",
    label: "개발 / 코딩"
  },
  design: {
    bg: "bg-amber-50/90 border-amber-200/90 text-slate-900 shadow-2xs hover:border-amber-300",
    badge: "bg-amber-100/90 text-amber-800 border-amber-200",
    bar: "bg-[#FF6A00]",
    label: "디자인 / 기획"
  },
  review: {
    bg: "bg-rose-50/90 border-rose-200/90 text-slate-900 shadow-2xs hover:border-rose-300",
    badge: "bg-rose-100/90 text-[#EA0029] border-rose-200 font-bold",
    bar: "bg-[#EA0029]",
    label: "검토 / 피드백"
  },
  break: {
    bg: "bg-emerald-50/90 border-emerald-200/90 text-slate-900 shadow-2xs hover:border-emerald-300",
    badge: "bg-emerald-100/90 text-emerald-800 border-emerald-200",
    bar: "bg-emerald-500",
    label: "식사 / 휴식"
  },
  etc: {
    bg: "bg-slate-50/90 border-slate-200/90 text-slate-900 shadow-2xs hover:border-slate-300",
    badge: "bg-slate-200/80 text-slate-700 border-slate-300",
    bar: "bg-slate-400",
    label: "기타 업무"
  }
};
