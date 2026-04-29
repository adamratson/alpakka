import { describe, expect, it } from "vitest";
import {
  decodeAnswer,
  decodeOffer,
  encodeAnswer,
  encodeOffer,
} from "./signaling";

const sampleSdp: RTCSessionDescriptionInit = {
  type: "offer",
  sdp:
    "v=0\r\no=- 123 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:abcd\r\na=ice-pwd:efghijklmnopqrstuvwx\r\na=fingerprint:sha-256 AA:BB:CC:DD\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\n",
};

describe("offer codec", () => {
  it("round-trips an offer payload", () => {
    const encoded = encodeOffer({ sdp: sampleSdp, listTitle: "Trip" });
    const decoded = decodeOffer(encoded);
    expect(decoded.role).toBe("offer");
    expect(decoded.listTitle).toBe("Trip");
    expect(decoded.sdp).toEqual(sampleSdp);
  });

  it("produces URL-safe output", () => {
    const encoded = encodeOffer({ sdp: sampleSdp, listTitle: "Trip" });
    expect(encoded).toMatch(/^[A-Za-z0-9_$+\-]+$/);
  });

  it("rejects garbage input", () => {
    expect(() => decodeOffer("not-real")).toThrow();
  });

  it("rejects an answer payload as an offer", () => {
    const enc = encodeAnswer(sampleSdp);
    expect(() => decodeOffer(enc)).toThrow();
  });
});

describe("answer codec", () => {
  it("round-trips an answer payload", () => {
    const enc = encodeAnswer(sampleSdp);
    const decoded = decodeAnswer(enc);
    expect(decoded.role).toBe("answer");
    expect(decoded.sdp).toEqual(sampleSdp);
  });

  it("rejects an offer payload as an answer", () => {
    const enc = encodeOffer({ sdp: sampleSdp, listTitle: "Trip" });
    expect(() => decodeAnswer(enc)).toThrow();
  });
});
