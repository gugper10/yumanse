class LiveSDK {
  constructor({ serverUrl }) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.roomId = null;
    this.user = null;
    this.handlers = { message: [], system: [] };
  }

  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  _emit(event, payload) {
    (this.handlers[event] || []).forEach((h) => {
      try { h(payload); } catch (e) { console.error(e); }
    });
  }

  connect() {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.onopen = () => this._emit("system", { type: "connected" });

    this.ws.onmessage = (evt) => {
      let data = evt.data;
      try { data = JSON.parse(evt.data); } catch (_) {}
      this._emit("message", data);
    };

    this.ws.onclose = () => this._emit("system", { type: "disconnected" });
  }

  joinRoom(roomId, user) {
    this.roomId = roomId;
    this.user = user;
    this._send({ type: "join", roomId, user });
  }

  leaveRoom() {
    if (!this.roomId || !this.user) return;
    this._send({ type: "leave", roomId: this.roomId, user: this.user });
    this.roomId = null;
  }

  sendChat(message) {
    if (!this.roomId || !this.user) return;
    this._send({
      type: "chat",
      roomId: this.roomId,
      user: this.user,
      message,
      timestamp: Date.now(),
    });
  }

  _send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }
}

if (typeof module !== "undefined") module.exports = LiveSDK;
