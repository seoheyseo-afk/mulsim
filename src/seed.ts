import type {
  ConditionChecks,
  IntakeDraft,
  MulsimItem,
  RoomPlacement,
  StickerType,
} from "./types";

export const CATEGORIES = ["전자기기", "가구", "화장품/향수", "수납용품", "생활소품", "취미용품"];

export const CATEGORY_PRESETS: Record<string, string[]> = {
  전자기기: ["전원 위치", "케이블 정리", "소모품", "기기 연결", "소음"],
  가구: ["배송 크기", "조립 난이도", "기존 물건 처분", "둘 자리"],
  "화장품/향수": ["보관 자리", "기존 제품과 겹침", "사용 빈도", "향/성분 확인"],
  수납용품: ["둘 자리", "기존 물건 정리", "실제 수납 대상", "꺼내기 쉬움"],
  생활소품: ["청소 난이도", "기존 물건과 겹침", "자주 쓰는 위치", "보관 방식"],
  취미용품: ["사용 시간", "보관 자리", "소모품 비용", "정리 방식"],
};

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function createConditionChecks(category: string): ConditionChecks {
  const preset = CATEGORY_PRESETS[category] ?? CATEGORY_PRESETS["생활소품"];

  return {
    installRequired: false,
    assemblyRequired: false,
    toolsRequired: false,
    soloInstallPossible: false,
    setupTimeRequired: false,
    extraPartsRequired: false,
    consumableCost: false,
    maintenanceAnnoying: false,
    disposalHard: false,
    categoryChecklist: preset.map((label) => ({
      id: makeId("check"),
      label,
      checked: false,
    })),
    memo: "",
  };
}

function sticker(
  stickerType: StickerType,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
  zIndex = 1,
  type: RoomPlacement["type"] = "furniture",
): RoomPlacement {
  return {
    id: makeId("place"),
    type,
    name,
    stickerType,
    x,
    y,
    width,
    height,
    rotation,
    zIndex,
    locked: false,
  };
}

export function defaultRoomPlacements(): RoomPlacement[] {
  return [
    sticker("bookshelf", "책장 1", 3, 68, 11, 18, 0, 5),
    sticker("bookshelf", "책장 2", 3, 53, 11, 18, 0, 5),
    sticker("bookshelf", "책장 3", 3, 38, 11, 18, 0, 5),
    sticker("bookshelf", "책장 4", 3, 23, 11, 18, 0, 5),
    sticker("triangle-desk", "삼각형 책상", 5.9, -0.9, 24, 28, 3, 4),
    sticker("chair", "의자", 13, -11, 19, 29, 0, 10),
    sticker("bed", "퀸사이즈 침대", 56.4, -0.9, 42, 62, 0, 6),
    sticker("mirror", "아치형 전신거울", 79, 47.2, 31, 45, 16, 9),
    sticker("console", "긴 콘솔", 58.8, 51.9, 28, 27, 0, 12),
    sticker("rug", "중앙 러그", 15.9, 27.6, 43, 33, 0, 3, "decor"),
    sticker("cushion", "침대 쿠션", 70.4, 1.5, 15, 19, -2, 14, "decor"),
    sticker("vase", "작은 화병", 60.7, 55.3, 12, 10, 0, 15, "decor"),
    sticker("perfume", "향수병", 78.9, 67.2, 7, 7, 0, 15, "decor"),
    sticker("plant", "꽃화분", 77, -23.9, 21, 25, 0, 14, "decor"),
  ];
}

export function createItemFromDraft(draft: IntakeDraft, imageId?: string): MulsimItem {
  const now = new Date().toISOString();

  return {
    id: makeId("item"),
    createdAt: now,
    updatedAt: now,
    name: draft.name.trim(),
    price: draft.price.trim(),
    link: draft.link.trim(),
    imageUrl: draft.imageUrl.trim(),
    imageId,
    imagePreview: { x: 0, y: 0, scale: 1 },
    category: draft.category,
    desireReason: draft.desireReason.trim(),
    expectedEffect: draft.expectedEffect.trim(),
    firstWantedDate: draft.firstWantedDate || today(),
    memo: draft.memo.trim(),
    status: "상담접수",
    visitDone: false,
    decorVisible: true,
    reasons: [],
    spaceCheck: {
      location: "",
      cleared: false,
      needsRemoval: false,
      hasStorage: false,
      easyAccess: false,
      tooSmall: false,
      memo: "",
    },
    conditionChecks: createConditionChecks(draft.category),
    placements: defaultRoomPlacements(),
    aftercare: [],
  };
}

export function createSampleItems(): MulsimItem[] {
  const base = [
    createItemFromDraft({
      name: "무소음 미니 가습기",
      price: "39000",
      link: "",
      imageUrl: "",
      category: "전자기기",
      desireReason: "겨울마다 책상 옆 공기가 건조해서 목이 따가웠다.",
      expectedEffect: "잘 때와 작업할 때 습도를 조금 더 편하게 유지한다.",
      firstWantedDate: "2026-04-18",
      memo: "전원 위치와 청소 주기를 꼭 확인하기.",
    }),
    createItemFromDraft({
      name: "아치형 수납 트레이",
      price: "18000",
      link: "",
      imageUrl: "",
      category: "수납용품",
      desireReason: "향수와 작은 소품이 긴 콘솔 위에서 자주 흐트러진다.",
      expectedEffect: "작은 물건의 자리가 정해져서 방이 덜 어수선해진다.",
      firstWantedDate: "2026-04-21",
      memo: "",
    }),
    createItemFromDraft({
      name: "딥로즈 쿠션 커버",
      price: "12000",
      link: "",
      imageUrl: "",
      category: "생활소품",
      desireReason: "침대 위 쿠션 색을 차분한 로즈 톤으로 맞추고 싶다.",
      expectedEffect: "기존 방 분위기와 더 잘 어울린다.",
      firstWantedDate: "2026-04-24",
      memo: "지금 있는 쿠션 솜 크기부터 확인.",
    }),
  ];

  base[0].status = "자리확인 필요";
  base[0].reasons = [
    {
      id: makeId("reason"),
      date: "2026-04-19",
      situation: "자고 일어난 뒤 목이 건조했다.",
      inconvenience: "물 마셔도 금방 다시 답답했다.",
      wouldSolve: true,
      discomfort: 4,
      recurrence: "높음",
      memo: "겨울뿐 아니라 환절기도 비슷함.",
    },
  ];
  base[0].conditionChecks.categoryChecklist[0].checked = true;
  base[0].conditionChecks.categoryChecklist[1].checked = true;

  base[1].status = "현장방문 대기";
  base[1].spaceCheck = {
    location: "침대 발쪽 긴 콘솔 위",
    cleared: true,
    needsRemoval: false,
    hasStorage: true,
    easyAccess: true,
    tooSmall: false,
    memo: "향수병 옆에 폭 20cm 정도 비워둠.",
  };
  base[1].reasons = [
    {
      id: makeId("reason"),
      date: "2026-04-22",
      situation: "외출 전 향수와 립밤을 찾느라 시간이 걸렸다.",
      inconvenience: "작은 물건이 콘솔 위에서 섞여 있었다.",
      wouldSolve: true,
      discomfort: 3,
      recurrence: "보통",
      memo: "",
    },
    {
      id: makeId("reason"),
      date: "2026-04-25",
      situation: "청소할 때 콘솔 위 물건을 한 번에 옮기기 어려웠다.",
      inconvenience: "병과 소품을 하나씩 치워야 했다.",
      wouldSolve: true,
      discomfort: 2,
      recurrence: "보통",
      memo: "트레이가 있으면 통째로 이동 가능.",
    },
  ];

  base[2].status = "필요사유 확인";
  return base;
}
