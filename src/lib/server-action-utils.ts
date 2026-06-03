// Shared helpers for server actions.
// Plain module (NO 'use server' directive) so it may export synchronous helpers
// and be imported by both server actions and other server code.

/**
 * Next.js implements redirect() and notFound() by throwing a special control-flow
 * error. When a Server Action wraps its body in try/catch, those errors must be
 * re-thrown so Next can perform the navigation, instead of being swallowed and
 * reported as ordinary failures.
 */
export function isNextControlFlowError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message === 'NEXT_REDIRECT' || err.message === 'NEXT_NOT_FOUND')
  )
}
