// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { hashApiKey } from "../utils/helpers";
import { ApiKeyRecord, MongoDBService } from "@marketingthatworks/shared-lib";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const uri = process.env.MONGO_URI!!;

  const mongoDBService = MongoDBService.getInstance();
  await mongoDBService.connect(uri);
  const db = mongoDBService.getDB();
  const apiKeysCol = db.collection<ApiKeyRecord>("api_keys");
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "No authorization header provided." });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res
      .status(401)
      .json({ error: "Invalid authorization format. Use 'Bearer <API_KEY>'." });
    return;
  }

  const rawKey = parts[1];
  const hashedKey = hashApiKey(rawKey);

  try {
    // Find a matching doc in 'api_keys' where status is 'ACTIVE'
    const keyRecord = await apiKeysCol.findOne({
      key: hashedKey,
      status: "ACTIVE",
    });

    if (!keyRecord) {
      res.status(401).json({ error: "Invalid or revoked API key." });
      return;
    }

    // Attach the location_id to req
    req.location_id = keyRecord.gmb_location_id;
    // If you use an environment variable for the GMB account ID:
    req.account_id = process.env.GMB_ACCOUNT_ID;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}
