/**
 * Clipboard utility — uses the deprecated but still-functional RN Clipboard API.
 * Replace with expo-clipboard when added as a dependency.
 */
export function copyToClipboard(text: string) {
    try {
        const { Clipboard } = require("react-native");
        Clipboard.setString(text);
    } catch {
        // Fallback: no-op if unavailable
    }
}
