import { ObjectId } from "mongodb";

export interface Article {
  _id?: ObjectId;
  url: string;
  content: string;
  embedding?: any[];
}
