// IndexedDB Helper for Storing and Retrieving Offline Media (Videos & Magazine PDFs)

const DB_NAME = 'CHLS_Commercial_OfflineMedia_DB';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

export interface StoredOfflineMedia {
  id: string; // unique key, e.g. 'video_hipica_01'
  title: string;
  category: string;
  mimeType: string;
  blob: Blob;
  sizeBytes: number;
  duration?: number;
  thumbnailUrl?: string;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export const offlineMediaStorage = {
  // Save blob in IndexedDB
  saveMedia: async (media: StoredOfflineMedia): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(media);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // Get media by ID
  getMedia: async (id: string): Promise<StoredOfflineMedia | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  // List all stored offline media
  listAll: async (): Promise<StoredOfflineMedia[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // Delete media by ID
  deleteMedia: async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // Check if media exists offline
  hasMedia: async (id: string): Promise<boolean> => {
    const item = await offlineMediaStorage.getMedia(id);
    return !!item;
  },

  // Format bytes to human readable size
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};
