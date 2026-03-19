/**
 * Service de cryptographie PKI — RSA-PSS avec persistance IndexedDB.
 * La clé est générée une seule fois et réutilisée à chaque signature.
 */

const DB_NAME = 'cpharma-pki';
const STORE   = 'keystore';
const KEY_ID  = 'doctor-rsa-key';

const RSA_PARAMS = {
    name:           'RSA-PSS',
    modulusLength:  2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash:           'SHA-256',
};

// ── IndexedDB helpers ────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

async function saveKeyPair(db: IDBDatabase, kp: CryptoKeyPair) {
    return new Promise<void>((resolve, reject) => {
        const tx    = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(kp, KEY_ID);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

async function loadKeyPair(db: IDBDatabase): Promise<CryptoKeyPair | null> {
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req   = store.get(KEY_ID);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror   = () => reject(req.error);
    });
}

// ── API publique ─────────────────────────────────────────────────────────

/**
 * Charge la paire de clés depuis IndexedDB.
 * Si aucune n'existe, en génère une nouvelle et la stocke.
 * Retourne aussi la clé publique exportée (base64) pour upload.
 */
export async function loadOrGenerateKeyPair(): Promise<{
    keyPair: CryptoKeyPair;
    publicKeyB64: string;
    isNew: boolean;
}> {
    const db = await openDB();
    let kp = await loadKeyPair(db);
    let isNew = false;

    if (!kp) {
        kp = await window.crypto.subtle.generateKey(RSA_PARAMS, true, ['sign', 'verify']);
        await saveKeyPair(db, kp);
        isNew = true;
    }

    const exported  = await window.crypto.subtle.exportKey('spki', kp.publicKey);
    const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));

    return { keyPair: kp, publicKeyB64, isNew };
}

function canonicalize(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(canonicalize);
    const sortedKeys = Object.keys(obj).sort();
    const result: any = {};
    for (const key of sortedKeys) {
        result[key] = canonicalize(obj[key]);
    }
    return result;
}

/** Signe un objet JSON avec la clé privée RSA-PSS. */
export async function signData(privateKey: CryptoKey, data: object): Promise<string> {
    const encoder = new TextEncoder();
    // Tri récursif des clés pour garantir un JSON déterministe (équivalent à sort_keys=True en Python)
    const canonicalData = canonicalize(data);
    const jsonStr = JSON.stringify(canonicalData);
    const encoded = encoder.encode(jsonStr);

    const signature = await window.crypto.subtle.sign(
        { name: 'RSA-PSS', saltLength: 32 },
        privateKey,
        encoded
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/** Calcule le SHA-256 d'un Blob (pour le hash du PDF). */
export async function getSHA256Hash(blob: Blob): Promise<string> {
    const buffer     = await blob.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/** 
 * Vérifie une signature RSA-PSS localement (côté Pharmacien) 
 */
export async function verifySignature(publicKeyB64: string, signatureB64: string, data: object): Promise<boolean> {
    try {
        const binaryDerString = window.atob(publicKeyB64);
        const binaryDer = new Uint8Array(binaryDerString.length);
        for (let i = 0; i < binaryDerString.length; i++) binaryDer[i] = binaryDerString.charCodeAt(i);

        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            binaryDer.buffer,
            RSA_PARAMS,
            true,
            ['verify']
        );

        const binarySigString = window.atob(signatureB64);
        const signature = new Uint8Array(binarySigString.length);
        for (let i = 0; i < binarySigString.length; i++) signature[i] = binarySigString.charCodeAt(i);

        const encoder = new TextEncoder();
        const canonicalData = canonicalize(data);
        const jsonStr = JSON.stringify(canonicalData);
        const encodedData = encoder.encode(jsonStr);

        return await window.crypto.subtle.verify(
            { name: 'RSA-PSS', saltLength: 32 },
            publicKey,
            signature,
            encodedData
        );
    } catch (e) {
        console.error("Erreur WebCrypto verification:", e);
        return false;
    }
}
