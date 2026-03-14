export class BinaryStream {
  private buffer: Uint8Array;
  private view: DataView;
  private readPos = 0;
  private writePos = 0;

  static readonly MAX_STRING_SIZE = 1 << 16; // 65,536 bytes

  static readonly decoder = new TextDecoder();
  static readonly encoder = new TextEncoder();

  constructor(data?: Uint8Array | number) {
    if (data instanceof Uint8Array) {
      this.buffer = data;
      this.writePos = data.length;
    }
    else {
      this.buffer = new Uint8Array(data ?? 64);
    };

    this.view = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset,
      this.buffer.byteLength
    );
  };

  get size(): number {
    return this.writePos;
  };

  get capacity(): number {
    return this.buffer.length;
  };
  
  static from(data: Uint8Array | Int8Array): BinaryStream {
    const buffer = data instanceof Uint8Array
      ? data
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    const stream = new BinaryStream(buffer);

    stream.writePos = data.length;
    stream.readPos = 0;
    return stream;
  };

  private ensureRead(length: number) {
    if (length > this.remaining()) {
      throw new Error(`Read past end. Pos: ${this.readPos + length}, size: ${this.size}`);
    };
  };

  reset() {
    this.readPos = 0;
    this.writePos = 0;
  };

  peekByte(): number {
    this.ensureRead(1);
    return this.buffer[this.readPos];
  };

  skip(length: number) {
    this.ensureRead(length);
    this.readPos += length;
  };

  remaining(): number {
    return this.writePos - this.readPos;
  };

  remainingSlice(): Uint8Array {
    return this.buffer.subarray(this.readPos, this.writePos);
  };

  getReadOffset(): number {
    return this.readPos;
  };

  setReadOffset(pos: number) {
    if (pos < 0 || pos > this.writePos) {
      throw new Error("Invalid read position");
    };

    this.readPos = pos;
  };

  // Readers
  readByte(): number {
    this.ensureRead(1);
    return this.buffer[this.readPos++];
  };

  readSignedByte(): number {
    const v = this.readByte();
    return (v << 24) >> 24; // sign extend
  };

  readBytes(length: number): Uint8Array {
    if (length < 0) {
      throw new Error("Negative byte length");
    };

    this.ensureRead(length);

    const slice = this.buffer.subarray(
      this.readPos,
      this.readPos + length
    );

    this.readPos += length;
    return slice;
  };

  readInt16(littleEndian = false): number {
    this.ensureRead(2);

    const value = this.view.getInt16(this.readPos, littleEndian,);
    this.readPos += 2;
    
    return value;
  };

  readUInt16(littleEndian = false): number {
    this.ensureRead(2);

    const value = this.view.getUint16(this.readPos, littleEndian);
    this.readPos += 2;
    
    return value;
  };

  readInt32(littleEndian = false): number {
    this.ensureRead(4);

    const value = this.view.getInt32(this.readPos, littleEndian);
    this.readPos += 4;
    
    return value;
  };

  readUInt32(littleEndian = false): number {
    this.ensureRead(4);

    const value = this.view.getUint32(this.readPos, littleEndian);
    this.readPos += 4;
    
    return value;
  };

  readInt64(littleEndian = false): bigint {
    this.ensureRead(8);

    const value = this.view.getBigInt64(this.readPos, littleEndian);
    this.readPos += 8;

    return value;
  };

  readUInt64(littleEndian = false): bigint {
    this.ensureRead(8);

    const value = this.view.getBigUint64(this.readPos, littleEndian);
    this.readPos += 8;
    
    return value;
  };

  readFloat32(littleEndian = false): number {
    this.ensureRead(4);
    
    const value = this.view.getFloat32(this.readPos, littleEndian);
    this.readPos += 4;

    return value;
  };

  readFloat64(littleEndian = false): number {
    this.ensureRead(8);

    const value = this.view.getFloat64(this.readPos, littleEndian);
    this.readPos += 8;
    
    return value;
  };

  readUnsignedVarInt(): number {
    let value = 0;
    let shift = 0;

    for (let i = 0; i < 5; i++) {
      const byte = this.readByte();

      if (i === 4 && byte & 0x80) {
        throw new Error("Malformed VarInt");
      };

      value += (byte & 0x7f) << shift;

      if ((byte & 0x80) === 0) {
        return value;
      };

      shift += 7;
    };

    throw new Error("VarInt too big");
  };

  readSignedVarInt(): number {
    const raw = this.readUnsignedVarInt();
    return (raw >>> 1) ^ -(raw & 1);
  };

  readUnsignedVarLong(): bigint {
    let value = 0n;

    for (let i = 0; i < 10; i++) {
      const byte = BigInt(this.readByte());

      if (i === 9 && byte & 0x80n) {
        throw new Error("Malformed VarLong");
      };

      value += (byte & 0x7fn) << BigInt(7 * i);

      if ((byte & 0x80n) === 0n) {
        return value;
      };
    };

    throw new Error("VarLong too big");
  };

  readSignedVarLong(): bigint {
    const raw = this.readUnsignedVarLong();
    return (raw >> 1n) ^ -(raw & 1n);
  };

  readString(length?: number, littleEndian = false, max = BinaryStream.MAX_STRING_SIZE): string {
    if (length === void 0) {
      length = this.readUInt32(littleEndian);
    };

    if (length < 0) {
      throw new Error("Negative string length");
    };

    if (length > max) {
      throw new Error("String too large");
    };


    this.ensureRead(length);

    const slice = this.buffer.subarray(
      this.readPos,
      this.readPos + length
    );
    
    this.readPos += length;
    return BinaryStream.decoder.decode(slice);
  };

  readBoolean(): boolean {
    return this.readByte() !== 0;
  };

  readStream(length: number): BinaryStream {
    const slice = this.readBytes(length);
    return BinaryStream.from(slice);
  };

  // Writers
  private ensureWrite(length: number) {
    const required = this.writePos + length;

    if (required <= this.buffer.length)
      return;

    // Grow exponentially
    let newLength = this.buffer.length === 0 ? 16 : this.buffer.length;
    while (newLength < required) {
      newLength *= 2;
    };

    const newBuffer = new Uint8Array(newLength);
    newBuffer.set(this.buffer);

    this.buffer = newBuffer;
    this.view = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset,
      this.buffer.byteLength
    );
  };

  writeByte(value: number) {
    this.ensureWrite(1);
    this.buffer[this.writePos++] = value & 0xFF;
  };

  writeSignedByte(value: number) {
    this.writeByte(value);
  };

  writeBytes(bytes: Uint8Array) {
    this.ensureWrite(bytes.length);
    this.buffer.set(bytes, this.writePos);
    this.writePos += bytes.length;
  };

  writeInt16(value: number, littleEndian = false) {
    this.ensureWrite(2);
    this.view.setInt16(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 2;
  };

  writeUInt16(value: number, littleEndian = false) {
    this.ensureWrite(2);
    this.view.setUint16(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 2;
  };

  writeInt32(value: number, littleEndian = false) {
    this.ensureWrite(4);
    this.view.setInt32(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 4;
  };

  writeUInt32(value: number, littleEndian = false) {
    this.ensureWrite(4);
    this.view.setUint32(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 4;
  };

  writeInt64(value: bigint, littleEndian = false) {
    this.ensureWrite(8);
    this.view.setBigInt64(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 8;
  };

  writeUInt64(value: bigint, littleEndian = false) {
    this.ensureWrite(8);
    this.view.setBigUint64(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 8;
  };

  writeFloat32(value: number, littleEndian = false) {
    this.ensureWrite(4);
    this.view.setFloat32(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 4;
  };

  writeFloat64(value: number, littleEndian = false) {
    this.ensureWrite(8);
    this.view.setFloat64(
      this.writePos,
      value,
      littleEndian
    );
    this.writePos += 8;
  };

  writeUnsignedVarInt(value: number) {
    while (value > 0x7F) {
      this.writeByte((value & 0x7F) | 0x80);
      value >>>= 7;
    };

    this.writeByte(value);
  };

  writeSignedVarInt(value: number) {
    const zigzag = (value << 1) ^ (value >> 31);
    this.writeUnsignedVarInt(zigzag);
  };

  writeUnsignedVarLong(value: bigint) {
    while (value > 0x7Fn) {
      this.writeByte(Number((value & 0x7Fn) | 0x80n));
      value >>= 7n;
    };

    this.writeByte(Number(value));
  };

  writeSignedVarLong(value: bigint) {
    const zigzag = (value << 1n) ^ (value >> 63n);
    this.writeUnsignedVarLong(zigzag);
  };

  writeString(value: string, littleEndian = false) {
    const encoded = BinaryStream.encoder.encode(value);
    
    this.writeUInt32(encoded.length, littleEndian);
    this.writeBytes(encoded);
  };

  writeBoolean(value: boolean) {
    this.writeByte(value ? 1 : 0);
  };

  writeStream(stream: BinaryStream) {
    this.writeBytes(stream.toUint8Array());
  };

  toUint8Array(includeSize: boolean = false): Uint8Array {
    const data = this.buffer.subarray(0, this.writePos);

    if (!includeSize) {
      return data;
    };

    const out = new Uint8Array(4 + data.length);
    const view = new DataView(out.buffer);

    view.setUint32(0, data.length, false); // false = big-endian
    out.set(data, 4);

    return out;
  };
};

export class FrameDecoder {
  private buffer = Buffer.alloc(0);

  push(data: Buffer): Uint8Array[] {
    this.buffer = Buffer.concat([this.buffer, data]);
    const frames: Uint8Array[] = [];

    while (this.buffer.length >= 4) {
      const size = this.buffer.readUInt32BE(0);

      if (this.buffer.length < 4 + size) {
        break;
      };

      frames.push(this.buffer.subarray(4, 4 + size));
      this.buffer = this.buffer.subarray(4 + size);
    };

    return frames;
  };
};