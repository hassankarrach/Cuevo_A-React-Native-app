import data from './mockAccounts.json';

export const mockAccounts = data.accounts;
export const mockRoomMemberships = data.rooms;
export type MockRoomId = keyof typeof mockRoomMemberships;
export const getMockAccount = (id: string) => mockAccounts.find(account => account.id === id);
export const getMockRoom = (id: string) => mockRoomMemberships[id as MockRoomId];
