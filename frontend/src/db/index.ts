import Dexie, { type Table } from 'dexie';

export interface LocalProfile {
  id?: number;
  name: string;
  createdAt: Date;
}

export interface LocalCacheItem {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export class VaxAssistLocalDatabase extends Dexie {
  profiles!: Table<LocalProfile, number>;
  cache!: Table<LocalCacheItem, string>;

  constructor() {
    super('VaxAssistLocalDB');

    // Version 1: Initial empty local IndexedDB database schema
    this.version(1).stores({
      profiles: '++id, name, createdAt',
      cache: 'key, updatedAt'
    });
  }
}

export const localDb = new VaxAssistLocalDatabase();
