import type { AppState } from '../types/domain'

const DB_NAME = 'pickleballstats'
const STORE_NAME = 'app'
const STATE_KEY = 'state'
const LOCAL_KEY = 'pickleballstats.state'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadState(): Promise<AppState | null> {
  if (typeof indexedDB === 'undefined') {
    return loadLocalState()
  }

  try {
    const db = await openDb()
    return await new Promise<AppState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(STATE_KEY)
      request.onsuccess = () => resolve((request.result as AppState | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return loadLocalState()
  }
}

export async function saveState(state: AppState): Promise<void> {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state))

  if (typeof indexedDB === 'undefined') return

  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(state, STATE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
  }
}

function loadLocalState(): AppState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppState
  } catch {
    return null
  }
}
