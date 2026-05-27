import nacl, { secureRandomBytes } from "@/lib/nacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";
import { v4 as uuid } from "uuid";
import { getMyDeviceId, getMyKeyPair } from "./keyStore";

/**
 * Decrypt one envelope. Returns plaintext string or null.
 *
 * nacl.box.open does TWO things at once:
 * 1. Decrypts the ciphertext (confidentiality)
 * 2. Verifies the sender's signature (authenticity)
 * If either fails, it returns null. This means a null result could be
 * tampering OR a wrong key — either way, don't trust the data.
 */
export function decryptEnvelope(
    ciphertextB64: string,
    nonceB64: string,
    senderPublicKeyB64: string,
    mySecretKey: Uint8Array,
): string | null {
    const result = nacl.box.open(
        decodeBase64(ciphertextB64),
        decodeBase64(nonceB64),
        decodeBase64(senderPublicKeyB64),
        mySecretKey,
    );
    if (!result) return null;
    return new TextDecoder().decode(result);
}

/**
 * Encrypt a message for all target devices (fan-out).
 *
 * Returns the envelopes ready to send to Convex's sendFanOut mutation.
 */
export async function prepareEnvelopes(
    plaintext: string,
    recipientDevices: Array<{ userId: string; deviceId: string; publicKey: string }>,
    myOtherDevices: Array<{ userId: string; deviceId: string; publicKey: string }>,
    payloadType: "message" | "receipt" | "edit" | "delete" | "reaction" = "message",
) {
    const myKeyPair = await getMyKeyPair();
    const myDeviceId = await getMyDeviceId();
    const messageId = uuid();
    const encoded = new TextEncoder().encode(plaintext);

    // All devices that need a copy: recipient's + my other devices
    const targets = [
        ...recipientDevices,
        ...myOtherDevices.filter((d) => d.deviceId !== myDeviceId),
    ];

    return {
        messageId,
        envelopes: targets.map((device) => {
            const nonce = secureRandomBytes(24);
            const ciphertext = nacl.box(
                encoded, nonce,
                decodeBase64(device.publicKey),
                myKeyPair.secretKey,
            );
            return {
                messageId,
                payloadType,
                recipientId:       device.userId,
                recipientDeviceId: device.deviceId,
                ciphertext:        encodeBase64(ciphertext),
                nonce:             encodeBase64(nonce),
                senderPublicKey:   encodeBase64(myKeyPair.publicKey),
                senderDeviceId:    myDeviceId,
            };
        }),
    };
}
