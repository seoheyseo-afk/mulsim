export type ItemStatus =
  | "상담접수"
  | "서류검토"
  | "필요사유 확인"
  | "자리확인 필요"
  | "입주조건 보완 필요"
  | "현장방문 대기"
  | "승인보류"
  | "입주승인 가능"
  | "입주완료"
  | "사후관리 대기"
  | "심사종료";

export type TabKey =
  | "기본정보"
  | "필요사유"
  | "자리확인"
  | "입주조건"
  | "현장방문"
  | "사후관리";

export type PlacementType = "structure" | "furniture" | "decor" | "item";

export type StickerType =
  | "balcony"
  | "curtain"
  | "bookshelf"
  | "triangle-desk"
  | "desk"
  | "chair"
  | "bed"
  | "console"
  | "mirror"
  | "rug"
  | "vase"
  | "perfume"
  | "plant"
  | "cushion"
  | "lamp"
  | "storage";

export interface NeedReason {
  id: string;
  date: string;
  situation: string;
  inconvenience: string;
  wouldSolve: boolean;
  discomfort: number;
  recurrence: "낮음" | "보통" | "높음";
  memo: string;
}

export interface SpaceCheck {
  location: string;
  cleared: boolean;
  needsRemoval: boolean;
  hasStorage: boolean;
  easyAccess: boolean;
  tooSmall: boolean;
  memo: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface ConditionChecks {
  readyToUse: boolean;
  manageableAlone: boolean;
  extrasChecked: boolean;
  timeAvailable: boolean;
  maintenanceReady: boolean;
  cleanupReady: boolean;
  categoryChecklist: ChecklistItem[];
  memo: string;
}

export interface RoomPlacement {
  id: string;
  type: PlacementType;
  name: string;
  stickerType?: StickerType;
  imageSrc?: string;
  imageId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
}

export interface AftercareRecord {
  id: string;
  period: "하루" | "한주" | "한달" | "세달" | "일년";
  date: string;
  usageCount: number;
  usingWell: boolean;
  placeOk: boolean;
  installEasy: boolean;
  wouldBuyAgain: boolean;
  regretReason: string;
  memo: string;
}

export interface ImagePreviewFrame {
  x: number;
  y: number;
  scale: number;
}

export interface MulsimItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  price: string;
  link: string;
  imageUrl: string;
  imageId?: string;
  uploadedImageDataUrl?: string;
  imagePreview?: ImagePreviewFrame;
  category: string;
  desireReason: string;
  expectedEffect: string;
  firstWantedDate: string;
  memo: string;
  status: ItemStatus;
  visitDone: boolean;
  decorVisible: boolean;
  reasons: NeedReason[];
  spaceCheck: SpaceCheck;
  conditionChecks: ConditionChecks;
  placements: RoomPlacement[];
  aftercare: AftercareRecord[];
}

export interface IntakeDraft {
  name: string;
  price: string;
  link: string;
  imageUrl: string;
  category: string;
  desireReason: string;
  expectedEffect: string;
  firstWantedDate: string;
  memo: string;
}
