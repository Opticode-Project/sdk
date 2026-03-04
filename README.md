# nodes-opticode
This library is a node-based IR builder used by the Opticode app.

It provides language-specific builders (e.g., Go) that construct a structured buffer representation of programs. This library does **not** generate source code directly.

Instead, it builds a graph of typed nodes that represent language constructs such as:
- packages and imports
- functions and statements
- control flow (`if`, `for`, `switch`)
- expressions and operators
- built-in functions and concurrency primitives

The resulting node structure is serialized and passed to a compiler that performs formatting, validation, and code generation.

Additional languages can be supported by implementing new builders on top of the shared graph and schema infrastructure.

---

See the [examples/](./examples/) directory for complete programs.
