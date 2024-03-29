// Indexed DB database

import { Snip, SnipMetadata } from "./Snip";
import { LogTag, log } from "./log";
import { newDefaultSnip } from "./newDefaultSnip";

// Key, Name, SnipJson

const databaseName = "extension";
const databaseVersion = 1;

const databaseTableNameSnips = "snips";
const databaseTableNameSnipsIndexName = "name";

// Database Structure
// The unique key is the id of the snip.

/**
 *
 * @param callback called if present with the error
 */
function createErrorHandler(callback?: (error: unknown) => void) {
    return (event: Event) => {
        const target = event.target;
        let error: unknown;
        if (target instanceof IDBRequest) {
            error = target.error;
        } else {
            error = "Unknown error";
        }

        console.error(error);
        if (callback) {
            callback(error);
        }
    };
}

async function openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, databaseVersion);

        request.onupgradeneeded = (event) => {
            const target = event.target;
            if (target instanceof IDBOpenDBRequest) {
                const db = target.result;

                // id is the unique key, it is unique to the local storage
                const objectStore = db.createObjectStore(databaseTableNameSnips, {
                    keyPath: "id",
                });
                objectStore.createIndex(databaseTableNameSnipsIndexName, databaseTableNameSnipsIndexName, {
                    unique: false, // allow duplicates of the name
                });

                objectStore.transaction.oncomplete = () => {
                    // Store values in the newly created objectStore.
                    const snipsObjectStore = db
                        .transaction(databaseTableNameSnips, "readwrite")
                        .objectStore(databaseTableNameSnips);

                    // default snip
                    snipsObjectStore.add(newDefaultSnip());
                };
            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = createErrorHandler(reject);
    });
}

function getTableSnips(db: IDBDatabase, mode: IDBTransactionMode) {
    return db.transaction(databaseTableNameSnips, mode).objectStore(databaseTableNameSnips);
}

/**
 * Get all snips
 */
export async function getAllSnips(): Promise<Snip[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const objectStore = getTableSnips(db, "readonly");
        const request = objectStore.openCursor();

        const items: Snip[] = [];
        request.onsuccess = (event) => {
            const target = event.target;
            if (target instanceof IDBRequest) {
                const cursor = target.result;
                if (cursor) {
                    const snip = cursor.value;
                    items.push(snip);
                    cursor.continue();
                } else {
                    resolve(items);
                }
            }
        };
        request.onerror = createErrorHandler(reject);
    });
}

/**
 * Gets all snip names.
 */
export async function getAllSnipMetadata(): Promise<SnipMetadata[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const objectStore = getTableSnips(db, "readonly");
        const request = objectStore.openCursor();

        const items: SnipMetadata[] = [];
        request.onsuccess = (event) => {
            const target = event.target;
            if (target instanceof IDBRequest) {
                const cursor = target.result;
                if (cursor) {
                    const { id, name, modified } = cursor.value;
                    items.push({ id, name, modified });
                    cursor.continue();
                } else {
                    resolve(items);
                }
            }
        };
        request.onerror = createErrorHandler(reject);
    });
}

/**
 * @returns The id of the most recently modified snip, or undefined if there are no snips.
 */
export async function getMostRecentlyModifiedSnipId(): Promise<string | undefined> {
    const allMetadata = await getAllSnipMetadata();
    log(LogTag.MostRecentlyModifiedMetadata, "allMetadata");
    log(LogTag.MostRecentlyModifiedMetadata, allMetadata);

    // Find most recently modified (largest date)
    let mostRecent: SnipMetadata | undefined = undefined;
    for (const metadata of allMetadata) {
        if (mostRecent === undefined || mostRecent.modified < metadata.modified) {
            mostRecent = metadata;
        }
    }

    if (mostRecent === undefined) {
        return undefined;
    }

    return mostRecent.id;
}

export async function getSnipById(id: string | undefined): Promise<Snip | undefined> {
    if (id === undefined) {
        return undefined;
    }

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const objectStore = getTableSnips(db, "readonly");
        const request = objectStore.get(id);
        request.onsuccess = (event) => {
            const target = event.target;
            if (target instanceof IDBRequest) {
                resolve(target.result);
            }
        };
        request.onerror = createErrorHandler(reject);
    });
}

export async function getSnipByName(name: string): Promise<Snip | undefined> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const objectStore = getTableSnips(db, "readonly");
        const index = objectStore.index(databaseTableNameSnipsIndexName);
        const request = index.get(name);
        request.onsuccess = (event) => {
            const target = event.target;
            if (target instanceof IDBRequest) {
                resolve(target.result);
            }
        };
        request.onerror = createErrorHandler(reject);
    });
}

export async function saveSnip(snip: Snip): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const snipsObjectStore = getTableSnips(db, "readwrite");

        const request = snipsObjectStore.put(snip);
        request.onsuccess = () => {
            resolve();
            // const target = event.target;
            // if (target instanceof IDBRequest) {
            //     resolve(target.result);
            // }
        };
        request.onerror = createErrorHandler(reject);
    });
}

export async function deleteSnipById(id: string): Promise<void> {
    const db = await openDatabase();
    const snipsObjectStore = getTableSnips(db, "readwrite");

    return new Promise((resolve, reject) => {
        const request = snipsObjectStore.delete(id);
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = createErrorHandler(reject);
    });
}
