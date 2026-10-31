# Codebase map (Graphify knowledge graph)

This directory holds a queryable **knowledge graph** of the `cloudclip`
monorepo, generated with [Graphify](https://github.com/Graphify-Labs/graphify).
It maps the code (the Expo/React Native app in `app/` and the TypeScript backend
in `backend/`) into nodes (functions, components, hooks, modules, config) and
edges (calls, imports, references), so you can query the architecture instead of
grepping through files.

## What's here

| File | What it is |
| --- | --- |
| `graph.json` | The full graph: 737 nodes, 1747 edges, 53 communities. Query it with the `graphify` CLI. |
| `GRAPH_REPORT.md` | Human-readable highlights: god nodes (core abstractions), communities, surprising connections, knowledge gaps, suggested questions. |
| `graph.html` | Interactive force-directed viewer — open in any browser, click/filter/search nodes. |
| `.graphify_analysis.json`, `.graphify_labels.json`, `manifest.json` | Sidecar metadata (community analysis, labels, file manifest). |

Local build artifacts (`cache/`, dated backup folders) are git-ignored.

## Architecture at a glance

The most-connected abstractions ("god nodes") reveal the shape of the app:

1. `useTheme()` (61 edges) / `useThemedStyles()` (46) — the theming system threads through almost every component.
2. `ApiService` (32) — the client-side hub for talking to the backend.
3. `useAuth()` (25) — auth context consumed across screens.
4. `useClipboardSync()` (20) — the core clipboard-sync hook.
5. `getMasterKey()` / `keyService` / encryption — the end-to-end crypto layer.

Edges are tagged `EXTRACTED` (explicit in source) or `INFERRED` (resolved by
Graphify). This graph is ~98% EXTRACTED.

## Using the map

```bash
# Ask a plain-language question (BFS over graph.json)
graphify query "how does clipboard sync work?"

# Trace how two things connect
graphify path "ApiService" "getMasterKey"

# Explain one node and its neighbours
graphify explain "useClipboardSync"

# List the architectural hubs
graphify god-nodes --top 10
```

All commands default to `graphify-out/graph.json`.

## Refreshing after code changes

```bash
# Fast, deterministic, no API key — re-extracts code and updates the graph
graphify update .
```

`GRAPH_REPORT.md` records the commit the graph was built from
(`built_at_commit`). Compare it to `git rev-parse HEAD` to check for staleness.

> Generated with `graphify extract . --code-only` (local tree-sitter AST, no LLM).
> Community labels use representative node names; set an `ANTHROPIC_API_KEY`
> or other backend and run `graphify label .` for LLM-generated community names.
