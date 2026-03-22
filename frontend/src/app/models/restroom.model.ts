export interface Restroom {
  _id: string;
  name: string;
  description?: string;
  location?: { latitude: number; longitude: number; address?: string };
  amenities?: string[];
  images?: string[];
  operatingHours?: {
    is24Hours: boolean;
    openTime?: string;
    closeTime?: string;
  };
  averageRating?: number;
  createdBy?: { _id: string; username: string; email: string } | string;
  createdAt?: string;
  isFlagged?: boolean;
}
