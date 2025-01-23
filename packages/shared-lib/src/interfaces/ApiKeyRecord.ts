export interface ApiKeyRecord {
  _id?: any;
  gmb_location_id: string;
  key: string; // hashed key
  status: "ACTIVE" | "REVOKED";
}
