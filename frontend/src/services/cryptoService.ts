/**
 * Service de cryptographie PKI — RSA-PSS avec persistance IndexedDB.
 * La clé est générée une seule fois et réutilisée à chaque signature.
 *
 * FIX : La clé publique est maintenant explicitement re-importée avec
 * extractable=true pour garantir l'export après rechargement depuis IndexedDB.
 */

const DB_NAME = 'cpharma-pki';
const STORE = 'keystore';
const KEY_ID = 'doctor-rsa-key';

const RSA_PARAMS = {
    name: 'RSA-PSS',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
};

// ── Types ────────────────────────────────────────────────────────────────────

type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveKeyPair(db: IDBDatabase, kp: CryptoKeyPair): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(kp, KEY_ID);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadKeyPair(db: IDBDatabase): Promise<CryptoKeyPair | null> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.get(KEY_ID);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
}

// ── Helpers internes ─────────────────────────────────────────────────────────

/**
 * FIX (bug critique) : Génère une paire de clés sécurisée.
 * - Clé privée  : extractable=false (ne peut jamais quitter le navigateur)
 * - Clé publique: extractable=true  (doit pouvoir être exportée après rechargement IndexedDB)
 */
async function generateSecureKeyPair(): Promise<CryptoKeyPair> {
    // 1. Génération temporaire (extractable=true pour pouvoir manipuler les deux clés)
    const tempKp = await window.crypto.subtle.generateKey(RSA_PARAMS, true, ['sign', 'verify']);

    // 2. Clé privée sécurisée : export → reimport avec extractable=false
    const exportedPriv = await window.crypto.subtle.exportKey('pkcs8', tempKp.privateKey);
    const securePrivKey = await window.crypto.subtle.importKey(
        'pkcs8',
        exportedPriv,
        RSA_PARAMS,
        false, // SÉCURITÉ : jamais extractable
        ['sign']
    );

    // 3. Clé publique sécurisée : export → reimport avec extractable=true
    //    FIX : Sans cette étape, après rechargement depuis IndexedDB certains
    //    navigateurs (Safari, Firefox) retournent une clé non-exportable.
    const exportedPub = await window.crypto.subtle.exportKey('spki', tempKp.publicKey);
    const securePubKey = await window.crypto.subtle.importKey(
        'spki',
        exportedPub,
        RSA_PARAMS,
        true, // Toujours exportable pour l'upload vers le backend
        ['verify']
    );

    return { publicKey: securePubKey, privateKey: securePrivKey };
}

// ── API publique ──────────────────────────────────────────────────────────────

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
        kp = await generateSecureKeyPair();

        // Persistance avec gestion d'erreur (IndexedDB peut échouer en navigation privée)
        try {
            await saveKeyPair(db, kp);
        } catch (e) {
            console.warn('[PKI] IndexedDB indisponible — clés non persistées:', e);
            // On continue : les clés seront regénérées au prochain chargement,
            // et la clé publique sera ré-uploadée automatiquement.
        }

        isNew = true;
    }

    const publicKeyB64 = await exportPublicKey(kp.publicKey);
    return { keyPair: kp, publicKeyB64, isNew };
}

/**
 * Canonicalise récursivement un objet JSON (tri des clés) pour garantir
 * un JSON déterministe identique entre JS et Python (sort_keys=True).
 */
function canonicalize(obj: JSONValue): JSONValue {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(canonicalize);
    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = canonicalize((obj as Record<string, JSONValue>)[key]);
        return acc;
    }, {} as Record<string, JSONValue>);
}

/** Signe un objet JSON avec la clé privée RSA-PSS. */
export async function signData(privateKey: CryptoKey, data: object): Promise<string> {
    const encoder = new TextEncoder();
    const canonicalData = canonicalize(data as JSONValue);
    const jsonStr = JSON.stringify(canonicalData);
    const encoded = encoder.encode(jsonStr);

    const signature = await window.crypto.subtle.sign(
        { name: 'RSA-PSS', saltLength: 32 },
        privateKey,
        encoded
    );

    const sigBytes = new Uint8Array(signature);
    let binary = '';
    for (let i = 0; i < sigBytes.length; i++) {
        binary += String.fromCharCode(sigBytes[i]);
    }
    return btoa(binary);
}

/** Calcule le SHA-256 d'un Blob (pour le hash du PDF). */
export async function getSHA256Hash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Exporte une clé publique CryptoKey en base64 (format SPKI/DER). */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', key);
    const expBytes = new Uint8Array(exported);
    let binary = '';
    for (let i = 0; i < expBytes.length; i++) {
        binary += String.fromCharCode(expBytes[i]);
    }
    return btoa(binary);
}

/**
 * Vérifie une signature RSA-PSS localement (côté Pharmacien).
 * Re-vérifie cryptographiquement sans faire confiance au champ is_valid du backend.
 */
export async function verifySignature(
    publicKeyB64: string,
    signatureB64: string,
    data: object
): Promise<boolean> {
    try {
        const binaryDer = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0));

        const publicKey = await window.crypto.subtle.importKey(
            'spki',
            binaryDer.buffer,
            RSA_PARAMS,
            true,
            ['verify']
        );

        const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
        const encoder = new TextEncoder();
        const canonicalData = canonicalize(data as JSONValue);
        const encodedData = encoder.encode(JSON.stringify(canonicalData));

        return await window.crypto.subtle.verify(
            { name: 'RSA-PSS', saltLength: 32 },
            publicKey,
            signature,
            encodedData
        );
    } catch (e) {
        console.error('[PKI] Erreur vérification WebCrypto:', e);
        return false;
    }
}