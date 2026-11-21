import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { initialPlayback, updatePlayback, type Playback, type QueueAction } from './roomQueue';
import { mockRoomMemberships } from '../data/mockAccounts';

export type RoomRole = 'host' | 'participant' | 'visitor';
export type RoomVisibility = 'public' | 'private';
export type RoomOptions = { visibility: RoomVisibility; genre: string };
type Membership = { hostId: string; role: RoomRole; participantIds: string[]; name?: string; visibility?: RoomVisibility; genre?: string; playback: Playback };
type Rooms = Record<string, Membership>;
const seedIndexes: Record<string, number> = { 'kitchen-disco': 0, 'late-nights': 4, 'on-repeat': 3, 'after-hours': 4 };
const initialRooms: Rooms = Object.fromEntries(Object.entries(mockRoomMemberships).map(([id, room]) => [id, { ...room, visibility: 'visibility' in room && room.visibility === 'private' ? 'private' as const : 'public' as const, role: room.role as RoomRole, playback: initialPlayback(seedIndexes[id]) }]));
const MockRoomsContext = createContext<{ rooms: Rooms; updateQueue: (id: string, action: QueueAction) => void; createRoom: (name: string, options: RoomOptions) => string; setJoined: (id: string, joined: boolean) => void } | null>(null);

export function MockRoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState(initialRooms);
  useEffect(() => {
    const timer = setInterval(() => setRooms(current => {
      let changed = false;
      const next = Object.fromEntries(Object.entries(current).map(([id, room]) => {
        const playback = updatePlayback(room.playback, { type: 'tick' }, 'participant');
        if (playback === room.playback) return [id, room];
        changed = true;
        return [id, { ...room, playback }];
      }));
      return changed ? next : current;
    }), 1000);
    return () => clearInterval(timer);
  }, []);
  function updateQueue(id: string, action: QueueAction) {
    setRooms(current => {
      const room = current[id];
      if (!room) return current;
      const playback = updatePlayback(room.playback, action, room.role);
      return playback === room.playback ? current : { ...current, [id]: { ...room, playback } };
    });
  }
  function createRoom(name: string, options: RoomOptions) {
    const id = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setRooms(current => ({ ...current, [id]: { ...options, name: name.trim(), hostId: 'self', role: 'host', participantIds: ['self'], playback: initialPlayback() } }));
    return id;
  }
  function setJoined(id: string, joined: boolean) {
    setRooms(current => {
      const room = current[id];
      if (!room || room.playback.ended || room.role === 'host') return current;
      const others = room.participantIds.filter(accountId => accountId !== 'self');
      return { ...current, [id]: { ...room, role: joined ? 'participant' : 'visitor', participantIds: joined ? ['self', ...others] : others } };
    });
  }
  return <MockRoomsContext.Provider value={{ rooms, updateQueue, createRoom, setJoined }}>{children}</MockRoomsContext.Provider>;
}

export function useMockRooms() {
  const value = useContext(MockRoomsContext);
  if (!value) throw new Error('MockRoomsProvider is required');
  return value;
}
