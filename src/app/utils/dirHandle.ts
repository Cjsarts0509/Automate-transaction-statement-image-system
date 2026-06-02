// File System Access API의 디렉토리 핸들을 IndexedDB에 영속화하여
// "한 번 폴더 선택 → 다음부터 자동 저장" 흐름을 구현한다.
//
// 브라우저 보안 정책상 임의 경로(예: C:\ScanKBB\scan)에 사전 권한 없이
// 쓰는 것은 불가능하다. 사용자가 한 번 그 폴더를 선택하면 핸들을 보관해서
// 이후엔 권한 확인만으로 같은 폴더에 곧장 저장한다.

const DB_NAME = "scan-app";
const STORE_NAME = "handles";
const HANDLE_KEY = "save-dir";

type FileSystemPermissionState = "granted" | "denied" | "prompt";

interface PermissionLikeHandle {
  queryPermission?: (opts: { mode: "readwrite" | "read" }) => Promise<FileSystemPermissionState>;
  requestPermission?: (opts: { mode: "readwrite" | "read" }) => Promise<FileSystemPermissionState>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result as FileSystemDirectoryHandle | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function clearDirHandle(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

/**
 * 보관된 핸들의 쓰기 권한을 확인하고, 필요하면 사용자에게 요청한다.
 * 사용자 제스처(클릭) 안에서 호출되어야 prompt가 정상적으로 뜬다.
 */
export async function ensureWritePermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  const h = handle as unknown as PermissionLikeHandle;
  const opts = { mode: "readwrite" as const };
  if (h.queryPermission) {
    const state = await h.queryPermission(opts);
    if (state === "granted") return true;
  }
  if (h.requestPermission) {
    const state = await h.requestPermission(opts);
    return state === "granted";
  }
  return false;
}
