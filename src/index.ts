import { TCPClient } from "./tcp";
import { BinaryStream } from "./network/binarystream";

const client = new TCPClient();
(async () => {
  await client.connect();
})();