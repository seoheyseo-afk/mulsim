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
