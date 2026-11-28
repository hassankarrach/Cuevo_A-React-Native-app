export type NotificationKind = 'friend-request' | 'friend-accepted' | 'room-invite' | 'playlist-invite' | 'playlist-update' | 'room-activity';
export type NotificationDestination =
  | { type: 'profile'; id: string }
  | { type: 'room'; id: string }
  | { type: 'playlist'; id: string };
export type MockNotification = {
  id: string; actorId: string; kind: NotificationKind; title: string; message: string; minutesAgo: number;
  read: boolean; destination: NotificationDestination; response?: 'accepted' | 'declined';
};

export const mockNotifications: MockNotification[] = [
  { id: 'friend-sara', actorId: 'sara', kind: 'friend-request', title: 'Sara wants to connect', message: 'Sara wants to connect with you.', minutesAgo: 2, read: false, destination: { type: 'profile', id: 'sara' } },
  { id: 'invite-on-repeat', actorId: 'amine', kind: 'room-invite', title: 'Amine invited you to On Repeat', message: 'Amine invited you to On Repeat.', minutesAgo: 8, read: false, destination: { type: 'room', id: 'on-repeat' } },
  { id: 'invite-weekend', actorId: 'sara', kind: 'playlist-invite', title: 'Sara invited you to Weekend Together', message: 'Sara invited you to build Weekend Together.', minutesAgo: 15, read: false, destination: { type: 'playlist', id: 'weekend-together' } },
  { id: 'playlist-added', actorId: 'adam', kind: 'playlist-update', title: 'New song in Late Night Drives', message: 'Adam added a song to Late Night Drives.', minutesAgo: 32, read: false, destination: { type: 'playlist', id: 'late-night-drives' } },
  { id: 'room-joined', actorId: 'lina', kind: 'room-activity', title: 'Lina joined Kitchen Disco', message: 'Lina joined Kitchen Disco.', minutesAgo: 46, read: false, destination: { type: 'room', id: 'kitchen-disco' } },
  { id: 'friend-adam', actorId: 'adam', kind: 'friend-accepted', title: 'Adam accepted your request', message: 'Adam accepted your friend request.', minutesAgo: 120, read: true, destination: { type: 'profile', id: 'adam' } },
];
