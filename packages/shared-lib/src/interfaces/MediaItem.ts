import { ObjectId } from "mongodb";

export interface MediaItem {
  _id: ObjectId;
  name: string;
  attribution: {
    profileName: string;
    profilePhotoUrl: string;
    takedownUrl: string;
    profileUrl: string;
  };
  mediaFormat: string;
  googleUrl: string;
  thumbnailUrl: string;
  createTime: string;
  dimensions: {
    widthPixels: number;
    heightPixels: number;
  };
  embedding?: any[];
}
