const WebSocket = require("ws");

const PORT = process.env.PORT || 9010;
const wss = new WebSocket.Server({ port: PORT });

const rooms = new Map(); // roomId -> Set(ws)
const meta = new Map();  // ws -> { roomId, user }

function broadcast(roomId, payload) {
  const set = rooms.get(roomId);
  if (!set) return;
  const msg = JSON.stringify(payload);
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

function roomCount(roomId) {
  const set = rooms.get(roomId);
  return set ? set.size : 0;
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch (_) { return; }

    if (data.type === "join") {
      const { roomId, user } = data;
      if (!roomId || !user) return;

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(ws);
      meta.set(ws, { roomId, user });

      broadcast(roomId, { type: "system", event: "join", user, roomId, online: roomCount(roomId), ts: Date.now() });
      return;
    }

    if (data.type === "leave") {
      const m = meta.get(ws);
      if (!m) return;

      const { roomId, user } = m;
      const set = rooms.get(roomId);
      if (set) set.delete(ws);
      meta.delete(ws);

      broadcast(roomId, { type: "system", event: "leave", user, roomId, online: roomCount(roomId), ts: Date.now() });
      return;
    }

    if (data.type === "chat") {
      const m = meta.get(ws);
      if (!m) return;

      broadcast(m.roomId, { type: "chat", roomId: m.roomId, user: m.user, message: data.message || "", ts: Date.now() });
      return;
    }
  });

  ws.on("close", () => {
    const m = meta.get(ws);
    if (!m) return;

    const { roomId, user } = m;
    const set = rooms.get(roomId);
    if (set) set.delete(ws);
    meta.delete(ws);

    broadcast(roomId, { type: "system", event: "disconnect", user, roomId, online: roomCount(roomId), ts: Date.now() });
  });
});

console.log(`Demo WS server running on ws://localhost:${PORT}`);
