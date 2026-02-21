import * as fb from "flatbuffers";
import * as program from "./program";

export interface BuilderOptions {
  size?: number; // Initial size allocated towards the builder.
  name?: string; // Program name (used when exporting).

  hookChunkSize?: number; // Max size in bytes of each chunk when streaming.
}

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

interface TypeEntry {
  id: string;
  addr: fb.Offset;
}

export abstract class IBuilder<
  TOpcode extends number,
  TNodeFlag extends number,
  TValueFlag extends number,
> {
  protected builder: fb.Builder;
  protected nodes = new Map<NodeId, [INode<TOpcode>, fb.Offset]>();
  protected stringlut: string[] = [];
  private nextStringId: number = 1;
  protected nextTypeId: number = 1;
  protected typelut: TypeEntry[] = [];

  constructor(protected builderOptions: BuilderOptions) {
    this.builder = new fb.Builder(builderOptions.size ?? 1024);
    this.SetString("");
  }

  protected abstract buildNode(node: INode<TOpcode>, id: NodeId): fb.Offset;

  private CreateStringLUT(): fb.Offset {
    // Convert to array and sort numerically by key
    const entries = this.stringlut.sort((a, b) => a.localeCompare(b));

    const offsets: fb.Offset[] = [];

    for (let i = 0; i < entries.length; i++) {
      const valueOffset = this.builder.createString(entries[i]);

      program.StringEntry.startStringEntry(this.builder);
      program.StringEntry.addKey(this.builder, i);
      program.StringEntry.addValue(this.builder, valueOffset);

      offsets.push(program.StringEntry.endStringEntry(this.builder));
    }

    return program.App.createLutVector(this.builder, offsets);
  }

  private CreateTypeLUT(): fb.Offset {
    // Convert to array and sort numerically by key
    const entries = Array.from(this.typelut.entries()).sort(
      ([a], [b]) => a - b,
    );

    const offsets: fb.Offset[] = [];

    for (const [key, typeEntry] of entries) {
      program.TypeEntry.startTypeEntry(this.builder);
      program.TypeEntry.addKey(this.builder, key);
      program.TypeEntry.addValue(this.builder, typeEntry.addr);

      offsets.push(program.TypeEntry.endTypeEntry(this.builder));
    }

    return program.App.createTypesVector(this.builder, offsets);
  }

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
  public abstract SetNode(node: INode<TOpcode>, id?: NodeId): NodeId;

  /**
   * Removes a node from the graph.
   *
   * If `recursive` is true, referenced child nodes may also be deleted
   * depending on their value flags.
   */
  public abstract DeleteNode(id: NodeId, recursive?: boolean): void;

  public PrintNodes(): void {
    for (const [id, [node, offset]] of this.nodes) {
      console.log(
        `${id} (${offset}) -> ${JSON.stringify(node, (_, v) => (typeof v === "bigint" ? v.toString() : v))}`,
      );
    }
  }

  public PrintLUT(): void {
    for (let i = 0; i < this.stringlut.length; i++) {
      console.log(`${i} -> ${this.stringlut[i]}`);
    }
  }
  /**
   * @deprecated This is no longer needed
   */
  protected HashString(s: string): number {
    // cite: https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
    let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis

    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0; // FNV prime and force 32-bit
    }

    return hash >>> 0;
  }

  protected SetString(s: string): number {
    const id = this.nextStringId++ >>> 0;

    if (id > 0xfffffffe) {
      throw new Error("uint32 overflow");
    }

    this.stringlut[id] = s;
    return id;
  }

  // Export / Rebuild

  private buildApp(
    nodeOffsets: fb.Offset[],
    flags: number,
    includeLUT: boolean,
  ): Uint8Array {
    const nodesVector = program.App.createNodesVector(
      this.builder,
      nodeOffsets,
    );

    const stringLut: fb.Offset = includeLUT ? this.CreateStringLUT() : 0;
    const typeLut: fb.Offset = this.CreateTypeLUT();

    const name = this.builder.createString(
      this.builderOptions.name ?? "Unnamed Program",
    );

    program.App.startApp(this.builder);
    program.App.addNodes(this.builder, nodesVector);

    if (includeLUT) {
      program.App.addLut(this.builder, stringLut);
    }

    program.App.addTypes(this.builder, typeLut);
    program.App.addFlags(this.builder, flags);
    program.App.addName(this.builder, name);

    const programOffset = program.App.endApp(this.builder);
    this.builder.finish(programOffset);

    return this.builder.asUint8Array();
  }

  /**
   * Exports the current program as a FlatBuffers binary.
   *
   * Uses already-built node offsets and includes all lookup tables.
   * This is fast and does not rebuild nodes.
   *
   * Intended for saving the final output to disk or sending to the compiler.
   */
  public Export(flags: number = 0): Uint8Array {
    const nodeOffsets: fb.Offset[] = Array.from(this.nodes.values()).map(
      ([_, offset]) => offset,
    );

    return this.buildApp(nodeOffsets, flags, true);
  }

  /**
   * Rebuilds all nodes and re-emits the FlatBuffers program.
   *
   * This clears the FlatBuffers builder but preserves the logical graph.
   * Lookup tables are reused.
   *
   *
   */
  public async Rebuild(flags: number = 0): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.builder.clear();

      const nodeOffsets: fb.Offset[] = [];
      for (const [id, [node, offset]] of this.nodes) {
        const nodeOffset = this.buildNode(node, id);
        this.nodes.set(id, [node, nodeOffset]);

        nodeOffsets.push(nodeOffset);
      }

      resolve(this.buildApp(nodeOffsets, flags, false));
    });
  }

  public Clear() {
    this.builder.clear();
    this.nodes.clear();
    this.stringlut.length = 0;
  }
}
