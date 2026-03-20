import { IPacket } from "../ipacket";
import { BinaryStream } from "../binarystream";
import * as net from "../../network";

export default class ExportPacket extends IPacket {
  public id: net.ID = net.ID.Export;
  public data: Uint8Array = new Uint8Array();

  static {
    this.register();
  }

  public override encode(stream: BinaryStream): void {
    stream.writeBytes(this.data);
  }
}