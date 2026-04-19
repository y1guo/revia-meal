import { createHash, randomBytes } from 'node:crypto'

const TOKEN_PREFIX = 'rk_'
const TOKEN_ENTROPY_BYTES = 32

export type GeneratedKey = {
    plaintext: string
    hash: string
}

/**
 * Generate a fresh API key. The plaintext is returned alongside its SHA-256
 * hash (lowercase hex). Only the hash should be persisted — the plaintext
 * must be shown to the user exactly once and then discarded.
 */
export function generateApiKey(): GeneratedKey {
    const plaintext = TOKEN_PREFIX + randomBytes(TOKEN_ENTROPY_BYTES).toString('base64url')
    return { plaintext, hash: hashApiKey(plaintext) }
}

/**
 * Hash a plaintext API key for storage or lookup. SHA-256 → lowercase hex.
 * Stable: the same plaintext always hashes to the same value, so we can
 * look up a key by hashing the presented token and comparing.
 */
export function hashApiKey(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex')
}

/**
 * Quick shape check — rejects obvious garbage before we waste a DB lookup.
 * Does NOT confirm authenticity; that requires a hash match against a live
 * `api_keys` row.
 */
export function looksLikeApiKey(value: string): boolean {
    if (!value.startsWith(TOKEN_PREFIX)) return false
    const body = value.slice(TOKEN_PREFIX.length)
    // base64url of 32 bytes is 43 chars (no padding).
    if (body.length !== 43) return false
    return /^[A-Za-z0-9_-]+$/.test(body)
}
