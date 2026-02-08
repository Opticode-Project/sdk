# Examples
This directory contains examples demonstrating how to construct complete programs using the language-specific builder API.

These examples focus on **program structure**, not individual API calls.
For per-function usage and small snippets, see the TSDoc comments in the source.

---

### Important note on structure
Top-level declarations (such as packages, imports, and functions) are linked using `ConnectNodes`.

Statements inside functions **are not** connected using `ConnectNodes`.
Instead, they must be provided via the `body` field when creating a function node.

Example:
```ts
const stmtId = builder.SetNode(/* ... */);

const funcId = builder.SetNode(
  builder.CreateFuncNode({
    type: Func("main", [], []),
    body: [ stmtId ],
  })
);
```

---

The examples produce a FlatBuffers IR payload via `builder.Export()`.
The output is intended to be consumed by the Opticode compiler, which performs validation, formatting, and source code generation.