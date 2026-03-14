export type NodeId = bigint;

export interface INodeValue {
  /** literal or pointer */
  value: string | NodeId;
  /** value semantics */
  flags: number;
}

export interface INode<
  TOpcode extends number,
  TNodeValue extends INodeValue = INodeValue,
> {
  opcode: TOpcode;
  parent?: NodeId;
  next?: NodeId;
  flags: number;

  // Indexed Node
  id?: number;
  fields?: TNodeValue[];

  // Binary Node
  left?: TNodeValue;
  right?: TNodeValue;
  
  // Unary Node
  value?: TNodeValue;
}

export interface BuilderOptions {
  size?: number; // Initial size allocated towards the builder.
  name?: string; // Program name (used when exporting).

  hookChunkSize?: number; // Max size in bytes of each chunk when streaming.
}

export abstract class IBuilder<
  TOpcode extends number,
  TNodeFlag extends number,
  TValueFlag extends number,
> {
  constructor(protected builderOptions: BuilderOptions) {

  }

  
}