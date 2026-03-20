import { IPacket } from "../ipacket";
import { BinaryStream } from "../binarystream";
import * as net from "../../network";

export default class SetNodePacket extends IPacket {
  public id: net.ID = net.ID.SetNode;
  public data: Uint8Array = new Uint8Array();

  static {
    this.register();
  }

  public override encode(stream: BinaryStream): void {
    stream.writeBytes(this.data);
  }
}