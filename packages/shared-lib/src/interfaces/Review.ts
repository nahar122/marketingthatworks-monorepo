import { ObjectId } from "mongodb";

export interface Review {
  _id: ObjectId;
  reviewId: string;
  reviewer: {
    profilePhotoUrl: string;
    displayName: string;
  };
  starRating: string;
  createTime: string;
  updateTime: string;
  name: string;
  comment: string;
  embedding?: any[];
}
