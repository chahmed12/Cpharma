// ── Algorithme RSA-PSS 2048 bits avec SHA-256 ─────────
// Aucune dépendance externe — WebCrypto est natif dans tous les navigateurs

const ALGO: RsaHashedKeyGenParams = {
    name: 'RSA-PSS',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
};

const SIGN_PARAMS = { name: 'RSA-PSS', saltLength: 32 };

// ─── Génération de la paire de clés ──────────────────
export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
        ALGO,
        true,                         // exportable
        ['sign', 'verify']
    );
}

// ─── Export clé publique → base64 (pour le backend) ──
export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// ─── Export clé privée → base64 (stockage local) ─────
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('pkcs8', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// ─── Import clé privée depuis base64 ─────────────────
export async function importPrivateKey(base64: string): Promise<CryptoKey> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i);
    return crypto.subtle.importKey(
        'pkcs8', bytes.buffer, ALGO, false, ['sign']
    );
}

// ─── Signature d'un objet JSON ────────────────────────
export async function signData(
    privateKey: CryptoKey,
    data: object
): Promise<{ signature: string; hash: string }> {
    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);

    // SHA-256 hash du JSON
    const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
    const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));

    // Signature RSA-PSS
    const sigBuf = await crypto.subtle.sign(SIGN_PARAMS, privateKey, encoded);
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

    return { signature: sigB64, hash: hashB64 };
}

// ─── Vérification côté pharmacien (frontend) ─────────
export async function verifySignature(
    publicKeyB64: string,
    signatureB64: string,
    data: object
): Promise<boolean> {
    // Import clé publique depuis base64
    const pubBytes = atob(publicKeyB64);
    const pubBuf = new Uint8Array(pubBytes.length);
    for (let i = 0; i < pubBytes.length; i++)
        pubBuf[i] = pubBytes.charCodeAt(i);

    const publicKey = await crypto.subtle.importKey(
        'spki', pubBuf.buffer, ALGO, false, ['verify']
    );

    const sigBytes = atob(signatureB64);
    const sigBuf = new Uint8Array(sigBytes.length);
    for (let i = 0; i < sigBytes.length; i++)
        sigBuf[i] = sigBytes.charCodeAt(i);

    const encoded = new TextEncoder().encode(JSON.stringify(data));

    return crypto.subtle.verify(SIGN_PARAMS, publicKey, sigBuf, encoded);
}