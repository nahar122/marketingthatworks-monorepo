import { Request, Response, Router } from "express";
import { Collection } from "mongodb";
import { ApiKeyRecord } from "@marketingthatworks/shared-lib";
import { MongoDBService } from "@marketingthatworks/shared-lib";
import {
  generateApiKey,
  hashApiKey,
  isGMBLocationAccessEnabled,
} from "../utils/helpers";

export function keysRoutes() {
  const db = MongoDBService.getInstance().getDB();
  const apiKeysCol = db.collection<ApiKeyRecord>("api_keys");

  const router = Router();

  // Issue a new API key for a given location
  router.post("/issue", async (req, res) => {
    const { location_id } = req.body;
    if (!location_id) {
      res.status(400).json({ error: "location_id is required." });
      return;
    }

    // Check if location is valid
    const isLocationAccessEnabled = await isGMBLocationAccessEnabled(
      location_id
    );
    if (!isLocationAccessEnabled) {
      res.status(400).json({
        error: `Location ID '${location_id}' is not a valid location under the account.`,
      });
      return;
    }

    // Generate and hash the key
    const rawKey = generateApiKey();
    const hashedKey = hashApiKey(rawKey);

    // Insert a new doc into MongoDB
    try {
      await apiKeysCol.insertOne({
        gmb_location_id: location_id,
        key: hashedKey,
        status: "ACTIVE",
      });
    } catch (err) {
      console.error("Failed to insert API key record:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    // Return the raw key to the client
    res.status(200).json({ api_key: rawKey });
    return;
  });

  // Revoke an existing API key
  router.post("/test", async (req: Request, res: Response) => {
    res.status(200).json({ test: "message" });
    return;
  });
  router.post("/revoke", async (req, res) => {
    const { api_key, location_id } = req.body;
    if (!api_key) {
      res.status(400).json({ error: "api_key is required." });
      return;
    }

    if (!location_id) {
      res.status(400).json({ error: "location_id is required." });
      return;
    }

    // Hash the key the same way we did on issue
    const hashedKey = hashApiKey(api_key);

    // Update any matching docs
    try {
      const result = await apiKeysCol.updateMany(
        {
          key: hashedKey,
          status: "ACTIVE",
          gmb_location_id: location_id,
        },
        { $set: { status: "REVOKED" } }
      );

      if (result.modifiedCount === 0) {
        res.status(404).json({
          error: "API key not found or already revoked.",
        });
        return;
      }

      res.json({ success: true });
      return;
    } catch (err) {
      console.error("Failed to revoke API key:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  });
  return router;
}
