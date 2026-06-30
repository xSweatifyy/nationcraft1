import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Volume2, Plus, Trash2, Pencil, Mic, MicOff, Headphones, HeadphoneOff,
  PhoneOff, LogIn, Lock, Unlock, UserX, Users, ShieldOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Room = {
  id: string; name: string; position: number; created_by: string; created_at: string;
  max_users: number | null; locked: boolean; banned_user_ids: string[];
};
type Participant = {
  id: string; room_id: string; user_id: string; nick: string;
  muted: boolean; deafened: boolean; force_muted: boolean; joined_at: string;
};

type Peer = { pc: RTCPeerConnection; audioEl: HTMLAudioElement };

export function VoiceChat({ me, fullAccess }: { me: any; fullAccess: boolean }) {
  const qc = useQueryClient();
  const myNick = me?.user_metadata?.minecraft_nick || me?.email?.split("@")[0] || "Admin";

  const { data: rooms = [] } = useQuery({
    queryKey: ["voice_rooms"],
    queryFn: async () => {
      const { data } = await supabase.from("voice_rooms").select("*").order("position").order("created_at");
      return (data ?? []) as Room[];
    },
  });
  const { data: participants = [] } = useQuery({
    queryKey: ["voice_participants"],
    queryFn: async () => {
      const { data } = await supabase.from("voice_participants").select("*").order("joined_at");
      return (data ?? []) as Participant[];
    },
  });

  // Realtime: live sync members + their mute/deafen/force_muted state, plus room edits.
  useEffect(() => {
    const ch = supabase
      .channel("voice-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_rooms" }, () =>
        qc.invalidateQueries({ queryKey: ["voice_rooms"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_participants" }, () =>
        qc.invalidateQueries({ queryKey: ["voice_participants"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const signalingRef = useRef<any>(null);

  // React to force_mute from moderators on the current user
  const myParticipant = useMemo(
    () => participants.find((p) => p.user_id === me.id && p.room_id === activeRoom),
    [participants, me.id, activeRoom],
  );
  useEffect(() => {
    if (!myParticipant) return;
    if (myParticipant.force_muted && !muted) {
      // Hard-mute local tracks
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
      setMuted(true);
      toast.message("Byl jsi ztlumen moderátorem.");
    }
  }, [myParticipant?.force_muted]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to being kicked: row deleted => leave
  useEffect(() => {
    if (!activeRoom) return;
    const stillIn = participants.some((p) => p.user_id === me.id && p.room_id === activeRoom);
    if (!stillIn && peersRef.current.size >= 0 && localStreamRef.current) {
      cleanup();
      setActiveRoom(null);
      toast.error("Byl jsi odpojen z místnosti.");
    }
  }, [participants, activeRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = () => {
    peersRef.current.forEach(({ pc, audioEl }) => {
      try { pc.close(); } catch {}
      audioEl.remove();
    });
    peersRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (signalingRef.current) {
      supabase.removeChannel(signalingRef.current);
      signalingRef.current = null;
    }
  };

  const leaveRoom = async () => {
    cleanup();
    if (activeRoom) {
      await supabase.from("voice_participants").delete().eq("user_id", me.id).eq("room_id", activeRoom);
    }
    setActiveRoom(null);
  };

  const createPeer = async (otherId: string, isInitiator: boolean, signaling: any) => {
    if (peersRef.current.has(otherId)) return peersRef.current.get(otherId)!;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
    });
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);
    const peer = { pc, audioEl };
    peersRef.current.set(otherId, peer);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    }
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signaling.send({ type: "broadcast", event: "ice", payload: { from: me.id, to: otherId, candidate: e.candidate } });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        try { audioEl.remove(); } catch {}
        peersRef.current.delete(otherId);
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signaling.send({ type: "broadcast", event: "sdp", payload: { from: me.id, to: otherId, sdp: offer } });
    }
    return peer;
  };

  const joinRoom = async (room: Room) => {
    if (activeRoom === room.id) return;
    if (!fullAccess) {
      if (room.locked) { toast.error("Místnost je uzamčená."); return; }
      if (room.banned_user_ids?.includes(me.id)) { toast.error("Máš zákaz vstupu do této místnosti."); return; }
      if (room.max_users && participants.filter((p) => p.room_id === room.id).length >= room.max_users) {
        toast.error(`Místnost je plná (limit ${room.max_users}).`); return;
      }
    }
    if (activeRoom) await leaveRoom();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
    } catch (e: any) {
      toast.error("Nelze získat mikrofon: " + (e?.message ?? e));
      return;
    }
    const { error } = await supabase.from("voice_participants").upsert(
      { room_id: room.id, user_id: me.id, nick: myNick, muted: false, deafened: false, force_muted: false },
      { onConflict: "room_id,user_id" },
    );
    if (error) { toast.error(error.message); cleanup(); return; }
    setActiveRoom(room.id);
    setMuted(false);
    setDeafened(false);

    const channel = supabase.channel(`voice-room-${room.id}`, { config: { broadcast: { self: false } } });
    signalingRef.current = channel;

    channel
      .on("broadcast", { event: "hello" }, async ({ payload }) => {
        if (payload.from === me.id) return;
        await createPeer(payload.from, true, channel);
      })
      .on("broadcast", { event: "sdp" }, async ({ payload }) => {
        if (payload.to !== me.id) return;
        const peer = await createPeer(payload.from, false, channel);
        const desc = new RTCSessionDescription(payload.sdp);
        if (desc.type === "offer") {
          await peer.pc.setRemoteDescription(desc);
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          channel.send({ type: "broadcast", event: "sdp", payload: { from: me.id, to: payload.from, sdp: answer } });
        } else {
          await peer.pc.setRemoteDescription(desc);
        }
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.to !== me.id) return;
        const peer = peersRef.current.get(payload.from);
        if (peer) { try { await peer.pc.addIceCandidate(payload.candidate); } catch {} }
      })
      .on("broadcast", { event: "bye" }, ({ payload }) => {
        const peer = peersRef.current.get(payload.from);
        if (peer) {
          try { peer.pc.close(); } catch {}
          peer.audioEl.remove();
          peersRef.current.delete(payload.from);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "hello", payload: { from: me.id } });
        }
      });
  };

  const toggleMute = async () => {
    if (myParticipant?.force_muted && muted) {
      toast.error("Jsi ztlumen moderátorem. Požádej o zrušení.");
      return;
    }
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    if (activeRoom) await supabase.from("voice_participants").update({ muted: next }).eq("user_id", me.id).eq("room_id", activeRoom);
  };
  const toggleDeafen = async () => {
    const next = !deafened;
    setDeafened(next);
    peersRef.current.forEach(({ audioEl }) => { audioEl.muted = next; });
    if (activeRoom) await supabase.from("voice_participants").update({ deafened: next }).eq("user_id", me.id).eq("room_id", activeRoom);
  };

  useEffect(() => () => {
    if (activeRoom) {
      supabase.from("voice_participants").delete().eq("user_id", me.id).eq("room_id", activeRoom).then(() => {});
    }
    cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnload = () => {
      if (activeRoom) {
        supabase.from("voice_participants").delete().eq("user_id", me.id).eq("room_id", activeRoom).then(() => {});
        signalingRef.current?.send?.({ type: "broadcast", event: "bye", payload: { from: me.id } });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [activeRoom, me.id]);

  // ---- Room CRUD + moderation (full access) ----
  const [newName, setNewName] = useState("");
  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { error } = await supabase.from("voice_rooms").insert({
      name: newName.trim(), position: rooms.length, created_by: me.id,
    });
    if (error) { toast.error(error.message); return; }
    setNewName("");
  };
  const renameRoom = async (id: string, current: string) => {
    const n = prompt("Nový název místnosti:", current);
    if (!n || !n.trim() || n === current) return;
    const { error } = await supabase.from("voice_rooms").update({ name: n.trim() }).eq("id", id);
    if (error) toast.error(error.message);
  };
  const setRoomLimit = async (id: string, current: number | null) => {
    const v = prompt("Maximální počet uživatelů (prázdné = bez limitu):", current?.toString() ?? "");
    if (v === null) return;
    const num = v.trim() === "" ? null : Math.max(1, parseInt(v, 10));
    if (v.trim() !== "" && (Number.isNaN(num as number))) { toast.error("Neplatné číslo."); return; }
    const { error } = await supabase.from("voice_rooms").update({ max_users: num }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(num ? `Limit nastaven na ${num}.` : "Limit zrušen.");
  };
  const toggleLock = async (r: Room) => {
    const { error } = await supabase.from("voice_rooms").update({ locked: !r.locked }).eq("id", r.id);
    if (error) toast.error(error.message);
  };
  const deleteRoom = async (id: string, name: string) => {
    if (!confirm(`Smazat místnost "${name}"?`)) return;
    if (activeRoom === id) await leaveRoom();
    const { error } = await supabase.from("voice_rooms").delete().eq("id", id);
    if (error) toast.error(error.message);
  };
  const kickUser = async (room: Room, p: Participant, ban: boolean) => {
    if (!confirm(`${ban ? "Vykopnout & zablokovat" : "Vykopnout"} ${p.nick}?`)) return;
    if (ban) {
      const next = Array.from(new Set([...(room.banned_user_ids ?? []), p.user_id]));
      await supabase.from("voice_rooms").update({ banned_user_ids: next }).eq("id", room.id);
    }
    const { error } = await supabase.from("voice_participants").delete().eq("id", p.id);
    if (error) toast.error(error.message); else toast.success(`${p.nick} odpojen.`);
  };
  const unbanUser = async (room: Room, userId: string) => {
    const next = (room.banned_user_ids ?? []).filter((x) => x !== userId);
    await supabase.from("voice_rooms").update({ banned_user_ids: next }).eq("id", room.id);
    toast.success("Zákaz vstupu zrušen.");
  };
  const forceMute = async (p: Participant) => {
    const next = !p.force_muted;
    const patch: any = { force_muted: next };
    if (next) patch.muted = true;
    const { error } = await supabase.from("voice_participants").update(patch).eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success(next ? `${p.nick} ztlumen.` : `Ztlumení ${p.nick} zrušeno.`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        {fullAccess && (
          <form onSubmit={createRoom} className="mc-card rounded-xl p-3 flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Nová voice místnost…"
              className="flex-1 min-w-0 px-3 py-2 rounded-md bg-input border border-border text-sm" />
            <button className="mc-btn rounded-md text-xs"><Plus className="h-4 w-4 inline mr-1" />Vytvořit</button>
          </form>
        )}

        <div className="space-y-2">
          {rooms.length === 0 && (
            <div className="mc-card rounded-xl p-8 text-center text-sm text-muted-foreground">
              Žádné voice místnosti. {fullAccess && "Vytvoř první výše."}
            </div>
          )}
          {rooms.map((r) => {
            const members = participants.filter((p) => p.room_id === r.id);
            const isActive = activeRoom === r.id;
            const full = !!r.max_users && members.length >= r.max_users;
            return (
              <div key={r.id}
                className={`mc-card rounded-xl overflow-hidden border ${
                  isActive ? "border-primary/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]" : "border-border/60"
                }`}>
                <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                  <Volume2 className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"} shrink-0`} />
                  <span className="font-display text-sm text-foreground truncate flex-1 min-w-0">{r.name}</span>
                  {r.locked && <Lock className="h-3.5 w-3.5 text-amber-400" aria-label="Uzamčeno" />}
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {members.length}{r.max_users ? `/${r.max_users}` : ""}
                  </span>
                  {fullAccess && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => renameRoom(r.id, r.name)} className="p-1.5 text-muted-foreground hover:text-foreground rounded" title="Přejmenovat">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setRoomLimit(r.id, r.max_users)} className="p-1.5 text-muted-foreground hover:text-foreground rounded" title="Limit uživatelů">
                        <Users className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleLock(r)} className="p-1.5 text-muted-foreground hover:text-foreground rounded" title={r.locked ? "Odemknout" : "Uzamknout"}>
                        {r.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => deleteRoom(r.id, r.name)} className="p-1.5 text-muted-foreground hover:text-destructive rounded" title="Smazat">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {isActive ? (
                    <button onClick={leaveRoom} className="ml-1 px-2.5 py-1.5 rounded-md bg-destructive/15 border border-destructive/40 text-destructive text-xs inline-flex items-center gap-1">
                      <PhoneOff className="h-3 w-3" /> Odpojit
                    </button>
                  ) : (
                    <button
                      onClick={() => joinRoom(r)}
                      disabled={!fullAccess && (r.locked || full || r.banned_user_ids?.includes(me.id))}
                      className="ml-1 px-2.5 py-1.5 rounded-md bg-primary/15 border border-primary/40 text-primary text-xs inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <LogIn className="h-3 w-3" /> Připojit
                    </button>
                  )}
                </div>
                {members.length > 0 && (
                  <div className="px-4 pb-3 pt-1 flex flex-wrap gap-2 border-t border-border/40">
                    {members.map((m) => {
                      const isMe = m.user_id === me.id;
                      return (
                        <div key={m.id} className="inline-flex items-center gap-2 bg-card/80 rounded-full pl-1 pr-2 py-1 border border-border/60">
                          <img
                            src={`https://mc-heads.net/head/${encodeURIComponent(m.nick)}/64`}
                            alt={m.nick}
                            className="h-6 w-6 rounded-md"
                            style={{ imageRendering: "pixelated" }}
                            loading="lazy"
                          />
                          <span className="text-xs font-medium text-foreground">{m.nick}</span>
                          {(m.muted || m.force_muted) && <MicOff className={`h-3 w-3 ${m.force_muted ? "text-amber-400" : "text-rose-400"}`} />}
                          {m.deafened && <HeadphoneOff className="h-3 w-3 text-rose-400" />}
                          {fullAccess && !isMe && (
                            <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-border/60">
                              <button onClick={() => forceMute(m)} title={m.force_muted ? "Zrušit force-mute" : "Force mute"} className="p-1 text-muted-foreground hover:text-amber-400">
                                {m.force_muted ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                              </button>
                              <button onClick={() => kickUser(r, m, false)} title="Vykopnout" className="p-1 text-muted-foreground hover:text-destructive">
                                <UserX className="h-3 w-3" />
                              </button>
                              <button onClick={() => kickUser(r, m, true)} title="Vykopnout + zákaz vstupu" className="p-1 text-muted-foreground hover:text-destructive">
                                <ShieldOff className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {fullAccess && (r.banned_user_ids?.length ?? 0) > 0 && (
                  <div className="px-4 pb-3 pt-0 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Zákaz vstupu:</span>
                    {r.banned_user_ids.map((uid) => (
                      <button key={uid} onClick={() => unbanUser(r, uid)}
                        className="px-2 py-0.5 rounded-full border border-border/60 hover:border-primary/40 text-foreground font-mono">
                        {uid.slice(0, 8)}… ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mc-card rounded-xl p-4 lg:sticky lg:top-4 h-fit">
        <h4 className="font-display text-sm text-foreground mb-3">Ovládání hlasu</h4>
        {activeRoom ? (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Připojen v: <span className="text-foreground font-medium">{rooms.find((r) => r.id === activeRoom)?.name}</span>
            </div>
            {myParticipant?.force_muted && (
              <div className="text-[10px] px-2 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300">
                Jsi ztlumen moderátorem.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={toggleMute}
                className={`flex-1 px-3 py-2.5 rounded-md border text-xs inline-flex items-center justify-center gap-1.5 transition ${
                  muted ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-card border-border hover:border-primary/40"
                }`}>
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {muted ? "Unmute" : "Mute"}
              </button>
              <button onClick={toggleDeafen}
                className={`flex-1 px-3 py-2.5 rounded-md border text-xs inline-flex items-center justify-center gap-1.5 transition ${
                  deafened ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-card border-border hover:border-primary/40"
                }`}>
                {deafened ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                {deafened ? "Undeafen" : "Deafen"}
              </button>
            </div>
            <button onClick={leaveRoom}
              className="w-full px-3 py-2.5 rounded-md bg-destructive/15 border border-destructive/40 text-destructive text-xs inline-flex items-center justify-center gap-1.5">
              <PhoneOff className="h-4 w-4" /> Odpojit
            </button>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Voice používá WebRTC mesh. Nejlépe pro 2–8 lidí v jedné místnosti.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Vyber místnost a klikni <strong>Připojit</strong>. Prohlížeč si vyžádá přístup k mikrofonu.</p>
        )}
      </div>
    </div>
  );
}
