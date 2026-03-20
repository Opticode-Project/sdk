import network from "node:net";
import * as fb from "flatbuffers";

import { IPacket } from "./network/ipacket";
import { BinaryStream, FrameDecoder } from "./network/binarystream";
import * as net from "./network";

import VerificationPacket from "./network/packets/verification";
import VerificationResponsePacket from "./network/packets/verification-response";

export class TCPClient {
  public static PROTOCOL = 1;

  public socket?: network.Socket;
  public port?: number;
  public decoder = new FrameDecoder();
  protected builder: fb.Builder;

  constructor(size = 256) {
    this.builder = new fb.Builder(size);
  }

  /**
   * Registers all packets and opens a TCP connections to the Opticode app
   * using the specified host address and port.
   */
  async connect(host: string = "127.0.0.1", port: number = 27430): Promise<void> {
    await IPacket.createAll();

    const socket = await this.tryConnection(host, port);
    if (!socket) {
      throw new Error("Server not found");
    }

    this.socket = socket;
    console.log("Connected to server on port", socket.remotePort);

    this.run();
  }

  private run() {
    const socket = this.socket;
    if (!socket) {
      return;
    }

    socket.on("data", data => {
      for (const frame of this.decoder.push(data)) {
        try {
          const packet = IPacket.decode(frame);

          // Let the packet handle itself
          packet.handle?.(this);
        }
        catch (err) {
          console.error("Packet error:", err);
        }
      }
    });

    socket.on("close", () => {
      console.log("Connection closed");
    });

    socket.on("error", err => {
      console.error("Socket error:", err);
    });
  }

  /**
   * Used for checking if a compiler is running on the specified port.
   * If verification is successful, it returns the socket connection.
   */
  private tryConnection(host: string, port: number): Promise<network.Socket | undefined> {
    return new Promise((resolve, reject) => {
      const decoder = new FrameDecoder();
      const socket = network.createConnection({ host, port });

      socket.setTimeout(200);

      const cleanup = () => {
        socket.removeAllListeners("data");
        socket.removeAllListeners("timeout");
        socket.removeAllListeners("error");
      };

      socket.once("connect", () => {
        // Send the handshake to the server
        const handshake = new VerificationPacket();
        handshake.protocol = TCPClient.PROTOCOL;
        handshake.language = "golang";

        this.sendPacketToSocket(socket, handshake);
      });

      socket.on("data", data => {
        for (const frame of decoder.push(data)) {
          const packet = IPacket.decode(frame);
          
          try {
            packet.handle(this);
          } catch(error) { reject(error); }
          
          if (packet instanceof VerificationResponsePacket) {
            cleanup();

            socket.setTimeout(0);
            resolve(socket);
            return;
          }
        }
      });

      socket.once("timeout", () => {
        cleanup();

        socket.destroy();
        resolve(void 0);
      });

      socket.once("error", () => {
        cleanup();
        
        socket.destroy();
        resolve(void 0);
      });
    });
  }

  public sendPacket(packet: IPacket) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    this.sendPacketToSocket(this.socket, packet);
  }

  private sendPacketToSocket(socket: network.Socket, packet: IPacket) {
    this.builder.clear();

    const payload = IPacket.encode(packet);
    const payloadOffset = net.Packet.createPayloadVector(this.builder, payload);

    // Flatbuffers builder
    net.Packet.startPacket(this.builder);
    net.Packet.addId(this.builder, packet.id);
    net.Packet.addPayload(this.builder, payloadOffset);
    
    const packetOffset = net.Packet.endPacket(this.builder);
    this.builder.finish(packetOffset);

    const buffer = this.builder.asUint8Array();
    //console.log("Payload:", buffer);

    // Write to the socket stream
    const stream = new BinaryStream();
    stream.writeBytes(buffer);

    socket.write(
      stream.toUint8Array(true)
    );
  }
}