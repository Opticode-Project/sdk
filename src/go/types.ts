import { /*ChanDir,*/ Kind } from "./golang";

export enum GoKind {
  INT = "int",
  INT8 = "int8",
  INT16 = "int16",
  INT32 = "int32",
  INT64 = "int64",
  //UINT = "uint",
  UINT8 = "uint8",
  UINT16 = "uint16",
  UINT32 = "uint32",
  UINT64 = "uint64",
  UINTPTR = "uintptr",
  FLOAT32 = "float32",
  FLOAT64 = "float64",
  COMPLEX64 = "complex64",
  COMPLEX128 = "complex128",

  STRING = "string",
  RUNE = "rune",
  BYTE = "byte",

  BOOLEAN = "boolean",

  POINTER = "pointer",
  STRUCT = "struct",
  FUNC = "func",
  ARRAY = "array",
  SLICE = "slice",
  MAP = "map",
  CHANNEL = "channel",
  INTERFACE = "interface",
}

export type GoType = Kind | string;

export interface GoTypeHeader {
  base: GoType;
  id: string;
}

export type GoTypeDef =
  | GoPointerType
  | GoInterfaceType
  | GoStructType
  | GoFunctionType
  | GoMapType
  | GoChanType
  | GoArrayType
  | GoTypeHeader;

export const KindTable = {
  int: Kind.Int,
  int8: Kind.Int8,
  int16: Kind.Int16,
  int32: Kind.Int32,
  int64: Kind.Int64,
  //uint: Kind.Uint,
  uint8: Kind.Uint8,
  uint16: Kind.Uint16,
  uint32: Kind.Uint32,
  uint64: Kind.Uint64,
  uintptr: Kind.Uintptr,
  float32: Kind.Float32,
  float64: Kind.Float64,
  complex64: Kind.Complex64,
  complex128: Kind.Complex128,

  string: Kind.String,
  rune: Kind.Rune,
  byte: Kind.Byte,

  boolean: Kind.Boolean,

  pointer: Kind.Pointer,
  struct: Kind.Struct,
  func: Kind.Func,
  array: Kind.Array,
  slice: Kind.Slice,
  map: Kind.Map,
  channel: Kind.Channel,
  interface: Kind.Interface,
};

export const KindMapper = (kind: GoKind): Kind | Kind.Nil =>
  KindTable[kind] || Kind.Nil;

export interface GoPointerType extends GoTypeHeader {
  elem: GoTypeDef;
}

export interface GoInterfaceType extends GoTypeHeader {
  methods: GoFunctionType[];
}

export interface GoStructType extends GoTypeHeader {
  fields: {
    name: string;
    type: GoTypeDef;
    tag?: string;
  }[];
}

export interface GoFunctionType extends GoTypeHeader {
  params: [string, GoTypeDef][];
  results: [string, GoTypeDef][];
  impl?: [string, GoTypeDef];
  typeSig?: GoTypeDef;
}

export interface GoMapType extends GoTypeHeader {
  key: GoTypeDef;
  value: GoTypeDef;
}

export interface GoChanType extends GoTypeHeader {
  elem: GoTypeDef;
  dir: number;
  //dir: ChanDir;
}

export interface GoArrayType extends GoTypeHeader {
  elem: GoTypeDef;
  size: number[]; // For multi dimensional arrays, integer is split
}

export class GoStruct {
  private name: string = "UnnamedStruct";
  private fields: {
    name: string;
    type: GoTypeDef;
    tag?: string;
    value?: string;
  }[] = [];

  constructor() {
    return;
  }

  /**
   * @remarks
   * Method that sets the struct name
   */
  public Name(name: string): this {
    //! Add regex check here
    this.name = name;
    return this;
  }

  /**
   * @remarks Adds a field to the struct
   * @param name field identifier of the struct
   * @param kind type of the field value
   * @param tag struct field tag (e.g., `json:"example"`)
   * @param value only used when exported as value node
   */
  public Field(
    name: string,
    type: GoTypeDef,
    tag?: string,
    value?: string,
  ): this {
    //! Add regex check here

    this.fields.push({
      name,
      type,
      tag,
      value,
    });

    return this;
  }

  /**
   * @remarks Exports the struct as a type definition
   */
  public AsDefinition(): GoStructType {
    return {
      base: GoKind.STRUCT,
      id: this.name,
      fields: this.fields.map((f) => {
        return {
          name: f.name,
          type: f.type,
          tag: f.tag,
        };
      }),
    };
  }
}

export class GoInterface {
  private name = "UnnamedInterface";
  private methods: GoFunctionType[] = [];

  constructor() {
    return;
  }

  /**
   * @remarks Method that sets the interface name
   */
  public Name(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * @remarks Adds a method to the interface
   * @param name name of method
   * @param def function defintion
   */
  public Method(func: GoFunctionType): this {
    if (func.base !== GoKind.FUNC)
      throw new Error("Type definition must be of type func!");
    this.methods.push(func);
    return this;
  }

  /**
   * @remarks Exports the interface as a type definition
   */
  public AsDefinition(): GoInterfaceType {
    return {
      base: GoKind.INTERFACE,
      id: this.name,
      methods: this.methods,
    };
  }
}

/*export function GoUint(name: string, bitSize: 8 | 16 | 32 | 64): GoTypeDef {
  return {
    base: GoKind.UINT + bitSize.toString(),
    id: name,
  };
}*/

export function GoUintptr(name: string): GoTypeDef {
  return {
    base: GoKind.UINTPTR,
    id: name,
  };
}

export function GoFloat(name: string, bitSize: 32 | 64): GoTypeDef {
  return {
    base: "float" + bitSize.toString(),
    id: name,
  };
}

export function GoInt(name: string, bitSize: 8 | 16 | 32 | 64): GoTypeDef {
  return {
    base: GoKind.INT + bitSize.toString(),
    id: name,
  };
}

export function GoComplex(name: string, bitSize: 64 | 128): GoTypeDef {
  return {
    base: "complex" + bitSize.toString(),
    id: name,
  };
}

export function GoString(name?: string): GoTypeDef {
  return {
    base: GoKind.STRING,
    id: name || "",
  };
}

export function GoRune(name: string): GoTypeDef {
  return {
    base: GoKind.RUNE,
    id: name,
  };
}

export function GoByte(name: string): GoTypeDef {
  return {
    base: GoKind.BYTE,
    id: name,
  };
}

export function GoBoolean(name: string): GoTypeDef {
  return {
    base: GoKind.BOOLEAN,
    id: name,
  };
}

export function GoFunc(
  name: string,
  results: [string, GoTypeDef][],
  params: [string, GoTypeDef][],
  impl?: [string, GoTypeDef],
  typeSig?: GoTypeDef,
): GoFunctionType {
  return {
    base: GoKind.FUNC,
    id: name,
    impl,
    typeSig,
    params,
    results,
  };
}

export function GoPtr(def: GoTypeDef): GoPointerType {
  return {
    base: GoKind.POINTER,
    id: def.id,
    elem: def,
  };
}

export function GoChan(
  def: GoTypeDef,
  dir: number,
  //dir: ChanDir = ChanDir.Bidirectional,
): GoChanType {
  return {
    base: GoKind.CHANNEL,
    id: def.id,
    elem: def,
    dir,
  };
}

export function GoArray(def: GoTypeDef, size: number[]): GoArrayType {
  let base: GoKind = GoKind.ARRAY;
  if (!size) base = GoKind.SLICE;

  return {
    base,
    id: def.id,
    elem: def,
    size: size,
  };
}

export function GoMap(
  name: string,
  key: GoTypeDef,
  value: GoTypeDef,
): GoMapType {
  return {
    base: GoKind.MAP,
    id: name,
    key: key,
    value: value,
  };
}
