/**
 * Resulting Go code:
 * ```go
 *   package main
 *   import "fmt"
 *
 *   func main() {
 *     fmt.Println("Hello, world!")
 *   }
 * ```
 */

import { GoBuilder } from "../../src/go/builder";
import { Func } from "../../src/go/types";

const builder = new GoBuilder({ name: "hello-world" });

// package main
const pkgId = builder.SetNode(
  builder.CreatePackageNode("main")
);

// import "fmt"
const fmtImportId = builder.SetNode(
  builder.CreateImportValueNode("fmt")
);

const importId = builder.SetNode(
  builder.CreateImportNode(fmtImportId)
);

builder.ConnectNodes(pkgId, importId);


// fmt.Println("Hello, world!")
const printId = builder.SetNode(
  builder.CreateCallNode("fmt.Println", [ "Hello, world!" ])
);

// func main() {}
const mainFuncId = builder.SetNode(
  builder.CreateFuncNode({
    type: Func("main", [], []),
    body: [ printId ]
  })
);

builder.ConnectNodes(importId, mainFuncId);

// Export IR
const buffer = builder.Export();
console.log(buffer);