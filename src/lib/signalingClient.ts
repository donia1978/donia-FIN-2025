import { io, Socket } from "socket.io-client";

type SignalHandler = (payload: any) => void;

export function createSignalingClient(roomId: string, onSignal: SignalHandler) {
  const url = (import.meta.env.VITE_SIGNALING_URL as string) || "http://localhost:5179";
  const socket: Socket = io(url, { transports: ["websocket"] });

  socket.on("connect", () => {
    socket.emit("join", { roomId });
  });

  socket.on("signal", (payload) => onSignal(payload));

  return {
    socket,
    sendSignal(payload: any) {
      socket.emit("signal", { roomId, payload });
    },
    close() {
      socket.disconnect();
    },
  };
}