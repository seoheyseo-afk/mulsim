import { createConditionChecks, normalizeCategory } from "./seed";
import type { AftercareRecord, ChecklistItem, ConditionChecks, MulsimItem } from "./types";

const ITEMS_KEY = "mulsim.items.v1";
const CUSTOM_CATEGORIES_KEY = "mulsim.customCategories.v1";
const DB_NAME = "mulsim-indexed-images";
const DB_VERSION = 1;
const STORE_NAME = "uploads";
const LEGACY_SAMPLE_ITEM_SIGNATURES = [
  { name: "무소음 미니 가습기", price: "39000", category: "전자기기", firstWantedDate: "2026-04-18" },
  { name: "아치형 수납 트레이", price: "18000", category: "수납용품", firstWantedDate: "2026-04-21" },
  { name: "딥로즈 쿠션 커버", price: "12000", category: "생활소품", firstWantedDate: "2026-04-24" },
];

interface StoredImage {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: string;
}

export function loadItems(): MulsimItem[] | null {
  const raw = localStorage.getItem(ITEMS_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    if (isOnlyLegacySampleItems(parsed)) {
      return [];
    }
    return migrateItems(parsed as MulsimItem[]);
  } catch {
    return null;
  }
}

export function saveItems(items: MulsimItem[]) {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch {
    const itemsWithoutUploadFallbacks = items.map(({ uploadedImageDataUrl, ...item }) => item);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(itemsWithoutUploadFallbacks));
  }
}

function isOnlyLegacySampleItems(items: MulsimItem[]) {
  return (
    items.length > 0 &&
    items.length <= LEGACY_SAMPLE_ITEM_SIGNATURES.length &&
    items.every((item) =>
      LEGACY_SAMPLE_ITEM_SIGNATURES.some(
        (sample) =>
          item.name === sample.name &&
          item.price === sample.price &&
          item.category === sample.category &&
          item.firstWantedDate === sample.firstWantedDate &&
          item.link === "" &&
          item.imageUrl === "" &&
          !item.imageId,
      ),
    )
  );
}

function migrateItems(items: MulsimItem[]) {
  return items.map((item) => {
    const category = normalizeCategory(item.category);
    return {
      ...item,
      category,
      conditionChecks: migrateConditionChecks(item.conditionChecks, category),
      aftercare: migrateAftercareRecords(item.aftercare),
    };
  });
}

function migrateConditionChecks(checks: Partial<ConditionChecks> | undefined, category: string): ConditionChecks {
  const defaults = createConditionChecks(category);
  return {
    ...defaults,
    readyToUse: Boolean(checks?.readyToUse),
    manageableAlone: Boolean(checks?.manageableAlone),
    extrasChecked: Boolean(checks?.extrasChecked),
    timeAvailable: Boolean(checks?.timeAvailable),
    maintenanceReady: Boolean(checks?.maintenanceReady),
    cleanupReady: Boolean(checks?.cleanupReady),
    categoryChecklist: migrateCategoryChecklist(checks?.categoryChecklist ?? [], category),
    memo: typeof checks?.memo === "string" ? checks.memo : "",
  };
}

function migrateCategoryChecklist(checklist: ChecklistItem[], category: string) {
  const currentDefaults = createConditionChecks(category).categoryChecklist;
  const checkedByLabel = new Map(checklist.map((check) => [check.label, check.checked]));

  return currentDefaults.map((check) => ({
    ...check,
    checked: checkedByLabel.get(check.label) ?? false,
  }));
}

function migrateAftercareRecords(records: MulsimItem["aftercare"] | undefined): AftercareRecord[] {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.map((record) => ({
    id: record.id,
    period: normalizeAftercarePeriod(String(record.period)),
    date: record.date,
    usageCount: Number.isFinite(record.usageCount) ? Math.max(0, record.usageCount) : 0,
    usingWell: Boolean(record.usingWell),
    placeOk: Boolean(record.placeOk),
    installEasy: Boolean(record.installEasy),
    wouldBuyAgain: Boolean(record.wouldBuyAgain),
    regretReason: typeof record.regretReason === "string" ? record.regretReason : "",
    memo: typeof record.memo === "string" ? record.memo : "",
  }));
}

function normalizeAftercarePeriod(period: string): AftercareRecord["period"] {
  const periodMap: Record<string, AftercareRecord["period"]> = {
    하루: "하루",
    한주: "한주",
    한달: "한달",
    세달: "세달",
    일년: "일년",
    "1일": "하루",
    "7일": "한주",
    "1주": "한주",
    "30일": "한달",
    "1달": "한달",
    "90일": "세달",
    "3달": "세달",
    "365일": "일년",
    "1년": "일년",
  };
  return periodMap[period] ?? "한달";
}

export function loadCustomCategories(): string[] {
  const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((category) => typeof category === "string") : [];
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: string[]) {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
}

function openImageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export async function saveUploadedImage(file: File): Promise<{ id: string; dataUrl: string; persisted: boolean }> {
  const dataUrl = await fileToDataUrl(file);
  const id = `img_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  const record: StoredImage = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl,
    createdAt: new Date().toISOString(),
  };

  try {
    const db = await openImageDb();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
    return { id, dataUrl, persisted: true };
  } catch {
    return { id, dataUrl, persisted: false };
  }
}

export async function getUploadedImage(id: string): Promise<string | null> {
  let db: IDBDatabase;
  try {
    db = await openImageDb();
  } catch {
    return null;
  }

  try {
    const record = await new Promise<StoredImage | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result as StoredImage | undefined);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return record?.dataUrl ?? null;
  } catch {
    db.close();
    return null;
  }
}
