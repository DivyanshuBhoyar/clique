export function assertLength(field: string, value: string, max: number): void {
    if (value.length > max) {
        throw new Error(`${field} must be ${max} characters or less`);
    }
}

export function assertNonEmpty(field: string, value: string): void {
    if (value.trim().length === 0) {
        throw new Error(`${field} cannot be empty`);
    }
}
