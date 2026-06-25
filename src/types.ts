export interface Collection {
  id: string;
  position: number;
  title: string;
  website_count: number;
  createdAt?: string;
}

export interface SavedWebsite {
  id: string;
  collectionId: string;
  itemPosition: number;
  title: string;
  url: string;
  website: string;
}

export interface StoredWebsite {
  id: string;
  title: string;
  url: string;
  website: string;
  position: number;
}

export interface StoredCollection {
  id: string;
  title: string;
  position: number;
  createdAt?: string;
  websites: StoredWebsite[];
}

export interface CollectionsData {
  version: number;
  source: string;
  collections: StoredCollection[];
}
