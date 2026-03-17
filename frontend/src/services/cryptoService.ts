/**
 * Service de cryptographie pour la PKI (Infrastructure à Clé Publique).
 * Gère la génération de clés RSA et la signature numérique des ordonnances.
 */

export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
        {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
    );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function signData(privateKey: CryptoKey, data: any): Promise<string> {
    // Normalisation du JSON pour garantir l'intégrité du hash
    const encoder = new TextEncoder();
    const jsonStr = JSON.stringify(data, Object.keys(data).sort());
    const encoded = encoder.encode(jsonStr);

    const signature = await window.crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        encoded
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function getSHA256Hash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
