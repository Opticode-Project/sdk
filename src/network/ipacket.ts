import * as fs from "node:fs";
import * as path from "node:path";
import * as fb from "flatbuffers";

import { BinaryStream } from "./binarystream";
import { TCPClient } from "../tcp";
import * as net from "../network";

type PacketConstructor<T extends any[] = any[]> = new (...args: T) => IPacket;
type PacketRegistration = {
  ctor: PacketConstructor;
  args: any[];
};

export abstract class IPacket {
  private static REGISTRY: PacketRegistration[] = [];
  private static INSTANCES: IPacket[] = [];
  private static ID_MAP = new Map<net.ID, PacketConstructor>();

  public abstract id: net.ID;

  encode(stream: BinaryStream): void {}
  decode(stream: BinaryStream): void {}

  handle(client: TCPClient): void {
    throw new Error(`Packet ${this.constructor.name} has no handler`);
  }

  protected static register<T extends PacketConstructor>(this: T, ...args: ConstructorParameters<T>) {
    IPacket.REGISTRY.push({ ctor: this, args });
  }

  public static clear() {
    this.INSTANCES = [];
    this.REGISTRY = [];
  }

  public static getRegistered(): PacketRegistration[] {
    return this.REGISTRY;
  }

  public static getInstances(): IPacket[] {
    return [...IPacket.INSTANCES];
  }

  public static async createAll(): Promise<IPacket[]> {
    if (this.INSTANCES.length > 0) {
      return this.INSTANCES;
    }

    const packetsDirectory = new URL("./packets", import.meta.url)
    for (const entry of fs.readdirSync(packetsDirectory)) {
      if (entry.endsWith(".ts")) {
        const modulePath = path.join(packetsDirectory.toString(), entry);
        await import(modulePath);
      }
    }

    this.INSTANCES = IPacket.REGISTRY.map(({ ctor, args }) => {
      const instance = new ctor(...args);
      this.ID_MAP.set(instance.id, ctor);

      return instance;
    });

    return this.INSTANCES;
  }

  public static decode(frame: Uint8Array): IPacket {
    const netPacket = net.Packet.getRootAsPacket(
      new fb.ByteBuffer(frame)
    );

    const ctor = this.ID_MAP.get(netPacket.id());
    if (!ctor) {
      throw new Error(`Unknown packet ${netPacket.id()}`);
    }

    const payload = netPacket.payloadArray();
    if (!payload) {
      throw new Error("Couldn't retrieve packet payload");
    }

    const stream = BinaryStream.from(payload);
    const packet = new ctor();

    packet.decode(stream);
    return packet;
  }

  public static encode(packet: IPacket): Uint8Array {
    const stream = new BinaryStream();
    packet.encode(stream);
    
    return stream.toUint8Array(false);
  }
}