import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleOff,
  ClipboardCheck,
  ClipboardList,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Home,
  ImagePlus,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  CATEGORIES,
  createConditionChecks,
  createItemFromDraft,
  defaultRoomPlacements,
  makeId,
  today,
} from "./seed";
import {
  getUploadedImage,
  loadCustomCategories,
  loadItems,
  saveCustomCategories,
  saveItems,
  saveUploadedImage,
} from "./storage";
import type {
  AftercareRecord,
  ConditionChecks,
  IntakeDraft,
  ImagePreviewFrame,
  ItemStatus,
  MulsimItem,
  NeedReason,
  RoomPlacement,
  SpaceCheck,
  StickerType,
  TabKey,
} from "./types";

const STATUS_OPTIONS: ItemStatus[] = [
  "상담접수",
  "서류검토",
  "필요사유 확인",
  "자리확인 필요",
  "입주조건 보완 필요",
  "현장방문 대기",
  "승인보류",
  "입주승인 가능",
  "입주완료",
  "사후관리 대기",
  "심사종료",
];

const STATUS_MESSAGES: Record<ItemStatus, string> = {
  상담접수: "상담접수표가 도착했어요. 천천히 살펴볼 차례예요.",
  서류검토: "기본 정보와 링크를 확인하고 있어요.",
  "필요사유 확인": "아직 필요사유가 충분히 쌓이지 않았어요.",
  "자리확인 필요": "아직 이 물건이 들어갈 자리가 정해지지 않았어요.",
  "입주조건 보완 필요": "입주 전에 확인할 조건이 조금 남아 있어요.",
  "현장방문 대기": "내 방에 잠깐 놓아볼 차례예요.",
  승인보류: "조금 더 지켜본 뒤 다시 심사해도 괜찮아요.",
  "입주승인 가능": "필요사유와 자리확인이 충분해요.",
  입주완료: "이 물건이 내 방에 들어왔어요.",
  "사후관리 대기": "실제로 잘 쓰고 있는지 확인할 때예요.",
  심사종료: "관심이 사라져 심사를 마무리했어요.",
};

const VISIT_NO_LONGER_REQUIRED_STATUSES: ItemStatus[] = ["입주완료", "사후관리 대기", "심사종료"];

function needsVisitCheck(item: MulsimItem) {
  return !VISIT_NO_LONGER_REQUIRED_STATUSES.includes(item.status);
}

function hasPendingVisit(item: MulsimItem) {
  return needsVisitCheck(item) && (item.status === "현장방문 대기" || !item.visitDone);
}

const TABS: TabKey[] = ["기본정보", "필요사유", "자리확인", "입주조건", "현장방문", "사후관리"];

const CONDITION_LABELS: Array<[keyof Omit<ConditionChecks, "categoryChecklist" | "memo">, string]> = [
  ["installRequired", "설치 필요"],
  ["assemblyRequired", "조립 필요"],
  ["toolsRequired", "공구 필요"],
  ["soloInstallPossible", "혼자 설치 가능"],
  ["setupTimeRequired", "세팅 시간 필요"],
  ["extraPartsRequired", "추가 부속품 필요"],
  ["consumableCost", "소모품 비용 있음"],
  ["maintenanceAnnoying", "유지관리 귀찮음"],
  ["disposalHard", "버릴 때 번거로움"],
];

const STICKER_PRESETS: Array<{
  stickerType: StickerType;
  name: string;
  type: RoomPlacement["type"];
  width: number;
  height: number;
}> = [
  { stickerType: "bookshelf", name: "책장", type: "furniture", width: 12, height: 18 },
  { stickerType: "triangle-desk", name: "삼각형 책상", type: "furniture", width: 22, height: 20 },
  { stickerType: "desk", name: "책상", type: "furniture", width: 62, height: 14 },
  { stickerType: "chair", name: "의자", type: "furniture", width: 12, height: 16 },
  { stickerType: "bed", name: "침대", type: "furniture", width: 24, height: 50 },
  { stickerType: "console", name: "긴 콘솔", type: "furniture", width: 26, height: 9 },
  { stickerType: "mirror", name: "전신거울", type: "furniture", width: 9, height: 17 },
  { stickerType: "rug", name: "러그", type: "decor", width: 34, height: 29 },
  { stickerType: "cushion", name: "쿠션", type: "decor", width: 10, height: 8 },
  { stickerType: "plant", name: "식물", type: "decor", width: 9, height: 12 },
  { stickerType: "vase", name: "화병", type: "decor", width: 6, height: 8 },
  { stickerType: "perfume", name: "향수병", type: "decor", width: 5, height: 7 },
  { stickerType: "lamp", name: "조명", type: "decor", width: 6, height: 9 },
  { stickerType: "storage", name: "수납함", type: "furniture", width: 14, height: 12 },
];

type ImageSources = Record<string, string>;

const initialDraft: IntakeDraft = {
  name: "",
  price: "",
  link: "",
  imageUrl: "",
  category: "생활소품",
  desireReason: "",
  expectedEffect: "",
  firstWantedDate: today(),
  memo: "",
};

function App() {
  const [items, setItems] = useState<MulsimItem[]>(() => loadItems() ?? []);
  const [customCategories, setCustomCategories] = useState<string[]>(() => loadCustomCategories());
  const [imageSources, setImageSources] = useState<ImageSources>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("기본정보");
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  useEffect(() => {
    saveCustomCategories(customCategories);
  }, [customCategories]);

  useEffect(() => {
    const ids = new Set<string>();
    items.forEach((item) => {
      if (item.imageId) {
        ids.add(item.imageId);
      }
      item.placements.forEach((placement) => {
        if (placement.imageId) {
          ids.add(placement.imageId);
        }
      });
    });

    const missing = [...ids].filter((id) => !(id in imageSources));
    if (missing.length === 0) {
      return;
    }

    let cancelled = false;
    Promise.all(
      missing.map(async (id) => {
        const dataUrl = await getUploadedImage(id);
        return dataUrl ? ([id, dataUrl] as const) : null;
      }),
    ).then((records) => {
      if (cancelled) {
        return;
      }
      setImageSources((current) => {
        const next = { ...current };
        records.forEach((record, index) => {
          if (record) {
            next[record[0]] = record[1];
          } else {
            next[missing[index]] = "";
          }
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [items, imageSources]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const categories = useMemo(
    () => mergeCategories([...CATEGORIES, ...customCategories, ...items.map((item) => item.category)]),
    [customCategories, items],
  );

  const addCategory = (name: string) => {
    const category = name.trim();
    if (!category) {
      return null;
    }

    setCustomCategories((current) => {
      const merged = mergeCategories([...CATEGORIES, ...current]);
      if (merged.includes(category)) {
        return current;
      }
      return [...current, category];
    });
    return category;
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setActiveTab("기본정보");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateItem = (id: string, updater: (item: MulsimItem) => MulsimItem) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...updater(item), updatedAt: new Date().toISOString() } : item,
      ),
    );
  };

  const createItem = async (draft: IntakeDraft, file: File | null) => {
    let imageId: string | undefined;
    if (file) {
      const uploaded = await saveUploadedImage(file);
      imageId = uploaded.id;
      setImageSources((current) => ({ ...current, [uploaded.id]: uploaded.dataUrl }));
    }

    const item = createItemFromDraft(draft, imageId);
    setItems((current) => [item, ...current]);
    setSelectedId(item.id);
    setActiveTab("기본정보");
    setIsIntakeOpen(false);
  };

  const uploadForItem = async (itemId: string, file: File) => {
    const uploaded = await saveUploadedImage(file);
    setImageSources((current) => ({ ...current, [uploaded.id]: uploaded.dataUrl }));
    updateItem(itemId, (item) => ({ ...item, imageId: uploaded.id }));
  };

  const withdrawItem = (itemId: string) => {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) {
      return;
    }

    if (window.confirm(`"${item.name}" 접수를 철회할까요?`)) {
      setItems((current) => current.filter((candidate) => candidate.id !== itemId));
      setSelectedId(null);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => setSelectedId(null)}>
          <span className="brand-logo">들일까</span>
          <span className="brand-badge">물건입주심사</span>
        </button>
        <button className="primary-button" type="button" onClick={() => setIsIntakeOpen(true)}>
          <Plus size={18} />
          상담접수
        </button>
      </header>

      <main>
        {selectedItem ? (
          <DetailPage
            item={selectedItem}
            categories={categories}
            imageSources={imageSources}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            onAddCategory={addCategory}
            onBack={() => setSelectedId(null)}
            onChange={(next) => updateItem(selectedItem.id, () => next)}
            onUploadImage={(file) => uploadForItem(selectedItem.id, file)}
            onWithdraw={() => withdrawItem(selectedItem.id)}
          />
        ) : (
          <HomePage
            items={items}
            imageSources={imageSources}
            onOpenIntake={() => setIsIntakeOpen(true)}
            onSelect={openDetail}
          />
        )}
      </main>

      {isIntakeOpen ? (
        <IntakeModal
          categories={categories}
          onAddCategory={addCategory}
          onClose={() => setIsIntakeOpen(false)}
          onCreate={createItem}
        />
      ) : null}
    </div>
  );
}

function HomePage({
  items,
  imageSources,
  onOpenIntake,
  onSelect,
}: {
  items: MulsimItem[];
  imageSources: ImageSources;
  onOpenIntake: () => void;
  onSelect: (id: string) => void;
}) {
  const hasItems = items.length > 0;
  const summary = useMemo(
    () => ({
      waiting: items.filter((item) => !["입주완료", "심사종료"].includes(item.status)).length,
      space: items.filter((item) => item.status === "자리확인 필요" || !item.spaceCheck.location).length,
      visit: items.filter(hasPendingVisit).length,
      aftercare: items.filter((item) => item.status === "사후관리 대기").length,
    }),
    [items],
  );

  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-logo">들일까</span>
          <span className="hero-badge">물건입주심사</span>
          <h1>{hasItems ? "오늘도 내 방에 들어오고 싶은 물건들이 기다리고 있어요." : "아직 접수된 물건이 없어요."}</h1>
          <div className="hero-actions">
            <button className="primary-button large" type="button" onClick={onOpenIntake}>
              <ClipboardList size={20} />
              상담접수
            </button>
          </div>
        </div>
        <HeroRoom />
      </section>

      <section className="summary-grid" aria-label="심사 요약">
        <SummaryCard label="심사대기" value={summary.waiting} icon={<ClipboardList size={21} />} />
        <SummaryCard label="자리확인 필요" value={summary.space} icon={<Home size={21} />} />
        <SummaryCard label="현장방문 대기" value={summary.visit} icon={<Sparkles size={21} />} />
        <SummaryCard label="사후관리 대기" value={summary.aftercare} icon={<CalendarDays size={21} />} />
      </section>

      <section className="list-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">심사대기함</span>
            <h2>접수된 물건</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onOpenIntake}>
            <Plus size={17} />
            상담접수
          </button>
        </div>

        {hasItems ? (
          <div className="item-grid">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                imageSrc={resolveItemImage(item, imageSources)}
                onSelect={() => onSelect(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-list">
            <PackageCheck size={36} />
            <div>
              <h3>아직 접수된 물건이 없어요.</h3>
              <p>필요한 물건이 생기면 상담접수로 심사를 시작하세요.</p>
            </div>
            <button className="primary-button" type="button" onClick={onOpenIntake}>
              <Plus size={17} />
              상담접수
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function HeroRoom() {
  return (
    <figure className="hero-room">
      <img src={`${import.meta.env.BASE_URL}home-room-cutout.png`} alt="분홍빛 아이소메트릭 방 일러스트" />
    </figure>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <article className="summary-card">
      <div className="summary-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ItemCard({
  item,
  imageSrc,
  onSelect,
}: {
  item: MulsimItem;
  imageSrc?: string;
  onSelect: () => void;
}) {
  const preview = normalizeImagePreview(item.imagePreview);
  const showVisitState = needsVisitCheck(item);

  return (
    <article className="item-card">
      <div className="item-image-wrap">
        {imageSrc ? (
          <img
            className="preview-image"
            src={imageSrc}
            alt={`${item.name} 사진`}
            style={previewImageStyle(preview)}
          />
        ) : (
          <div className="item-placeholder">
            <PackageCheck size={32} />
            <span>물건 사진</span>
          </div>
        )}
      </div>
      <div className="item-card-body">
        <div className="card-title-row">
          <h3>{item.name}</h3>
          <span className="status-badge">{item.status}</span>
        </div>
        <div className="item-meta">
          <span>{formatPrice(item.price)}</span>
          <span>심사 {daysSince(item.createdAt)}일째</span>
          <span>필요사유 {item.reasons.length}건</span>
        </div>
        <p>{STATUS_MESSAGES[item.status]}</p>
        <div className={showVisitState ? "card-footer" : "card-footer end-only"}>
          {showVisitState ? (
            <span className={item.visitDone ? "mini-badge good" : "mini-badge"}>{item.visitDone ? "현장방문 완료" : "현장방문 전"}</span>
          ) : null}
          <button className="text-button" type="button" onClick={onSelect}>
            심사 보기
          </button>
        </div>
      </div>
    </article>
  );
}

function IntakeModal({
  categories,
  onAddCategory,
  onClose,
  onCreate,
}: {
  categories: string[];
  onAddCategory: (name: string) => string | null;
  onClose: () => void;
  onCreate: (draft: IntakeDraft, file: File | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<IntakeDraft>(initialDraft);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateDraft = (key: keyof IntakeDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      return;
    }

    setIsSaving(true);
    await onCreate(draft, file);
    setIsSaving(false);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="intake-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">상담접수</span>
            <h2 id="intake-title">새 물건 접수표</h2>
          </div>
          <button className="icon-button" type="button" aria-label="닫기" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            물건 이름
            <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
          </label>
          <label>
            가격
            <input
              inputMode="numeric"
              value={draft.price}
              onChange={(event) => updateDraft("price", formatPriceInput(event.target.value))}
              placeholder="예: 12,000"
            />
          </label>
          <label>
            링크
            <input
              type="url"
              value={draft.link}
              onChange={(event) => updateDraft("link", event.target.value)}
              placeholder="https://"
            />
          </label>
          <CategoryField
            value={draft.category}
            categories={categories}
            onChange={(category) => updateDraft("category", category)}
            onAddCategory={onAddCategory}
          />
          <label>
            이미지 URL
            <input
              type="url"
              value={draft.imageUrl}
              onChange={(event) => updateDraft("imageUrl", event.target.value)}
              placeholder="https://example.com/item.png"
            />
          </label>
          <label>
            직접 이미지 업로드
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label>
            사고 싶어진 이유
            <textarea value={draft.desireReason} onChange={(event) => updateDraft("desireReason", event.target.value)} />
          </label>
          <label>
            기대하는 효과
            <textarea value={draft.expectedEffect} onChange={(event) => updateDraft("expectedEffect", event.target.value)} />
          </label>
          <label>
            처음 사고 싶어진 날짜
            <input
              type="date"
              value={draft.firstWantedDate}
              onChange={(event) => updateDraft("firstWantedDate", event.target.value)}
            />
          </label>
          <label className="span-2">
            메모
            <textarea value={draft.memo} onChange={(event) => updateDraft("memo", event.target.value)} />
          </label>

          <p className="notice span-2">
            투명 배경 PNG 이미지를 올리면 현장방문 화면에서 더 예쁘게 배치할 수 있어요. 배경 제거는 remove.bg,
            Adobe Express, Photoroom 같은 외부 도구를 이용해 주세요.
          </p>

          <div className="modal-actions span-2">
            <button className="ghost-button" type="button" onClick={onClose}>
              취소
            </button>
            <button className="primary-button" type="submit" disabled={isSaving}>
              <Save size={17} />
              {isSaving ? "접수 중" : "상담접수"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CategoryField({
  value,
  categories,
  onChange,
  onAddCategory,
}: {
  value: string;
  categories: string[];
  onChange: (category: string) => void;
  onAddCategory: (name: string) => string | null;
}) {
  const [newCategory, setNewCategory] = useState("");

  const handleAdd = () => {
    const category = onAddCategory(newCategory);
    if (!category) {
      return;
    }

    onChange(category);
    setNewCategory("");
  };

  return (
    <div className="category-field">
      <label>
        카테고리
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <div className="category-add-row">
        <input
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
          placeholder="새 카테고리"
          aria-label="새 카테고리"
        />
        <button className="soft-button category-add-button" type="button" onClick={handleAdd}>
          <Plus size={16} />
          카테고리 추가
        </button>
      </div>
    </div>
  );
}

function DetailPage({
  item,
  categories,
  imageSources,
  activeTab,
  onActiveTabChange,
  onAddCategory,
  onBack,
  onChange,
  onUploadImage,
  onWithdraw,
}: {
  item: MulsimItem;
  categories: string[];
  imageSources: ImageSources;
  activeTab: TabKey;
  onActiveTabChange: (tab: TabKey) => void;
  onAddCategory: (name: string) => string | null;
  onBack: () => void;
  onChange: (item: MulsimItem) => void;
  onUploadImage: (file: File) => Promise<void>;
  onWithdraw: () => void;
}) {
  const imageSrc = resolveItemImage(item, imageSources);
  const showVisitState = needsVisitCheck(item);

  const updateStatus = (status: ItemStatus) => onChange({ ...item, status });

  return (
    <div className="detail-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        심사대기함
      </button>

      <section className="detail-hero">
        <div className="detail-image">
          {imageSrc ? (
            <img src={imageSrc} alt={`${item.name} 사진`} />
          ) : (
            <div className="item-placeholder large">
              <ImagePlus size={36} />
              <span>이미지 대기</span>
            </div>
          )}
        </div>
        <div className="detail-copy">
          <div className="detail-title-row">
            <div>
              <span className="eyebrow">{item.category}</span>
              <h1>{item.name}</h1>
            </div>
            <span className="status-badge large">{item.status}</span>
          </div>
          <p>{STATUS_MESSAGES[item.status]}</p>
          <div className="detail-stats">
            <span>{formatPrice(item.price)}</span>
            <span>심사 {daysSince(item.createdAt)}일째</span>
            <span>필요사유 {item.reasons.length}건</span>
            {showVisitState ? <span>{item.visitDone ? "현장방문 완료" : "현장방문 전"}</span> : null}
          </div>
          <div className="status-controls">
            <label>
              상태 변경
              <select value={item.status} onChange={(event) => updateStatus(event.target.value as ItemStatus)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <div className="quick-actions">
              <button className="soft-button" type="button" onClick={() => updateStatus("승인보류")}>
                승인보류
              </button>
              <button className="soft-button" type="button" onClick={() => updateStatus("입주승인 가능")}>
                입주승인
              </button>
              <button className="soft-button" type="button" onClick={() => updateStatus("입주완료")}>
                입주완료
              </button>
              <button className="soft-button" type="button" onClick={() => updateStatus("심사종료")}>
                심사종료
              </button>
            </div>
          </div>
        </div>
      </section>

      <nav className="tab-bar" aria-label="물건 상세 탭">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? "tab-button active" : "tab-button"}
            type="button"
            onClick={() => onActiveTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="tab-panel">
        {activeTab === "기본정보" ? (
          <BasicInfoTab
            item={item}
            categories={categories}
            imageSrc={imageSrc}
            onAddCategory={onAddCategory}
            onChange={onChange}
            onUploadImage={onUploadImage}
            onWithdraw={onWithdraw}
          />
        ) : null}
        {activeTab === "필요사유" ? <NeedReasonTab item={item} onChange={onChange} /> : null}
        {activeTab === "자리확인" ? <SpaceCheckTab item={item} onChange={onChange} /> : null}
        {activeTab === "입주조건" ? <ConditionsTab item={item} onChange={onChange} /> : null}
        {activeTab === "현장방문" ? (
          <RoomPlanner item={item} imageSources={imageSources} onChange={onChange} />
        ) : null}
        {activeTab === "사후관리" ? <AftercareTab item={item} onChange={onChange} /> : null}
      </section>
    </div>
  );
}

function BasicInfoTab({
  item,
  categories,
  imageSrc,
  onAddCategory,
  onChange,
  onUploadImage,
  onWithdraw,
}: {
  item: MulsimItem;
  categories: string[];
  imageSrc?: string;
  onAddCategory: (name: string) => string | null;
  onChange: (item: MulsimItem) => void;
  onUploadImage: (file: File) => Promise<void>;
  onWithdraw: () => void;
}) {
  const setField = (key: keyof MulsimItem, value: string) => {
    onChange({ ...item, [key]: value });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onUploadImage(file);
      event.target.value = "";
    }
  };

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-heading">
          <ClipboardCheck size={19} />
          <h2>기본정보</h2>
        </div>
        <div className="form-grid compact">
          <label>
            물건 이름
            <input value={item.name} onChange={(event) => setField("name", event.target.value)} />
          </label>
          <label>
            가격
            <input
              inputMode="numeric"
              value={formatPriceInput(item.price)}
              onChange={(event) => setField("price", formatPriceInput(event.target.value))}
            />
          </label>
          <label>
            링크
            <input value={item.link} onChange={(event) => setField("link", event.target.value)} />
          </label>
          <CategoryField
            value={item.category}
            categories={categories}
            onChange={(category) => {
              onChange({
                ...item,
                category,
                conditionChecks: {
                  ...item.conditionChecks,
                  categoryChecklist: createConditionChecks(category).categoryChecklist,
                },
              });
            }}
            onAddCategory={onAddCategory}
          />
          <label>
            이미지 URL
            <input value={item.imageUrl} onChange={(event) => setField("imageUrl", event.target.value)} />
          </label>
          <label>
            이미지 업로드
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleUpload} />
          </label>
          {imageSrc ? (
            <ImagePreviewEditor
              frame={normalizeImagePreview(item.imagePreview)}
              imageSrc={imageSrc}
              onChange={(imagePreview) => onChange({ ...item, imagePreview })}
            />
          ) : null}
          <label>
            사고 싶어진 이유
            <textarea value={item.desireReason} onChange={(event) => setField("desireReason", event.target.value)} />
          </label>
          <label>
            기대하는 효과
            <textarea value={item.expectedEffect} onChange={(event) => setField("expectedEffect", event.target.value)} />
          </label>
          <label>
            처음 사고 싶어진 날짜
            <input type="date" value={item.firstWantedDate} onChange={(event) => setField("firstWantedDate", event.target.value)} />
          </label>
          <label className="span-2">
            메모
            <textarea value={item.memo} onChange={(event) => setField("memo", event.target.value)} />
          </label>
        </div>
      </section>

      <aside className="panel decision-panel">
        <div className="panel-heading">
          <CircleOff size={19} />
          <h2>접수관리</h2>
        </div>
        <p>접수철회는 이 물건의 심사 기록을 심사대기함에서 제거합니다.</p>
        <button className="danger-button" type="button" onClick={onWithdraw}>
          <Trash2 size={17} />
          접수철회
        </button>
      </aside>
    </div>
  );
}

function ImagePreviewEditor({
  imageSrc,
  frame,
  onChange,
}: {
  imageSrc: string;
  frame: ImagePreviewFrame;
  onChange: (frame: ImagePreviewFrame) => void;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
  } | null>(null);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: frame.x,
      originY: frame.y,
      width: rect.width,
      height: rect.height,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const nextX = clamp(drag.originX + ((event.clientX - drag.startX) / drag.width) * 100, -90, 90);
    const nextY = clamp(drag.originY + ((event.clientY - drag.startY) / drag.height) * 100, -90, 90);
    onChange({ ...frame, x: nextX, y: nextY });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  return (
    <div className="image-preview-editor span-2">
      <div className="image-preview-header">
        <span>홈 카드 사진 위치</span>
        <button className="ghost-button" type="button" onClick={() => onChange({ x: 0, y: 0, scale: 1 })}>
          <RotateCcw size={15} />
          초기화
        </button>
      </div>
      <div
        className="preview-editor-frame"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img src={imageSrc} alt="" draggable={false} style={previewImageStyle(frame)} />
      </div>
      <label className="preview-scale-control">
        확대
        <input
          type="range"
          min="0.75"
          max="2.8"
          step="0.05"
          value={frame.scale}
          onChange={(event) => onChange({ ...frame, scale: Number(event.target.value) })}
        />
        <span className="range-value">{Math.round(frame.scale * 100)}%</span>
      </label>
    </div>
  );
}

function NeedReasonTab({ item, onChange }: { item: MulsimItem; onChange: (item: MulsimItem) => void }) {
  const [draft, setDraft] = useState<Omit<NeedReason, "id">>({
    date: today(),
    situation: "",
    inconvenience: "",
    wouldSolve: true,
    discomfort: 3,
    recurrence: "보통",
    memo: "",
  });

  const updateDraft = <K extends keyof Omit<NeedReason, "id">>(key: K, value: Omit<NeedReason, "id">[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addReason = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.situation.trim() && !draft.inconvenience.trim()) {
      return;
    }

    onChange({
      ...item,
      reasons: [{ id: makeId("reason"), ...draft }, ...item.reasons],
      status: item.status === "상담접수" ? "필요사유 확인" : item.status,
    });
    setDraft({
      date: today(),
      situation: "",
      inconvenience: "",
      wouldSolve: true,
      discomfort: 3,
      recurrence: "보통",
      memo: "",
    });
  };

  const removeReason = (id: string) => {
    onChange({ ...item, reasons: item.reasons.filter((reason) => reason.id !== id) });
  };

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-heading">
          <ClipboardList size={19} />
          <h2>필요사유 기록</h2>
        </div>
        <form className="form-grid compact" onSubmit={addReason}>
          <label>
            날짜
            <input type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
          </label>
          <label>
            불편 정도
            <input
              type="range"
              min="1"
              max="5"
              value={draft.discomfort}
              onChange={(event) => updateDraft("discomfort", Number(event.target.value))}
            />
            <span className="range-value">{draft.discomfort}/5</span>
          </label>
          <label>
            반복될 가능성
            <select value={draft.recurrence} onChange={(event) => updateDraft("recurrence", event.target.value as NeedReason["recurrence"])}>
              <option>낮음</option>
              <option>보통</option>
              <option>높음</option>
            </select>
          </label>
          <label className="check-label inline">
            <input
              type="checkbox"
              checked={draft.wouldSolve}
              onChange={(event) => updateDraft("wouldSolve", event.target.checked)}
            />
            이 물건이 있으면 해결됐을지
          </label>
          <label>
            어떤 상황이었는지
            <textarea value={draft.situation} onChange={(event) => updateDraft("situation", event.target.value)} />
          </label>
          <label>
            무엇이 불편했는지
            <textarea value={draft.inconvenience} onChange={(event) => updateDraft("inconvenience", event.target.value)} />
          </label>
          <label className="span-2">
            메모
            <textarea value={draft.memo} onChange={(event) => updateDraft("memo", event.target.value)} />
          </label>
          <div className="span-2 form-actions">
            <button className="primary-button" type="submit">
              <Plus size={17} />
              필요사유 추가
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <CheckCircle2 size={19} />
          <h2>기록 {item.reasons.length}건</h2>
        </div>
        <div className="record-list">
          {item.reasons.length === 0 ? <p className="empty-copy">아직 기록된 필요사유가 없어요.</p> : null}
          {item.reasons.map((reason) => (
            <article className="record-card" key={reason.id}>
              <div className="record-topline">
                <strong>{reason.date}</strong>
                <button className="icon-button small" type="button" aria-label="필요사유 삭제" onClick={() => removeReason(reason.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
              <p>{reason.situation || "상황 미입력"}</p>
              <dl className="record-meta">
                <div>
                  <dt>불편</dt>
                  <dd>{reason.inconvenience || "미입력"}</dd>
                </div>
                <div>
                  <dt>정도</dt>
                  <dd>{reason.discomfort}/5</dd>
                </div>
                <div>
                  <dt>반복</dt>
                  <dd>{reason.recurrence}</dd>
                </div>
              </dl>
              {reason.memo ? <p className="memo-copy">{reason.memo}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SpaceCheckTab({ item, onChange }: { item: MulsimItem; onChange: (item: MulsimItem) => void }) {
  const updateSpace = <K extends keyof SpaceCheck>(key: K, value: SpaceCheck[K]) => {
    const next = { ...item.spaceCheck, [key]: value };
    onChange({
      ...item,
      spaceCheck: next,
      status: key === "location" && String(value).trim() ? "입주조건 보완 필요" : item.status,
    });
  };

  return (
    <section className="panel narrow-panel">
      <div className="panel-heading">
        <Home size={19} />
        <h2>자리확인</h2>
      </div>
      <div className="form-grid compact">
        <label className="span-2">
          둘 위치
          <input
            value={item.spaceCheck.location}
            onChange={(event) => updateSpace("location", event.target.value)}
            placeholder="예: 침대 발쪽 긴 콘솔 위"
          />
        </label>
        <CheckRow label="자리를 이미 비웠는지" checked={item.spaceCheck.cleared} onChange={(checked) => updateSpace("cleared", checked)} />
        <CheckRow label="기존 물건을 치워야 하는지" checked={item.spaceCheck.needsRemoval} onChange={(checked) => updateSpace("needsRemoval", checked)} />
        <CheckRow label="사용하지 않을 때 보관할 곳이 있는지" checked={item.spaceCheck.hasStorage} onChange={(checked) => updateSpace("hasStorage", checked)} />
        <CheckRow label="꺼내기 쉬운 위치인지" checked={item.spaceCheck.easyAccess} onChange={(checked) => updateSpace("easyAccess", checked)} />
        <CheckRow label="공간이 부족한지" checked={item.spaceCheck.tooSmall} onChange={(checked) => updateSpace("tooSmall", checked)} />
        <label className="span-2">
          메모
          <textarea value={item.spaceCheck.memo} onChange={(event) => updateSpace("memo", event.target.value)} />
        </label>
      </div>
    </section>
  );
}

function ConditionsTab({ item, onChange }: { item: MulsimItem; onChange: (item: MulsimItem) => void }) {
  const updateCondition = <K extends keyof ConditionChecks>(key: K, value: ConditionChecks[K]) => {
    onChange({
      ...item,
      conditionChecks: { ...item.conditionChecks, [key]: value },
      status: item.status === "자리확인 필요" ? "입주조건 보완 필요" : item.status,
    });
  };

  const updateCategoryCheck = (id: string, checked: boolean) => {
    updateCondition(
      "categoryChecklist",
      item.conditionChecks.categoryChecklist.map((check) => (check.id === id ? { ...check, checked } : check)),
    );
  };

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-heading">
          <SlidersHorizontal size={19} />
          <h2>입주조건</h2>
        </div>
        <div className="check-grid">
          {CONDITION_LABELS.map(([key, label]) => (
            <CheckRow
              key={key}
              label={label}
              checked={Boolean(item.conditionChecks[key])}
              onChange={(checked) => updateCondition(key, checked)}
            />
          ))}
        </div>
        <label className="full-label">
          메모
          <textarea
            value={item.conditionChecks.memo}
            onChange={(event) => updateCondition("memo", event.target.value)}
          />
        </label>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <ClipboardCheck size={19} />
          <h2>{item.category} 체크리스트</h2>
        </div>
        <div className="check-grid single">
          {item.conditionChecks.categoryChecklist.map((check) => (
            <CheckRow key={check.id} label={check.label} checked={check.checked} onChange={(checked) => updateCategoryCheck(check.id, checked)} />
          ))}
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() =>
            updateCondition("categoryChecklist", createConditionChecks(item.category).categoryChecklist)
          }
        >
          <RotateCcw size={16} />
          기본 체크리스트 다시 불러오기
        </button>
      </section>
    </div>
  );
}

function RoomPlanner({
  item,
  imageSources,
  onChange,
}: {
  item: MulsimItem;
  imageSources: ImageSources;
  onChange: (item: MulsimItem) => void;
}) {
  const placementLayerRef = useRef<HTMLDivElement | null>(null);
  const roomShellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);

  const selectedPlacement = item.placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const itemImage = resolveItemImage(item, imageSources);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const placementLayer = placementLayerRef.current;
      if (!drag || !placementLayer) {
        return;
      }

      const rect = placementLayer.getBoundingClientRect();
      const dx = ((event.clientX - drag.startX) / rect.width) * 100;
      const dy = ((event.clientY - drag.startY) / rect.height) * 100;
      const bounds = getPlacementBounds(drag.width, drag.height);
      const nextX = clamp(drag.originX + dx, bounds.minX, bounds.maxX);
      const nextY = clamp(drag.originY + dy, bounds.minY, bounds.maxY);

      onChange({
        ...item,
        placements: item.placements.map((placement) =>
          placement.id === drag.id ? { ...placement, x: nextX, y: nextY } : placement,
        ),
      });
    };

    const handleUp = () => {
      dragRef.current = null;
      document.body.classList.remove("dragging-room-item");
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [item, onChange]);

  const updatePlacement = (id: string, patch: Partial<RoomPlacement>) => {
    onChange({
      ...item,
      placements: item.placements.map((placement) => (placement.id === id ? { ...placement, ...patch } : placement)),
    });
  };

  const addSticker = (preset: (typeof STICKER_PRESETS)[number]) => {
    const maxZ = Math.max(20, ...item.placements.map((placement) => placement.zIndex));
    const placement: RoomPlacement = {
      id: makeId("place"),
      type: preset.type,
      name: preset.name,
      stickerType: preset.stickerType,
      x: 42,
      y: 42,
      width: preset.width,
      height: preset.height,
      rotation: 0,
      zIndex: maxZ + 1,
      locked: false,
    };
    onChange({ ...item, placements: [...item.placements, placement] });
    setSelectedPlacementId(placement.id);
  };

  const addProductSticker = () => {
    const maxZ = Math.max(20, ...item.placements.map((placement) => placement.zIndex));
    const placement: RoomPlacement = {
      id: makeId("place"),
      type: "item",
      name: item.name,
      imageSrc: item.imageUrl || undefined,
      imageId: item.imageId,
      x: 44,
      y: 38,
      width: 16,
      height: 16,
      rotation: 0,
      zIndex: maxZ + 1,
      locked: false,
    };
    onChange({
      ...item,
      placements: [...item.placements, placement],
      visitDone: true,
      status: item.status === "입주조건 보완 필요" ? "현장방문 대기" : item.status,
    });
    setSelectedPlacementId(placement.id);
  };

  const removeSelected = () => {
    if (!selectedPlacement) {
      return;
    }
    onChange({
      ...item,
      placements: item.placements.filter((placement) => placement.id !== selectedPlacement.id),
    });
    setSelectedPlacementId(null);
  };

  const handlePointerDown = (event: ReactPointerEvent, placement: RoomPlacement) => {
    if (placement.locked) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setSelectedPlacementId(placement.id);
    dragRef.current = {
      id: placement.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: placement.x,
      originY: placement.y,
      width: placement.width,
      height: placement.height,
    };
    document.body.classList.add("dragging-room-item");
  };

  const visiblePlacements = item.decorVisible
    ? item.placements
    : item.placements.filter((placement) => placement.type !== "decor");

  return (
    <div className="room-planner">
      <section className="room-toolbar panel">
        <div className="visit-pass-card">
          <CheckRow
            label="실제로 쓰는 장면을 떠올려봤어요"
            checked={item.visitDone}
            onChange={(checked) => onChange({ ...item, visitDone: checked })}
          />
        </div>
        <div className="toolbar-row">
          <button className="primary-button" type="button" onClick={addProductSticker}>
            <Sparkles size={17} />
            잠깐 들여보기
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => onChange({ ...item, decorVisible: !item.decorVisible })}
          >
            {item.decorVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            {item.decorVisible ? "장식 숨기기" : "장식 보이기"}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => onChange({ ...item, placements: defaultRoomPlacements(), visitDone: false })}
          >
            <RotateCcw size={17} />
            샘플 방
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => onChange({ ...item, placements: [], visitDone: false })}
          >
            <Eraser size={17} />빈 방
          </button>
          <button className="ghost-button" type="button" onClick={() => void downloadSnapshot(roomShellRef.current, item.name)}>
            <Download size={17} />
            스냅샷 저장
          </button>
        </div>
        <div className="sticker-palette" aria-label="기본 가구와 장식 스티커">
          {STICKER_PRESETS.map((preset) => (
            <button key={`${preset.stickerType}-${preset.name}`} type="button" onClick={() => addSticker(preset)}>
              {preset.name}
            </button>
          ))}
        </div>
        {!itemImage ? (
          <p className="notice">물건 이미지가 없어도 배치는 가능해요. 이미지 URL이나 업로드를 추가하면 스티커처럼 표시됩니다.</p>
        ) : null}
      </section>

      <section className="room-workbench">
        <div className="room-shell" ref={roomShellRef} onPointerDown={() => setSelectedPlacementId(null)}>
          <div className="wall-panel back-wall">
            <div className="balcony-window" />
          </div>
          <div className="wall-panel left-wall" />
          <div className="wall-panel right-wall" />
          <div className="room-floor">
            <div className="floor-lines" />
          </div>
          <div className="room-placement-layer" ref={placementLayerRef}>
            {visiblePlacements.map((placement) => (
              <div
                key={placement.id}
                className={[
                  "room-placement",
                  placement.id === selectedPlacementId ? "selected" : "",
                  placement.locked ? "locked" : "",
                  `type-${placement.type}`,
                ].join(" ")}
                style={{
                  left: `${placement.x}%`,
                  top: `${placement.y}%`,
                  width: `${placement.width}%`,
                  height: `${placement.height}%`,
                  zIndex: placement.zIndex,
                  transform: `rotate(${placement.rotation}deg)`,
                }}
                onPointerDown={(event) => handlePointerDown(event, placement)}
              >
                <StickerVisual placement={placement} imageSources={imageSources} />
              </div>
            ))}
          </div>
        </div>

        <aside className="placement-panel panel">
          <div className="panel-heading">
            <Sparkles size={19} />
            <h2>배치 조정</h2>
          </div>
          {selectedPlacement ? (
            <div className="placement-controls">
              <label>
                이름
                <input value={selectedPlacement.name} onChange={(event) => updatePlacement(selectedPlacement.id, { name: event.target.value })} />
              </label>
              <div className="position-readout" aria-label="현재 위치값">
                <span>x {selectedPlacement.x.toFixed(1)}</span>
                <span>y {selectedPlacement.y.toFixed(1)}</span>
              </div>
              <RangeControl
                label="가로"
                min={4}
                max={90}
                value={selectedPlacement.width}
                onChange={(value) => updatePlacement(selectedPlacement.id, { width: value })}
              />
              <RangeControl
                label="세로"
                min={4}
                max={90}
                value={selectedPlacement.height}
                onChange={(value) => updatePlacement(selectedPlacement.id, { height: value })}
              />
              <RangeControl
                label="회전"
                min={-180}
                max={180}
                value={selectedPlacement.rotation}
                onChange={(value) => updatePlacement(selectedPlacement.id, { rotation: value })}
              />
              <RangeControl
                label="층"
                min={1}
                max={80}
                value={selectedPlacement.zIndex}
                onChange={(value) => updatePlacement(selectedPlacement.id, { zIndex: value })}
              />
              <CheckRow
                label="위치 고정"
                checked={selectedPlacement.locked}
                onChange={(checked) => updatePlacement(selectedPlacement.id, { locked: checked })}
              />
              <button className="danger-button" type="button" onClick={removeSelected}>
                <Trash2 size={17} />
                삭제
              </button>
            </div>
          ) : (
            <p className="empty-copy">스티커를 선택하면 크기, 회전, 층을 조정할 수 있어요.</p>
          )}
        </aside>
      </section>
    </div>
  );
}

function StickerVisual({ placement, imageSources }: { placement: RoomPlacement; imageSources: ImageSources }) {
  const src = placement.imageId ? imageSources[placement.imageId] : placement.imageSrc;

  if (placement.type === "item" && src) {
    return <img className="placement-image" src={src} alt={placement.name} draggable={false} />;
  }

  if (placement.type === "item") {
    return (
      <div className="sticker-shape item-fallback">
        <PackageCheck size={22} />
        <span>{placement.name}</span>
      </div>
    );
  }

  return <SimpleStickerArt stickerType={placement.stickerType} name={placement.name} />;
}

function SimpleStickerArt({ stickerType, name }: { stickerType?: StickerType; name: string }) {
  const common = {
    className: `simple-sticker simple-sticker-${stickerType ?? "default"}`,
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    role: "img",
    "aria-label": name,
  };

  switch (stickerType) {
    case "bed":
      return (
        <svg {...common}>
          <rect x="10" y="5" width="80" height="90" rx="13" fill="#fff9fa" stroke="#8f5267" strokeWidth="4" />
          <rect x="17" y="10" width="66" height="82" rx="10" fill="#ffffff" />
          <path d="M17 48h66v38c-20 8-46 8-66 0z" fill="#c98fa2" />
          <path d="M17 48c19 8 47 8 66 0" fill="none" stroke="#e7bac5" strokeWidth="5" />
        </svg>
      );
    case "bookshelf":
      return (
        <svg {...common}>
          <rect x="8" y="5" width="84" height="90" rx="6" fill="#fff9fa" stroke="#8f5267" strokeWidth="4" />
          {[28, 52, 76].map((y) => (
            <line key={y} x1="12" y1={y} x2="88" y2={y} stroke="#d6a0af" strokeWidth="4" />
          ))}
          {[18, 29, 40, 58, 70].map((x, index) => (
            <rect key={x} x={x} y={14 + (index % 2) * 4} width="7" height="14" rx="2" fill={index % 2 ? "#c98fa2" : "#8f5267"} />
          ))}
          {[18, 33, 52, 66].map((x, index) => (
            <rect key={x} x={x} y={38 + (index % 2) * 4} width="9" height="13" rx="2" fill={index % 2 ? "#8f5267" : "#c98fa2"} />
          ))}
          {[20, 36, 53, 72].map((x, index) => (
            <rect key={x} x={x} y={62 + (index % 2) * 4} width="8" height="14" rx="2" fill={index % 2 ? "#c98fa2" : "#e8d9df"} />
          ))}
        </svg>
      );
    case "triangle-desk":
      return (
        <svg {...common}>
          <path d="M8 8v84h86z" fill="#fff6f8" stroke="#8f5267" strokeWidth="4" strokeLinejoin="round" />
          <path d="M16 20v60h60z" fill="#efd5dd" opacity=".78" />
        </svg>
      );
    case "desk":
      return <div className="plain-desk-sticker" role="img" aria-label={name} />;
    case "chair":
      return (
        <svg {...common}>
          <rect x="25" y="8" width="50" height="47" rx="18" fill="#d899aa" stroke="#8f5267" strokeWidth="4" />
          <rect x="22" y="48" width="56" height="27" rx="13" fill="#c98fa2" stroke="#8f5267" strokeWidth="4" />
          <line x1="50" y1="75" x2="50" y2="93" stroke="#8f5267" strokeWidth="5" strokeLinecap="round" />
          <path d="M30 95h40M50 90 36 99M50 90l14 9" stroke="#8f5267" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "console":
      return (
        <svg {...common}>
          <rect x="6" y="30" width="88" height="40" rx="8" fill="#fff6f8" stroke="#8f5267" strokeWidth="4" />
          <path d="M10 68h80v14H10z" fill="#e8b9c5" />
          <line x1="20" y1="80" x2="16" y2="98" stroke="#8f5267" strokeWidth="4" strokeLinecap="round" />
          <line x1="80" y1="80" x2="84" y2="98" stroke="#8f5267" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "mirror":
      return (
        <svg {...common}>
          <path d="M18 96V42C18 18 34 5 50 5s32 13 32 37v54z" fill="#d9a1b1" stroke="#8f5267" strokeWidth="5" />
          <path d="M28 88V43c0-16 11-27 22-27s22 11 22 27v45z" fill="#fff" opacity=".78" />
        </svg>
      );
    case "rug":
      return (
        <svg {...common}>
          <ellipse cx="50" cy="52" rx="43" ry="34" fill="#f0beca" stroke="#d99aac" strokeWidth="4" />
          <ellipse cx="50" cy="52" rx="29" ry="22" fill="#fff9fa" opacity=".7" />
        </svg>
      );
    case "vase":
      return (
        <svg {...common}>
          <path d="M36 30h28l-5 22c14 8 12 41-9 41s-23-33-9-41z" fill="#fff9fa" stroke="#8f5267" strokeWidth="5" />
          <path d="M43 31c-6-15-16-16-21-6M55 31c6-15 17-16 22-6" fill="none" stroke="#c98fa2" strokeWidth="5" strokeLinecap="round" />
          <circle cx="22" cy="24" r="6" fill="#f0beca" />
          <circle cx="78" cy="24" r="6" fill="#d99aac" />
        </svg>
      );
    case "perfume":
      return (
        <svg {...common}>
          <rect x="40" y="12" width="20" height="16" rx="3" fill="#8f5267" />
          <rect x="28" y="27" width="44" height="60" rx="12" fill="#fff9fa" stroke="#8f5267" strokeWidth="5" />
          <rect x="38" y="49" width="24" height="20" rx="6" fill="#f0beca" />
        </svg>
      );
    case "plant":
      return (
        <svg {...common}>
          <path d="M27 60h46l-8 34H35z" fill="#d99aac" stroke="#8f5267" strokeWidth="4" strokeLinejoin="round" />
          <path d="M50 61c-10-14-18-23-8-32M52 61c12-14 23-23 31-12M50 61c0-20 11-32 21-25" fill="none" stroke="#8f5267" strokeWidth="4" strokeLinecap="round" />
          <circle cx="40" cy="29" r="8" fill="#f0beca" />
          <circle cx="72" cy="36" r="8" fill="#c98fa2" />
          <circle cx="60" cy="25" r="6" fill="#fff9fa" stroke="#d99aac" strokeWidth="3" />
        </svg>
      );
    case "cushion":
      return (
        <svg {...common}>
          <rect x="18" y="25" width="64" height="50" rx="18" fill="#c98fa2" stroke="#8f5267" strokeWidth="4" />
          <path d="M31 39c12-7 27-7 39 0" fill="none" stroke="#f0beca" strokeWidth="5" strokeLinecap="round" opacity=".7" />
        </svg>
      );
    case "lamp":
      return (
        <svg {...common}>
          <path d="M30 24h40l9 32H21z" fill="#f0beca" stroke="#8f5267" strokeWidth="4" strokeLinejoin="round" />
          <line x1="50" y1="56" x2="50" y2="88" stroke="#8f5267" strokeWidth="5" strokeLinecap="round" />
          <rect x="32" y="86" width="36" height="9" rx="4" fill="#8f5267" />
        </svg>
      );
    case "curtain":
      return (
        <svg {...common}>
          <line x1="4" y1="20" x2="96" y2="20" stroke="#8f5267" strokeWidth="7" strokeLinecap="round" />
          <path d="M8 22h34v62H8z" fill="#c98fa2" stroke="#8f5267" strokeWidth="3" />
          <path d="M58 22h34v62H58z" fill="#c98fa2" stroke="#8f5267" strokeWidth="3" />
          <path d="M22 24v58M76 24v58" stroke="#e7bac5" strokeWidth="5" />
        </svg>
      );
    case "storage":
      return (
        <svg {...common}>
          <rect x="16" y="28" width="68" height="54" rx="10" fill="#fff9fa" stroke="#8f5267" strokeWidth="5" />
          <path d="M16 47h68" stroke="#c98fa2" strokeWidth="5" />
          <rect x="38" y="58" width="24" height="8" rx="4" fill="#e8d9df" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="18" y="20" width="64" height="60" rx="16" fill="#fff9fa" stroke="#8f5267" strokeWidth="4" />
        </svg>
      );
  }
}

function AftercareTab({ item, onChange }: { item: MulsimItem; onChange: (item: MulsimItem) => void }) {
  const [draft, setDraft] = useState<Omit<AftercareRecord, "id">>({
    period: "7일",
    date: today(),
    usageCount: 0,
    usingWell: true,
    neglected: false,
    placeOk: true,
    installEasy: true,
    wouldBuyAgain: true,
    regretReason: "",
    memo: "",
  });

  const updateDraft = <K extends keyof Omit<AftercareRecord, "id">>(key: K, value: Omit<AftercareRecord, "id">[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addRecord = (event: FormEvent) => {
    event.preventDefault();
    onChange({
      ...item,
      status: item.status === "입주완료" ? "사후관리 대기" : item.status,
      aftercare: [{ id: makeId("aftercare"), ...draft }, ...item.aftercare],
    });
    setDraft({
      period: "7일",
      date: today(),
      usageCount: 0,
      usingWell: true,
      neglected: false,
      placeOk: true,
      installEasy: true,
      wouldBuyAgain: true,
      regretReason: "",
      memo: "",
    });
  };

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-heading">
          <CalendarDays size={19} />
          <h2>사후관리 기록</h2>
        </div>
        <form className="form-grid compact" onSubmit={addRecord}>
          <label>
            회고 시점
            <select value={draft.period} onChange={(event) => updateDraft("period", event.target.value as AftercareRecord["period"])}>
              <option>7일</option>
              <option>30일</option>
              <option>90일</option>
            </select>
          </label>
          <label>
            날짜
            <input type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
          </label>
          <label>
            실제로 몇 번 사용했는지
            <input
              type="number"
              min="0"
              value={draft.usageCount}
              onChange={(event) => updateDraft("usageCount", Number(event.target.value))}
            />
          </label>
          <CheckRow label="잘 쓰고 있는지" checked={draft.usingWell} onChange={(checked) => updateDraft("usingWell", checked)} />
          <CheckRow label="방치 중인지" checked={draft.neglected} onChange={(checked) => updateDraft("neglected", checked)} />
          <CheckRow label="둘 곳은 괜찮은지" checked={draft.placeOk} onChange={(checked) => updateDraft("placeOk", checked)} />
          <CheckRow label="설치는 예상보다 쉬웠는지" checked={draft.installEasy} onChange={(checked) => updateDraft("installEasy", checked)} />
          <CheckRow label="다시 돌아가도 살 건지" checked={draft.wouldBuyAgain} onChange={(checked) => updateDraft("wouldBuyAgain", checked)} />
          <label>
            후회한다면 이유
            <textarea value={draft.regretReason} onChange={(event) => updateDraft("regretReason", event.target.value)} />
          </label>
          <label>
            메모
            <textarea value={draft.memo} onChange={(event) => updateDraft("memo", event.target.value)} />
          </label>
          <div className="span-2 form-actions">
            <button className="primary-button" type="submit">
              <Plus size={17} />
              사후관리 추가
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <PackageCheck size={19} />
          <h2>회고 {item.aftercare.length}건</h2>
        </div>
        <div className="record-list">
          {item.aftercare.length === 0 ? <p className="empty-copy">구매 후 회고가 아직 없어요.</p> : null}
          {item.aftercare.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-topline">
                <strong>{record.period} 회고</strong>
                <span>{record.date}</span>
              </div>
              <dl className="record-meta">
                <div>
                  <dt>사용</dt>
                  <dd>{record.usageCount}회</dd>
                </div>
                <div>
                  <dt>상태</dt>
                  <dd>{record.usingWell ? "사용 중" : "애매함"}</dd>
                </div>
                <div>
                  <dt>재구매</dt>
                  <dd>{record.wouldBuyAgain ? "예" : "아니오"}</dd>
                </div>
              </dl>
              {record.regretReason ? <p className="memo-copy">{record.regretReason}</p> : null}
              {record.memo ? <p className="memo-copy">{record.memo}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check-label">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function RangeControl({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="range-value">{step < 1 ? value.toFixed(2) : Math.round(value)}</span>
    </label>
  );
}

function resolveItemImage(item: MulsimItem, imageSources: ImageSources) {
  if (item.imageId && imageSources[item.imageId]) {
    return imageSources[item.imageId];
  }
  return item.imageUrl || undefined;
}

function formatPrice(price: string) {
  const digits = price.replace(/[^\d]/g, "");
  if (!digits) {
    return "가격 미정";
  }
  return `${Number(digits).toLocaleString("ko-KR")}원`;
}

function formatPriceInput(price: string) {
  const digits = price.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }
  return Number(digits).toLocaleString("ko-KR");
}

function daysSince(dateString: string) {
  const started = new Date(dateString).getTime();
  const diff = Date.now() - started;
  if (!Number.isFinite(diff)) {
    return 1;
  }
  return Math.max(1, Math.floor(diff / 86400000) + 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPlacementBounds(width: number, height: number) {
  return {
    minX: -24,
    minY: -26,
    maxX: 124 - width,
    maxY: 112 - height,
  };
}

function normalizeImagePreview(frame?: ImagePreviewFrame): ImagePreviewFrame {
  return {
    x: clamp(frame?.x ?? 0, -90, 90),
    y: clamp(frame?.y ?? 0, -90, 90),
    scale: clamp(frame?.scale ?? 1, 0.75, 2.8),
  };
}

function previewImageStyle(frame: ImagePreviewFrame): React.CSSProperties {
  const safeFrame = normalizeImagePreview(frame);
  return {
    transform: `translate(-50%, -50%) translate(${safeFrame.x}%, ${safeFrame.y}%) scale(${safeFrame.scale})`,
  };
}

function mergeCategories(categories: string[]) {
  return categories.reduce<string[]>((merged, category) => {
    const trimmed = category.trim();
    if (trimmed && !merged.includes(trimmed)) {
      merged.push(trimmed);
    }
    return merged;
  }, []);
}

async function downloadSnapshot(roomShell: HTMLElement | null, itemName: string) {
  if (!roomShell) {
    return;
  }

  const rect = roomShell.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clone = roomShell.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".selected").forEach((node) => node.classList.remove("selected"));
  clone.querySelectorAll(".room-placement").forEach((node) => {
    (node as HTMLElement).style.outline = "0";
  });
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.minHeight = "0";
  clone.style.margin = "0";

  const css = collectSnapshotCss();
  const html = `<div xmlns="http://www.w3.org/1999/xhtml"><style>${toCdata(css)}</style>${serializeSnapshotElement(clone)}</div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const fileBase = `mulsim-${sanitizeFilename(itemName)}-snapshot`;
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable.");
    }
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${fileBase}.png`);
      } else {
        downloadBlob(svgBlob, `${fileBase}.svg`);
      }
    }, "image/png");
  } catch {
    downloadBlob(svgBlob, `${fileBase}.svg`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function serializeSnapshotElement(element: HTMLElement) {
  return new XMLSerializer().serializeToString(element);
}

function toCdata(value: string) {
  return `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function collectSnapshotCss() {
  const rules: string[] = [];
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules).forEach((rule) => {
        const cssText = rule.cssText;
        if (!cssText.startsWith("@import")) {
          rules.push(cssText);
        }
      });
    } catch {
      // Cross-origin stylesheets such as web fonts cannot be read; the snapshot still works with local CSS.
    }
  });

  rules.push(`
    .room-shell {
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      border-radius: 30px !important;
    }
  `);
  return rules.join("\n");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Snapshot image failed to load."));
    image.src = src;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(value: string) {
  const cleaned = value.trim().replace(/[\\/:*?"<>|]/g, "-");
  return cleaned || "room";
}

export default App;
