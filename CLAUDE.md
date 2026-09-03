# Court Proof — working agreement

Video analysis platform for Barbon Performance. This repository holds the two clients; the API
lives in `court-proof-backend`, and so do the architecture, the data model and the phase plan, in
`docs/ARCHITECTURE.md` there. The product mockup in
[`docs/court-proof-app-mockup-v3.html`](docs/court-proof-app-mockup-v3.html) is the specification
for both UX and copy. Read them before building a screen.

## Comments and documentation

**No TSDoc.** Never write a `/** ... */` block anywhere in this repository — not on components,
hooks, functions, types, interfaces, enums, constants or tests — and never write `@param`,
`@returns`, `@throws`, `@see` or `{@link}` tags. Do not reintroduce one into a file that has none,
and do not "helpfully" document a function you are only passing through. Generated files are
exempt — nobody edits `packages/api-client/src/generated/`, `pnpm gen:api` rewrites it.

A `//` comment is allowed, but only when it records something the code genuinely cannot say: a
decision with a non-obvious trade-off, a workaround for external behaviour, a constraint that
would look like a mistake to the next reader. A comment that restates the signature, names the
obvious, or narrates the next three lines is noise — delete it instead of writing it.

Names, small functions and tests carry the explanation. The long-form "why" belongs in
`docs/ARCHITECTURE.md` or an ADR under `docs/adr/` in `court-proof-backend`, or in the commit
message.

## Language

Everything that lives in the repository is in **English**: code, identifiers, file names,
comments, commit messages, branch names, docs, and the output of development scripts.

The single exception is **end-user product copy**, which follows the product's language.

## Git

- Conventional Commits: `<type>(<scope>): <imperative, lowercase, no trailing period>`.
  Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `style`.
- Incremental commits — one logical change each, and every commit compiles on its own.
- Never commit directly to `main`. Branch per unit of work: `feat/<slug>`, `fix/<slug>`,
  `chore/<slug>`, `refactor/<slug>`. Merge with `--no-ff`.
- **Never push, never open a pull request.** Commits stay local; publishing is Alvaro's call.
- No `Co-Authored-By` trailers and no tool attribution in commit messages or PR descriptions.

## The API contract

The OpenAPI spec of the `court-proof-backend` repository is the source of truth for both
clients. After a DTO changes there, run `pnpm gen:api` with that backend running. If a client
stops compiling afterwards, the contract changed and the client has to catch up — that is the
point, not a problem to route around.

## Tests

```bash
pnpm typecheck
```
