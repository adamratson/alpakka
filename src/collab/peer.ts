import {
  decodeAnswer,
  decodeOffer,
  encodeAnswer,
  encodeOffer,
} from "./signaling";
import { dataChannelTransport, type SyncTransport } from "./sync";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

// Wait for ICE gathering to complete, but cap the wait so we don't hang
// forever when STUN is unreachable. The SDP we already have will include all
// candidates gathered so far, which is enough for same-network use.
function waitForIceComplete(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      pc.removeEventListener("icegatheringstatechange", check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    pc.addEventListener("icegatheringstatechange", check);
    const timer = setTimeout(finish, timeoutMs);
  });
}

function awaitChannelOpen(channel: RTCDataChannel): Promise<RTCDataChannel> {
  channel.binaryType = "arraybuffer";
  if (channel.readyState === "open") return Promise.resolve(channel);
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve(channel);
    };
    const onError = (e: Event) => {
      cleanup();
      reject(e);
    };
    const cleanup = () => {
      channel.removeEventListener("open", onOpen);
      channel.removeEventListener("error", onError);
    };
    channel.addEventListener("open", onOpen);
    channel.addEventListener("error", onError);
  });
}

export interface HostSession {
  pc: RTCPeerConnection;
  encodedOffer: string;
  // Resolves with a sync transport once the data channel is open. The
  // underlying message listener is attached at channel-creation time so no
  // messages are dropped between channel.open and consumption.
  ready: Promise<SyncTransport>;
  acceptAnswer: (encodedAnswer: string) => Promise<void>;
  close: () => void;
}

export async function createHostSession(listTitle: string): Promise<HostSession> {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel("sync", { ordered: true });
  // Wrap immediately so the eager message listener is attached now.
  const transport = dataChannelTransport(channel);
  const ready = awaitChannelOpen(channel).then(() => transport);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceComplete(pc);

  if (!pc.localDescription) throw new Error("Failed to create offer");
  const encodedOffer = encodeOffer({ sdp: pc.localDescription.toJSON(), listTitle });

  return {
    pc,
    encodedOffer,
    ready,
    acceptAnswer: async (encodedAnswer) => {
      const { sdp } = decodeAnswer(encodedAnswer);
      await pc.setRemoteDescription(sdp);
    },
    close: () => pc.close(),
  };
}

export interface JoinerSession {
  pc: RTCPeerConnection;
  listTitle: string;
  encodedAnswer: string;
  ready: Promise<SyncTransport>;
  close: () => void;
}

export async function createJoinerSession(encodedOffer: string): Promise<JoinerSession> {
  const { sdp, listTitle } = decodeOffer(encodedOffer);
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  const ready = new Promise<SyncTransport>((resolve, reject) => {
    pc.addEventListener("datachannel", (e) => {
      // Wrap immediately so the eager message listener is attached before any
      // messages from the host can be missed.
      const transport = dataChannelTransport(e.channel);
      awaitChannelOpen(e.channel).then(() => resolve(transport), reject);
    });
  });

  await pc.setRemoteDescription(sdp);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceComplete(pc);

  if (!pc.localDescription) throw new Error("Failed to create answer");
  const encodedAnswer = encodeAnswer(pc.localDescription.toJSON());

  return {
    pc,
    listTitle,
    encodedAnswer,
    ready,
    close: () => pc.close(),
  };
}
