export const MAX_API_BODY_BYTES = 256 * 1024

export function tooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  return Number.isFinite(contentLength) && contentLength > MAX_API_BODY_BYTES
}

export function bodyTooLargeResponse() {
  return Response.json({ error: 'Request body too large' }, { status: 413 })
}
