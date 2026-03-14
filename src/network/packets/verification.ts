import { IPacket } from "../ipacket";
import { BinaryStream } from "../binarystream";

import * as net from "../../network";

export default class VerificationPacket extends IPacket {
  public id: net.ID = net.ID.Verification;
  
  public protocol: number = 0;
  public language: string = "";

  static {
    this.register();
  }

  public override encode(stream: BinaryStream): void {
    stream.writeUInt16(this.protocol);
    stream.writeString(this.language);
  }
}