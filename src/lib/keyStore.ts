import nacl from "@/lib/nacl";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";
import { v4 as uuid } from "uuid";

const SK_PRIVATE_KEY = "e2ee_private_key";
const SK_DEVICE_ID   = "e2ee_device_id";

// ---------------------------------------------------------------------------
// Platform-aware secure storage
//
// Native (iOS/Android): expo-secure-store → Keychain / Keystore
// Web: IndexedDB (Option 2 — extractable key bytes stored as opaque blobs)
//
// IndexedDB is chosen over localStorage because:
//  • It's async and doesn't block the main thread
//  • Stored data isn't accessible from `document.cookie`-style XSS vectors
//  • It survives across page reloads and doesn't appear in simple JS globals
//
// ⚠️ This is NOT as secure as non-extractable CryptoKey objects. The raw
//   key bytes do exist in JS memory briefly during encrypt/decrypt. An XSS
//   attack could steal them. For a mobile-first app this is an acceptable
//   tradeoff — upgrade to non-extractable keys (Option 1) if web becomes
//   a primary platform.
// ---------------------------------------------------------------------------

const IDB_DB_NAME    = "homie_e2ee";
const IDB_STORE_NAME = "keystore";
const IDB_VERSION    = 1;

function getWebDeviceName() {
    if (typeof navigator === "undefined") return "Web browser";

    const browserName = navigator.userAgent.split("(")[0]?.trim();
    return `${browserName || "Web browser"} (Web)`;
}

function openIdb(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB is required for web E2EE key storage."));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
                db.createObjectStore(IDB_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror   = () => reject(request.error);
    });
}

async function idbGet(key: string): Promise<string | null> {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(IDB_STORE_NAME, "readonly");
        const store = tx.objectStore(IDB_STORE_NAME);
        const req   = store.get(key);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror   = () => reject(req.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

async function idbSet(key: string, value: string): Promise<void> {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(IDB_STORE_NAME, "readwrite");
        const store = tx.objectStore(IDB_STORE_NAME);
        store.put(value, key);
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

// ---------------------------------------------------------------------------
// Unified get/set that picks the right backend per platform
// ---------------------------------------------------------------------------

async function secureGet(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
        return idbGet(key);
    }
    return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
        return idbSet(key, value);
    }
    return SecureStore.setItemAsync(key, value);
}

// ---------------------------------------------------------------------------
// Public API — identical interface regardless of platform
// ---------------------------------------------------------------------------

/**
 * Call ONCE at app boot, after auth.
 * Generates a key pair on first launch, registers the public key with the server.
 */
export async function initDevice(
    registerDeviceMutation: (args: {
        deviceId: string;
        publicKey: string;
        deviceName: string;
    }) => Promise<unknown>
) {
    let privateKeyB64 = await secureGet(SK_PRIVATE_KEY);
    let deviceId      = await secureGet(SK_DEVICE_ID);

    if (!privateKeyB64 || !deviceId) {
        const keyPair = nacl.box.keyPair();
        deviceId      = uuid();
        privateKeyB64 = encodeBase64(keyPair.secretKey);

        await secureSet(SK_PRIVATE_KEY, privateKeyB64);
        await secureSet(SK_DEVICE_ID, deviceId);
    }

    const keyPair = nacl.box.keyPair.fromSecretKey(decodeBase64(privateKeyB64));
    const deviceName = Platform.OS === "web"
        ? getWebDeviceName()
        : Device.modelName ?? "Unknown device";

    // Idempotent server-side: new devices insert, existing devices update lastSeen.
    // Calling on every authenticated boot recovers if a previous registration failed.
    await registerDeviceMutation({
        deviceId,
        publicKey:  encodeBase64(keyPair.publicKey),
        deviceName,
    });

    return {
        deviceId,
        keyPair,
    };
}

export async function getMyKeyPair() {
    const b64 = await secureGet(SK_PRIVATE_KEY);
    if (!b64) throw new Error("No key pair — call initDevice() first");
    return nacl.box.keyPair.fromSecretKey(decodeBase64(b64));
}

export async function getMyDeviceId(): Promise<string> {
    const id = await secureGet(SK_DEVICE_ID);
    if (!id) throw new Error("No device ID — call initDevice() first");
    return id;
}
