export interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  token?: string;
  savedRestrooms?: string[];
  flaggedRestrooms?: string[];
  reviewedRestrooms?: string[];
  addedRestrooms?: string[];
  createdAt?: string;
}
