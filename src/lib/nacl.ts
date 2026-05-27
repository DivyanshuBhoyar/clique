import type { PRNG, randomBytes as randomBytesType } from "tweetnacl";

// Use ordered CommonJS requires here on purpose. With ESM imports, Metro can
// evaluate independent dependencies before this module body runs, which is
// exactly how TweetNaCl can end up initialized without a React Native PRNG.
require("react-native-get-random-values");

const nacl = require("tweetnacl") as typeof import("tweetnacl");

/**
 * Central TweetNaCl import.
 *
 * TweetNaCl captures its random source at module initialization. React Native
 * gets `crypto.getRandomValues` from a polyfill, so explicitly wiring the PRNG
 * here prevents `nacl.randomBytes()` from throwing `no PRNG` if import order
 * changes elsewhere.
 */
function getCryptoApi(): Crypto | undefined {
    const nativeGlobal = typeof global !== "undefined"
        ? (global as { crypto?: Crypto })
        : undefined;
    return globalThis.crypto ?? nativeGlobal?.crypto;
}

function installPrng() {
    const cryptoApi = getCryptoApi();

    if (!cryptoApi?.getRandomValues) {
        throw new Error("Secure random source is unavailable for E2EE on this device.");
    }

    nacl.setPRNG(((bytes: Uint8Array, length: number) => {
        cryptoApi.getRandomValues(bytes.subarray(0, length));
    }) as PRNG);
}

export function secureRandomBytes(length: number): Uint8Array {
    const cryptoApi = getCryptoApi();

    if (!cryptoApi?.getRandomValues) {
        throw new Error("Secure random source is unavailable for E2EE on this device.");
    }

    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    return bytes;
}

installPrng();

const randomBytes = nacl.randomBytes.bind(nacl) as typeof randomBytesType;

// If a native reload or import-order edge resets TweetNaCl's internal PRNG,
// repair it at the call site instead of letting `no PRNG` reach the composer.
nacl.randomBytes = ((length: number) => {
    try {
        return randomBytes(length);
    } catch (error) {
        if (error instanceof Error && error.message === "no PRNG") {
            installPrng();
            return randomBytes(length);
        }
        throw error;
    }
}) as typeof randomBytesType;

export default nacl;