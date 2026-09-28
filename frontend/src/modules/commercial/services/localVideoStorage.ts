// IndexedDB utility to store local video files directly in tablet browser storage

const DB_NAME = 'chls_commercial_videos_db';
const DB_VERSION = 1;
const STORE_NAME = 'local_videos';

export interface StoredLocalVideo {
  id: string;
  title: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
  blobUrl?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalVideoToDB(file: File, customTitle?: string): Promise<StoredLocalVideo> {
  const db = await openDB();
  const id = `local_vid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const title = customTitle || file.name.replace(/\.[^/.]+$/, '');

  const videoRecord: StoredLocalVideo = {
    id,
    title: `📱 [LOCAL] ${title}`,
    blob: file,
    mimeType: file.type || 'video/mp4',
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(videoRecord);

    request.onsuccess = () => {
      videoRecord.blobUrl = URL.createObjectURL(file);
      resolve(videoRecord);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalVideosFromDB(): Promise<StoredLocalVideo[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as StoredLocalVideo[]) || [];
        const recordsWithUrl = records.map(r => ({
          ...r,
          blobUrl: URL.createObjectURL(r.blob)
        }));
        resolve(recordsWithUrl);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB not supported or error:', err);
    return [];
  }
}

export async function deleteLocalVideoFromDB(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error deleting local video:', err);
    return false;
  }
}
