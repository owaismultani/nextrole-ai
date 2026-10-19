/**
 * "Fix these in the editor" survives signing up: the checked file waits in this browser's IndexedDB until the
 * visitor comes back signed in, then it's imported and removed. It never leaves the browser before that.
 */
const DB = "reactive-resume";
const STORE = "pending-import";
const KEY = "ats-checker";

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(STORE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	const db = await open();
	try {
		return await new Promise<T>((resolve, reject) => {
			const request = work(db.transaction(STORE, mode).objectStore(STORE));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} finally {
		db.close();
	}
}

export const savePendingImport = (file: File) =>
	run("readwrite", (store) => store.put(file, KEY)).then(() => undefined);

/** The waiting file, removed as it's read so it's imported once. */
export async function takePendingImport(): Promise<File | null> {
	const file = await run<unknown>("readonly", (store) => store.get(KEY));
	await run("readwrite", (store) => store.delete(KEY));
	return file instanceof File ? file : null;
}
