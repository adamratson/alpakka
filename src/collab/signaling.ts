import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export interface OfferPayload {
  v: 1;
  role: "offer";
  sdp: RTCSessionDescriptionInit;
  listTitle: string;
}

export interface AnswerPayload {
  v: 1;
  role: "answer";
  sdp: RTCSessionDescriptionInit;
}

export function encodeOffer(payload: Omit<OfferPayload, "v" | "role">): string {
  const full: OfferPayload = { v: 1, role: "offer", ...payload };
  return compressToEncodedURIComponent(JSON.stringify(full));
}

export function decodeOffer(encoded: string): OfferPayload {
  const raw = decompressFromEncodedURIComponent(encoded);
  if (!raw) throw new Error("Invalid invite payload");
  const parsed = JSON.parse(raw) as Partial<OfferPayload>;
  if (parsed.v !== 1 || parsed.role !== "offer" || !parsed.sdp) {
    throw new Error("Unrecognized invite payload");
  }
  return parsed as OfferPayload;
}

export function encodeAnswer(sdp: RTCSessionDescriptionInit): string {
  const payload: AnswerPayload = { v: 1, role: "answer", sdp };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeAnswer(encoded: string): AnswerPayload {
  const raw = decompressFromEncodedURIComponent(encoded);
  if (!raw) throw new Error("Invalid answer payload");
  const parsed = JSON.parse(raw) as Partial<AnswerPayload>;
  if (parsed.v !== 1 || parsed.role !== "answer" || !parsed.sdp) {
    throw new Error("Unrecognized answer payload");
  }
  return parsed as AnswerPayload;
}
