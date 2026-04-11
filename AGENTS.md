<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Always use the commands from `package.json` when available.

Do not silence promise rejections with `void` for user-triggered actions or mutation calls. Handle errors explicitly with `try/catch` or an equivalent error path so failures remain observable and recovery behavior is intentional.

Avoid type assertions whenever possible. Prefer inference, explicit function return types, `satisfies`, and small runtime narrowing helpers over `as` casts. Keep `as const` only when literal inference is the intended outcome.
