export function capitalize(str: string): string {
    if (!str) {
        return str
    }
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export function isValidUrl(candidate: string): boolean {
    try {
        new URL(candidate)
        return true
    } catch (err) {
        return false
    }
}
