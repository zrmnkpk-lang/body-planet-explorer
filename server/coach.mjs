/** Server-side adapter. The provider URL and key never enter the browser bundle. */
export function coachMiddleware(env = process.env) {
  return async (req, res, next = () => {}) => {
    const pathname = req.url?.split("?")[0]
    if (pathname !== "/api/coach" && pathname !== "/api/coach/status")
      return next()
    const send = (status, value) => {
      if (res.destroyed) return
      res.statusCode = status
      res.setHeader("Content-Type", "application/json")
      res.setHeader("Cache-Control", "no-store")
      res.end(JSON.stringify(value))
    }
    const available = Boolean(env.COACH_SERVICE_URL)
    if (pathname === "/api/coach/status" && req.method === "GET")
      return send(200, { available })
    if (req.method !== "POST") return send(405, { error: "Method not allowed" })
    if (!available)
      return send(503, { error: "Coach service is not configured" })
    if (
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return send(403, { error: "Invalid origin" })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    res.once("close", () => {
      if (!res.writableEnded) controller.abort()
    })
    try {
      let text = ""
      for await (const chunk of req) {
        text += chunk.toString()
        if (Buffer.byteLength(text) > 65536)
          return send(413, { error: "Question is too large" })
      }
      const body = JSON.parse(text)
      if (
        !Array.isArray(body.messages) ||
        !body.messages.length ||
        body.messages.length > 20 ||
        body.messages.some(
          (m) =>
            !["user", "assistant"].includes(m.role) ||
            typeof m.content !== "string" ||
            m.content.length > 16000,
        )
      )
        return send(400, { error: "Invalid messages" })
      const provider = new URL(env.COACH_SERVICE_URL)
      if (!["http:", "https:"].includes(provider.protocol))
        return send(503, { error: "Invalid service configuration" })
      const response = await fetch(provider, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.COACH_SERVICE_KEY
            ? { Authorization: `Bearer ${env.COACH_SERVICE_KEY}` }
            : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: body.messages,
          context: body.context,
          exerciseIds: body.exerciseIds,
        }),
      })
      if (!response.ok)
        return send(502, { error: "The coaching service could not reply" })
      const reply = await response.json()
      if (
        typeof reply.content !== "string" ||
        !reply.content.trim() ||
        reply.content.length > 16000
      )
        return send(502, { error: "Invalid coaching response" })
      return send(200, {
        content: reply.content,
        ...(reply.plan ? { plan: reply.plan } : {}),
      })
    } catch (error) {
      return send(error instanceof SyntaxError ? 400 : 502, {
        error:
          error instanceof SyntaxError
            ? "Invalid request"
            : "The coaching service could not reply",
      })
    } finally {
      clearTimeout(timer)
    }
  }
}
export function coachPlugin() {
  return {
    name: "portal-coach-service",
    configureServer(server) {
      server.middlewares.use(coachMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(coachMiddleware())
    },
  }
}
