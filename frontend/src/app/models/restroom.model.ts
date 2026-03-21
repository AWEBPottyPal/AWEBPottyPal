export interface Restroom {
  _id: string;
  name: string;
  description?: string;
  location?: { latitude: number; longitude: number };
  amenities?: string[];
  createdBy?: { _id: string; username: string; email: string } | string;
  createdAt?: string;
  isFlagged?: boolean;
}
