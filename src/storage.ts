import type { MulsimItem } from "./types";

const ITEMS_KEY = "mulsim.items.v1";
const CUSTOM_CATEGORIES_KEY = "mulsim.customCategories.v1";
const DB_NAME = "mulsim-indexed-images";
const DB_VERSION = 1;
const STORE_NAME = "uploads";

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
    return JSON.parse(raw) as MulsimItem[];
  } catch {
    return null;
  }
}

export function saveItems(items: MulsimItem[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
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

export async function saveUploadedImage(file: File): Promise<{ id: string; dataUrl: string }> {
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

  const db = await openImageDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
  return { id, dataUrl };
}

export async function getUploadedImage(id: string): Promise<string | null> {
  const db = await openImageDb();

  const record = await new Promise<StoredImage | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredImage | undefined);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return record?.dataUrl ?? null;
}
