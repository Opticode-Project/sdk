import { IPacket } from "../ipacket";
import { BinaryStream } from "../binarystream";
import { TCPClient } from "../../tcp";

import * as net from "../../network";

export default class VerificationResponsePacket extends IPacket {
  public id: net.ID = net.ID.RVerification;

  public accepted: boolean = false;
  public message: string = "";

  static {
    this.register();
  }

  public override decode(stream: BinaryStream): void {
    this.accepted = stream.readBoolean();
    this.message = stream.readString();
  }

  public handle(client: TCPClient) {
    if (!this.accepted) {
      throw new Error(this.message);
    }
  }
}