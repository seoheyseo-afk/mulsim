import type {
  ConditionChecks,
  IntakeDraft,
  MulsimItem,
  RoomPlacement,
  StickerType,
} from "./types";

export const CATEGORIES = [
  "전자기기",
  "가구·인테리어",
  "정리·수납",
  "의류·패션잡화",
  "화장품·향수",
  "문구·도서·콘텐츠",
  "생활·주방",
  "취미·건강",
  "일상잡화",
];

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  가구: "가구·인테리어",
  수납용품: "정리·수납",
  "화장품/향수": "화장품·향수",
  생활소품: "일상잡화",
  취미용품: "취미·건강",
};

export const CATEGORY_PRESETS: Record<string, string[]> = {
  전자기기: ["전원 위치", "케이블 정리", "소모품", "기기 연결", "소음"],
  "가구·인테리어": ["배송 크기", "조립 난이도", "기존 물건 처분", "둘 자리", "방 분위기"],
  "정리·수납": ["둘 자리", "기존 물건 정리", "실제 수납 대상", "꺼내기 쉬움", "넘치지 않을 양"],
  "의류·패션잡화": ["보관 자리", "기존 옷과 겹침", "입을 상황", "관리 난이도", "계절성"],
  "화장품·향수": ["보관 자리", "기존 제품과 겹침", "사용 빈도", "향/성분 확인", "유통기한"],
  "문구·도서·콘텐츠": ["둘 자리", "읽거나 쓸 시간", "기존 자료와 겹침", "반복 사용", "구독 여부"],
  "생활·주방": ["사용 위치", "세척 난이도", "소모품 비용", "기존 물건과 겹침", "위생 관리"],
  "취미·건강": ["사용 시간", "보관 자리", "소모품 비용", "꾸준히 쓸지", "소음/공간"],
  일상잡화: ["청소 난이도", "기존 물건과 겹침", "자주 쓰는 위치", "보관 방식", "없어도 되는지"],
};

export function normalizeCategory(category: string) {
  return LEGACY_CATEGORY_MAP[category] ?? category;
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function createConditionChecks(category: string): ConditionChecks {
  const normalizedCategory = normalizeCategory(category);
  const preset = CATEGORY_PRESETS[normalizedCategory] ?? CATEGORY_PRESETS["일상잡화"];

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
