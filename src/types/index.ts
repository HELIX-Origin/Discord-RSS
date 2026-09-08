export interface Entry {
  entry_id: string;
  title: string;
  link: string;
  published: string;
  summary: string;
  author: string;
}

export interface FeedState {
  last_entry_id?: string;
  status?: string;
}
