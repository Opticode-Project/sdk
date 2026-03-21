import { NodeId } from "./ibuilder";
import { GoBuilder, GoBuilderOptions, FuncImpl } from "./go/builder";

import {
  GoFunc,
  GoPointerType,
  GoKind,
  GoStruct,
  GoInterface,
  GoTypeDef,
  GoType,
  GoString,
  GoArray,
  GoArrayType,
  GoStructType,
  GoFunctionType,
  GoInterfaceType,
  GoInt,
} from "./go/types";

const options: GoBuilderOptions = {
  name: "My First Go Project",
  size: 1000 * 64,
};

const builder = new GoBuilder(options);

(async () => {
  await builder.Initialize();

  const packageNode = builder.CreatePackageNode("main");
  const packageId = builder.SetNode(packageNode);

  const imports: NodeId[] = ["fmt", "testing"].map((v) => {
    return builder.SetNode(builder.CreateImportValueNode(v));
  });

  const importNode = builder.CreateImportNode(...imports);
  const importId = builder.SetNode(importNode);

  builder.ConnectNodes(packageId, importId);

  const consts: NodeId[] = [
    ["Greeting", "Hello, World!"],
    ["Farewell", "Goodbye, World!"],
  ].map((v) => {
    return builder.SetNode(
      builder.CreateConstValueNode(v[0], GoInt("Test", 32), v[1]),
    );
  });

  const constNode = builder.CreateConstNode(...consts);
  const constId = builder.SetNode(constNode);

  builder.ConnectNodes(importId, constId);

  const vars: NodeId[] = [
    ["Greeting", "Hello, World!"],
    ["Farewell", "Goodbye, World!"],
  ].map((v) => {
    return builder.SetNode(
      builder.CreateVarValueNode(v[0], GoInt("Test", 32), v[1]),
    );
  });

  const varNode = builder.CreateVarNode(...vars);
  const varId = builder.SetNode(varNode);

  builder.ConnectNodes(constId, varId);

  const ConditonNode = builder.CreateEqualNode("67", "76");
  const ConditonId = builder.SetNode(ConditonNode);

  const BodyNode = builder.CreateVarNode(vars[0]);
  const BodyId = builder.SetNode(BodyNode);

  const IfNode = builder.CreateIfNode(ConditonId, [BodyId]);
  const IfId = builder.SetNode(IfNode);

  builder.ConnectNodes(varId, IfId);
  const mainFuncType = GoFunc("main", [
    ["a", GoInt("int8", 8)]
  ], [
    ["b", GoInt("int16", 16)]
  ]);

  let body: NodeId[] = [];
  for (let i = 0; i < 5; i++) {
    const varValue = builder.SetNode(
      builder.CreateVarValueNode("N" + i, GoInt("Test", 32), i.toString()),
    );

    const varId = builder.SetNode(builder.CreateVarNode(varValue));
    const callId = builder.SetNode(
      builder.CreateCallNode("fmt.Println", [varId]),
    );
    body.push(varId);
  }

  const paramNode = builder.CreateConstValueNode(
    "meow",
    GoString("Test"),
    "something",
  );

  let params: NodeId[] = [builder.SetNode(paramNode)];

  const mainFuncDef: FuncImpl = {
    type: mainFuncType,
    params,
    body,
  };
  const mainFuncNode = builder.CreateFuncNode(mainFuncDef);
  const mainFuncId = builder.SetNode(mainFuncNode);
  builder.ConnectNodes(IfId, mainFuncId);

  
  builder.Export();
})();