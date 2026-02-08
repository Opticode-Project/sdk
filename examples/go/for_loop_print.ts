/**
 * Resulting Go code:
 * ```go
 *   package main
 *   import "fmt"
 *
 *   func main() {
 *     var i = 0
 *     for i = 0; i < 5; i++ {
 *       fmt.Println(i)
 *     }
 *   }
 * ```
 */

import { GoBuilder } from "../../src/go/builder";
import { Func, Int } from "../../src/go/types";

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


// var i = 0
const varValueId = builder.SetNode(
  builder.CreateVarValueNode("i", Int("int", 32), "0")
);
const varId = builder.SetNode(
  builder.CreateVarNode(varValueId)
);

// i = 0
const assignId = builder.SetNode(
  builder.CreateAssignNode("i", "0")
);

// i < 5
const condId = builder.SetNode(
  builder.CreateLessNode("i", "5")
);

// i++
const postId = builder.SetNode(
  builder.CreateIncNode("i")
);

// fmt.Println(i)
const printId = builder.SetNode(
  builder.CreateCallNode("fmt.Println", [ varId ])
);

// for i = 0; i < 5; i++ { fmt.Println(i) }
const forId = builder.SetNode(
  builder.CreateForNode(
    assignId,
    condId,
    postId,
    [ printId ],
  )
);

// func main() {}
const mainFuncId = builder.SetNode(
  builder.CreateFuncNode({
    type: Func("main", [], []),
    body: [ varId, forId ]
  })
);

builder.ConnectNodes(importId, mainFuncId);

// Export IR
const buffer = builder.Export();
console.log(buffer);