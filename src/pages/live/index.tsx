import React, { useEffect, useRef, useState } from "react";
import { createSignalingClient } from "../../lib/signalingClient";

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

export default function LiveClassesPage() {
  const [roomId, setRoomId] = useState("class-1");
  const [status, setStatus] = useState<string>("idle");
  const [joined, setJoined] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sigRef = useRef<ReturnType<typeof createSignalingClient> | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  async function ensurePC() {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sigRef.current?.sendSignal({ kind: "ice", candidate: ev.candidate });
      }
    };

    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (remoteVideo.current && stream) remoteVideo.current.srcObject = stream;
    };

    return pc;
  }

  async function startMedia() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;

    const pc = await ensurePC();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }

  async function join() {
    if (joined) return;
    setStatus("joining...");
    await startMedia();
    sigRef.current = createSignalingClient(roomId, async (msg) => {
      const payload = msg?.payload ?? msg;
      const pc = await ensurePC();

      if (payload?.kind === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sigRef.current?.sendSignal({ kind: "answer", sdp: pc.localDescription });
      } else if (payload?.kind === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload?.kind === "ice" && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          // ignore
        }
      }
    });

    setJoined(true);
    setStatus("joined");
  }

  async function call() {
    setStatus("calling...");
    const pc = await ensurePC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sigRef.current?.sendSignal({ kind: "offer", sdp: pc.localDescription });
    setStatus("offer-sent");
  }

  function hangup() {
    setStatus("hangup");
    try { sigRef.current?.close(); } catch {}
    sigRef.current = null;

    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    const ls = localStreamRef.current;
    if (ls) ls.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;

    setJoined(false);
    setStatus("idle");
  }

  useEffect(() => {
    return () => hangup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Live classes (WebRTC MVP)</h2>
      <p style={{ opacity: 0.8 }}>
        Signaling: VITE_SIGNALING_URL (Socket.IO) â€¢ Events: <code>join</code> / <code>signal</code>
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", minWidth: 220 }}
        />
        <button onClick={join} disabled={joined} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
          Join
        </button>
        <button onClick={call} disabled={!joined} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
          Call (offer)
        </button>
        <button onClick={hangup} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
          Hangup
        </button>
        <span style={{ opacity: 0.75 }}>Status: {status}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Local</div>
          <video ref={localVideo} autoPlay playsInline muted style={{ width: "100%", borderRadius: 10, background: "#111827" }} />
        </div>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Remote</div>
          <video ref={remoteVideo} autoPlay playsInline style={{ width: "100%", borderRadius: 10, background: "#111827" }} />
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        Astuce: ouvre 2 onglets (ou 2 navigateurs), mÃªme roomId. Dans un onglet: Join â†’ Call. Dans l'autre: Join (rÃ©pond automatiquement).
      </div>
    </div>
  );
}