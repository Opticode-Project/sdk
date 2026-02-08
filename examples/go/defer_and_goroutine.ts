/**
 * Resulting Go code:
 * ```go
 *   package main
 *   import "fmt"
 *
 *   func main() {
 *     fmt.Println("Hello!")
 * 
 *     defer fmt.Println("Hello!")
 *     go worker()
 *     return
 *   }
 * ```
 */

import { GoBuilder } from "../../src/go/builder";
import { Func } from "../../src/go/types";

const builder = new GoBuilder({ name: "defer-and-goroutine" });

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


const printCallId = builder.SetNode(
  builder.CreateCallNode("fmt.Println", ["Hello!"])
);

// defer fmt.Println("Hello!")
const deferId = builder.SetNode(
  builder.CreateDeferNode(printCallId)
);

// go worker()
const workerCallId = builder.SetNode(
  builder.CreateCallNode("worker", [])
);

const goId = builder.SetNode(
  builder.CreateGoRoutineNode(workerCallId)
);

// return
const returnId = builder.SetNode(
  builder.CreateReturnNode([])
);

// func main() {}
const mainFuncId = builder.SetNode(
  builder.CreateFuncNode({
    type: Func("main", [], []),
    body: [ printCallId, deferId, goId, returnId ]
  })
);

builder.ConnectNodes(importId, mainFuncId);

// Export IR
const buffer = builder.Export();
console.log(buffer);