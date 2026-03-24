import * as fb from "flatbuffers";
import { TCPClient } from "./tcp";

import SetNodePacket from "./network/packets/set-node";
import ExportPacket from "./network/packets/export";

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

export interface TypeHeader<TBase = any> {
  base: TBase;
  id: string;
}

interface TypeEntry {
  id: string;
  type: TypeHeader;
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
  protected builder: fb.Builder;
  protected nodes = new Map<NodeId, [INode<TOpcode>, fb.Offset]>();

  protected nextStringId: number = 1;
  protected stringlut = new Map<number, string>();

  protected nextTypeId: number = 1;
  protected typelut: TypeEntry[] = [];
  
  private socket: TCPClient;
  constructor(protected builderOptions: BuilderOptions) {
    this.builder = new fb.Builder(builderOptions.size ?? 1024);
    this.socket = new TCPClient();
    
    this.SetString("");
  }

  public Initialize(): Promise<void> {
    return this.socket.connect();
  }

  /**
   * 
   * @param node 
   */
  protected abstract buildNode(node: INode<TOpcode>, id: NodeId): fb.Offset;

  /**
   * Registers a node in the builder and assigns it a {@link NodeId}.
   *
   * This mirrors a frontend "block placed on canvas" action.
   * The node is immediately serialized to FlatBuffers and
   * stores the node and its binary offset.
   *
   * @param node The node to register
   * @param id Optional explicit {@link NodeId} (used when restoring state)
   */
  public SetNode(node: INode<TOpcode>, id?: NodeId): NodeId {
    this.builder.clear();

    let nodeId = id || BigInt(this.nodes.size);
    while (this.nodes.has(nodeId)) {
      nodeId = nodeId + 1n; // Retry with new id if exists
    }

    const nodeOffset = this.buildNode(node, nodeId);
    this.nodes.set(nodeId, [node, nodeOffset]);
    this.builder.finish(nodeOffset);

    // Send node to the opticode app
    const packet = new SetNodePacket();
    packet.data = this.builder.asUint8Array();

    this.socket.sendPacket(packet);
    
    return nodeId;
  }

  /**
   * Connects two nodes structurally.
   *
   * This defines ordering and containment in the graph:
   *  - parent.next = child
   *  - child.parent = parent
   *
   * Frontend equivalent: dragging one block under another.
   *
   * @param parent The container or previous node
   * @param child The node being attached
   */
  public ConnectNodes(parent: NodeId, child: NodeId) {
    const targetNode = this.nodes.get(parent);
    if (!targetNode) {
      console.error(`Could not find node with ${parent}.`);
      return;
    }

    const sourceNode = this.nodes.get(child);
    if (!sourceNode) {
      console.error(`Could not find node with ${child}.`);
      return;
    }
    this.builder.clear();

    targetNode[0].next = child;
    sourceNode[0].parent = parent;

    targetNode[0].parent = -1n;
    sourceNode[0].next = -1n;

    // Parent node
    const targetNodeOffset = this.buildNode(targetNode[0], parent);
    this.builder.finish(targetNodeOffset);

    // Send parent to the opticode app
    const parentNode = new SetNodePacket();
    parentNode.data = this.builder.asUint8Array();

    this.socket.sendPacket(parentNode);
    this.builder.clear();


    // Child node
    const sourceNodeOffset = this.buildNode(sourceNode[0], child);
    this.builder.finish(sourceNodeOffset);

    // Send child to the opticode app
    const childNode = new SetNodePacket();
    childNode.data = this.builder.asUint8Array();

    this.socket.sendPacket(childNode);
    this.builder.clear();
    

    this.nodes.set(parent, [targetNode[0], targetNodeOffset]);
    this.nodes.set(child, [sourceNode[0], sourceNodeOffset]);
  }


  protected SetString(s: string): number {
    // check if string already exists
    for (const [id, val] of this.stringlut) {
      if (val === s) return id;
    }

    const id = this.nextStringId++ >>> 0;

    if (id > 0xfffffffe) {
      throw new Error("uint32 overflow");
    }

    this.stringlut.set(id, s);
    return id;
  }

  public abstract CreateStringLUT(): fb.Offset;
  public abstract CreateTypeLUT(): fb.Offset;


  // Export
  public abstract buildApp(flags: number): Uint8Array;

  /**
   * Exports the current program as a FlatBuffers binary.
   *
   * Intended for sending the final output to the compiler.
   */
  public Export(flags: number = 0): void {
    this.builder.clear();

    // Export the app
    const packet = new ExportPacket();
    packet.data = this.buildApp(flags);

    this.socket.sendPacket(packet);

    this.Clear();
  }

  public Clear() {
    this.builder.clear();
    this.nodes.clear();

    this.stringlut.clear();
  }
}