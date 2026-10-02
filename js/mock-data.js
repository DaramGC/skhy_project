/**
 * SKHY Timetable Studio - Mock / Initial Test Data
 * 실제 구글 스프레드시트 연동 전이나 오프라인 환경에서도 즉시 테스트할 수 있도록 제공되는 데이터입니다.
 * [최신 포맷]: 단일 시트에 sheet_name 열로 팀원별(A_담당, B_팀장, C_파트장) 일정이 기록된 구조
 */

const INITIAL_MOCK_DATA = {
  currentDate: "2026-10-02",
  sheets: [
    {
      sheetName: "A_담당",
      status: "draft",
      updatedAt: "2026-10-02 09:00",
      data: [
        {
          id: "task-A_담당-1",
          sheet_name: "A_담당",
          start_time: "08:30",
          end_time: "09:15",
          task: "이슈 보고/지시",
          summary: "출하 라인에서 DRAM PKG High-Speed Fail 발생 보고 및 초동 원인 분석 착수 지시.",
          etc: "messenger; 발신: A 담당 / 수신: 전원(현장 포함); 초동 원인 분석 지시",
          category: "meeting"
        },
        {
          id: "task-A_담당-2",
          sheet_name: "A_담당",
          start_time: "09:15",
          end_time: "10:00",
          task: "분석 지시(문서화)",
          summary: "전분기 유사 패키지(Lot #3890) 이력과 대조하여 3.2Gbps 고속 영역 타이밍 마진 저하 원인 규명 요청.",
          etc: "mail; 발신: A 담당 / 수신: B 팀장, C 파트장; 분석 대상 및 요청사항 명시",
          category: "design"
        },
        {
          id: "task-A_담당-3",
          sheet_name: "A_담당",
          start_time: "10:00",
          end_time: "11:00",
          task: "자료 확인 요청",
          summary: "전분기 유사 랏 데이터와 비교해 기판 레이아웃 또는 공정 변경점 존재 여부 확인 요청.",
          etc: "messenger; 발신: A 담당 / 수신: B 팀장; 기판 레이아웃·공정 변경점 확인 요청",
          category: "design"
        },
        {
          id: "task-A_담당-4",
          sheet_name: "A_담당",
          start_time: "11:00",
          end_time: "13:00",
          task: "데이터 분석 요청(ATE)",
          summary: "ATE 테스터 스캔 결과에서 비트 에러가 특정 Column 주소에 집중되는지 검토 요청.",
          etc: "messenger; 발신: A 담당 / 수신: C 파트장; ATE 결과 집중도 확인 요청",
          category: "review"
        },
        {
          id: "task-A_담당-5",
          sheet_name: "A_담당",
          start_time: "13:00",
          end_time: "14:00",
          task: "데이터 수집 요청",
          summary: "임원진 보고용으로 고온 챔버 테스트 조건별 Fail 빈도 데이터를 확보하도록 지시.",
          etc: "messenger; 발신: A 담당 / 수신: 전원; 고온 챔버 조건별 Fail 빈도 요청",
          category: "meeting"
        },
        {
          id: "task-A_담당-6",
          sheet_name: "A_담당",
          start_time: "14:00",
          end_time: "15:00",
          task: "회의 안건 공유/준비",
          summary: "오후 종합 대책 회의 안건(웨이퍼 엣지 디펙트와 패키지 고속 마진 상관관계 등) 공유 및 추가 스트레스 조건 확정 건 통보.",
          etc: "mail; 발신: A 담당 / 수신: 전원; 회의 안건 및 준비 사항 공유",
          category: "meeting"
        },
        {
          id: "task-A_담당-7",
          sheet_name: "A_담당",
          start_time: "15:00",
          end_time: "16:00",
          task: "분석 공유 요청",
          summary: "본딩 와이어 인덕턴스가 신호 무결성에 미치는 영향 분석 결과 공유 요청.",
          etc: "messenger; 발신: A 담당 / 수신: D TL, E TL; 분석 결과 공유 요청",
          category: "meeting"
        },
        {
          id: "task-A_담당-8",
          sheet_name: "A_담당",
          start_time: "16:00",
          end_time: "16:50",
          task: "분석 검토 요청",
          summary: "저속 및 고속 패턴 변경에 따른 타이밍 파라미터(tAA, tRCD) 민감도 결과 검토 지시.",
          etc: "messenger; 발신: A 담당 / 수신: F TL, G TL; 파라미터 민감도 검토 요청",
          category: "dev"
        },
        {
          id: "task-A_담당-9",
          sheet_name: "A_담당",
          start_time: "16:50",
          end_time: "17:20",
          task: "보고/일정 공지",
          summary: "일일 분석 결과 최종 승인 및 익일 유관부서 합동 회의 소집 계획 통보.",
          etc: "mail; 발신: A 담당 / 수신: B 팀장 및 전원; 최종 승인 및 익일 일정 공지",
          category: "meeting"
        },
        {
          id: "task-A_담당-10",
          sheet_name: "A_담당",
          start_time: "17:20",
          end_time: "17:50",
          task: "보고서 검토/종결",
          summary: "최종 분석 보고서 초안 검토 완료 및 하루 업무 마무리 안내.",
          etc: "messenger; 발신: A 담당 / 수신: 전원; 보고서 초안 검토 완료 및 마무리 인사",
          category: "meeting"
        }
      ]
    },
    {
      sheetName: "B_팀장",
      status: "draft",
      updatedAt: "2026-10-02 09:00",
      data: [
        {
          id: "task-B_팀장-11",
          sheet_name: "B_팀장",
          start_time: "08:35",
          end_time: "09:20",
          task: "로그 추출·초기 지시",
          summary: "A 담당 지시 접수 후 ATE 테스터 로그 추출 및 Fail 어드레스 매핑 착수 예정.",
          etc: "messenger / 발신: B 팀장 → 수신: A 담당, 관련 팀; 지시사항 접수 및 실행 약속",
          category: "dev"
        },
        {
          id: "task-B_팀장-12",
          sheet_name: "B_팀장",
          start_time: "09:20",
          end_time: "10:15",
          task: "데이터 분석 (필터링)",
          summary: "ATE 테스트 로그에서 3.2Gbps 이상 구간의 비트 에러 집중 영역 필터링 요청 수행.",
          etc: "agent / 시스템 요청 로그; 필터링 조건: ≥3.2Gbps, 비트 에러 영역 추출 지시",
          category: "dev"
        },
        {
          id: "task-B_팀장-13",
          sheet_name: "B_팀장",
          start_time: "10:15",
          end_time: "11:10",
          task: "보고·문서작성",
          summary: "ATE 로그 분석 및 이전 랏 비교 리포트 발송—고속 클럭 스큐 5% 증가 및 패키지 전원단 노이즈 점검 결과 보고.",
          etc: "mail / 발신: B 팀장 → 수신: A 담당, C 파트장; 정식 리포트 이메일 발송",
          category: "meeting"
        },
        {
          id: "task-B_팀장-14",
          sheet_name: "B_팀장",
          start_time: "11:10",
          end_time: "12:00",
          task: "검토 요청·협의",
          summary: "C 파트장에게 패키지 기판 레이아웃의 기생 인덕턴스 시뮬레이션 데이터 검토 요청.",
          etc: "messenger / 발신: B 팀장 → 수신: C 파트장; 시뮬레이션 데이터 검토 요청",
          category: "review"
        },
        {
          id: "task-B_팀장-15",
          sheet_name: "B_팀장",
          start_time: "12:00",
          end_time: "13:30",
          task: "시뮬레이션 분석 요청",
          summary: "tAA, tRCD 타이밍 파라미터 스윕 시뮬레이션 데이터에서 마진 산출 요청 접수.",
          etc: "agent / 시스템 요청; 타이밍 파라미터 스윕 결과 기반 마진 산출 부탁",
          category: "dev"
        },
        {
          id: "task-B_팀장-16",
          sheet_name: "B_팀장",
          start_time: "13:30",
          end_time: "14:20",
          task: "검증 지시(테스트)",
          summary: "주니어 TL들에게 저속 모드(1.6Gbps)에서의 Pass 여부 재검증용 데이터 추출 지시.",
          etc: "messenger / 발신: B 팀장 → 수신: 주니어 TL들; 저속 모드 재검증 지시",
          category: "review"
        },
        {
          id: "task-B_팀장-17",
          sheet_name: "B_팀장",
          start_time: "14:20",
          end_time: "15:15",
          task: "테스트 실행·통계 집계",
          summary: "저속 모드(1.6Gbps) 500개 유닛 다이제스트 테스트 스크립트 실행 및 수율 통계 집계 요청.",
          etc: "agent / 시스템 요청; 테스트 스크립트 실행 및 통계 자동 집계 지시",
          category: "dev"
        },
        {
          id: "task-B_팀장-18",
          sheet_name: "B_팀장",
          start_time: "15:15",
          end_time: "16:30",
          task: "데이터 확인·결과보고",
          summary: "온도 챔버 85도 조건에서의 Fail 빈도 증가 데이터 확인 완료 보고.",
          etc: "messenger / 발신: B 팀장 → 수신: 관련자(H TL 등); 85°C 조건 데이터 확인 결과 통보",
          category: "review"
        },
        {
          id: "task-B_팀장-19",
          sheet_name: "B_팀장",
          start_time: "16:30",
          end_time: "17:15",
          task: "보고(중간)",
          summary: "일일 DRAM Fail 분석 중간 보고 전송—고온·고속 복합 조건에서의 타이밍 위반 원인 잠정 도출 및 데이터 정합성 검증 완료.",
          etc: "mail / 발신: B 팀장 → 수신: A 담당; 중간 분석 보고 이메일 발송",
          category: "meeting"
        },
        {
          id: "task-B_팀장-20",
          sheet_name: "B_팀장",
          start_time: "17:15",
          end_time: "17:45",
          task: "시스템 운영·백업 확인",
          summary: "퇴근 전 최종 로그 백업 및 서버 업로드 상태 확인 진행.",
          etc: "messenger / 발신: B 팀장; 서버 로그 백업 및 업로드 상태 점검 (퇴근 절차)",
          category: "break"
        }
      ]
    },
    {
      sheetName: "C_파트장",
      status: "draft",
      updatedAt: "2026-10-02 09:00",
      data: [
        {
          id: "task-C_파트장-21",
          sheet_name: "C_파트장",
          start_time: "08:40",
          end_time: "09:30",
          task: "데이터 분석",
          summary: "테스트 프로그램 v2.4의 스펙 위반 항목 우선 점검을 시작함.",
          etc: "messenger; 발신: C_파트장; 스펙 위반 항목 우선 확인 요청",
          category: "review"
        },
        {
          id: "task-C_파트장-22",
          sheet_name: "C_파트장",
          start_time: "09:30",
          end_time: "10:30",
          task: "연락",
          summary: "DRAM Test Program v2.4 관련 주요 규격 파라미터(tDQSQ, tQHS, tAA)에 대한 spec data 요청을 진행함.",
          etc: "agent; 발신: C_파트장(요청); 수신: 관련 데이터/엔지니어(명시 없음)",
          category: "meeting"
        },
        {
          id: "task-C_파트장-23",
          sheet_name: "C_파트장",
          start_time: "10:30",
          end_time: "11:20",
          task: "시뮬레이션/분석",
          summary: "고속 라우팅 구간 패키지 기판 트레이스의 인덕턴스·커패시턴스가 DRAM 고속 동작에 미치는 영향 조사 지시.",
          etc: "agent; 발신: C_파트장(요청); 수신: SI/PI 분석 담당(명시 없음)",
          category: "dev"
        },
        {
          id: "task-C_파트장-24",
          sheet_name: "C_파트장",
          start_time: "11:20",
          end_time: "12:10",
          task: "연락/지시",
          summary: "D TL 및 E TL에게 패키지 기판 레이아웃 기생 성분(인덕턴스) 시뮬레이션 수행을 지시함.",
          etc: "messenger; 발신: C_파트장; 수신: D TL, E TL; 지시사항: 인덕턴스 값 시뮬레이션",
          category: "meeting"
        },
        {
          id: "task-C_파트장-25",
          sheet_name: "C_파트장",
          start_time: "12:10",
          end_time: "13:40",
          task: "보고(이메일)",
          summary: "패키지 SI/PI 분석 중간 결과를 B 팀장에게 공유하고 전원 노이즈가 타이밍 마진 저하의 주원인으로 추정됨을 보고함.",
          etc: "mail; 발신: C_파트장; 수신: B 팀장; 특이사항: 중간 공유 보고서(전원 VDD/VSS 노이즈 관련)",
          category: "meeting"
        },
        {
          id: "task-C_파트장-26",
          sheet_name: "C_파트장",
          start_time: "13:40",
          end_time: "14:35",
          task: "연락/지시",
          summary: "오후에 Checkerboard 및 Walking 등 다른 데이터 패턴을 적용해 스트레스 테스트를 추가 진행하도록 지시함.",
          etc: "messenger; 발신: C_파트장; 수신: 테스트 팀; 지시패턴: Checkerboard, Walking",
          category: "meeting"
        },
        {
          id: "task-C_파트장-27",
          sheet_name: "C_파트장",
          start_time: "14:35",
          end_time: "15:30",
          task: "테스트",
          summary: "고속 IO 핀 대상 Walking 1s/0s 테스트 패턴을 적용하고 에러 비트맵 생성을 요청함.",
          etc: "agent; 발신: 테스트 요청(시스템/엔지니어); 수신: 테스트 실행 담당; 요청사항: 에러 비트맵 생성",
          category: "dev"
        },
        {
          id: "task-C_파트장-28",
          sheet_name: "C_파트장",
          start_time: "15:30",
          end_time: "16:40",
          task: "데이터 검토",
          summary: "신입 TL들이 정리한 Raw Data 스프레드시트 포맷을 검토하기 시작함.",
          etc: "messenger; 발신: C_파트장; 수신: 신입 TL들; 특이사항: Raw Data 스프레드시트 포맷 검토",
          category: "review"
        },
        {
          id: "task-C_파트장-29",
          sheet_name: "C_파트장",
          start_time: "16:40",
          end_time: "17:20",
          task: "보고(이메일)",
          summary: "파라미터 민감도 및 패턴별 Fail 특성 분석을 A 담당 및 B 팀장에게 완료보고하고 Walking 패턴에서 특정 IO 핀 충돌 현상 및 대안을 제시함.",
          etc: "mail; 발신: C_파트장; 수신: A 담당, B 팀장; 특이사항: 분석 완료보고, 대안 제시",
          category: "meeting"
        },
        {
          id: "task-C_파트장-30",
          sheet_name: "C_파트장",
          start_time: "17:20",
          end_time: "18:00",
          task: "문서 준비/정리",
          summary: "내일 회의에 사용될 자료를 최종 취합하고 18시까지 완료하겠다고 보고함.",
          etc: "messenger; 발신: C_파트장; 수신: 회의 준비 관련 팀; 완료기한: 18:00",
          category: "break"
        }
      ]
    }
  ]
};
