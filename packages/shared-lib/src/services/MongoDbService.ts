// src/utils/db.ts
import { MongoClient, Db, Collection } from "mongodb";

export class MongoDBService {
  private static instance: MongoDBService;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private dbName: string;

  // Private constructor ensures no direct instantiation from outside
  private constructor(dbName: string) {
    this.dbName = dbName;
  }

  /**
   * Returns the singleton instance of DatabaseService.
   * @param dbName The name of the database (default "mydb")
   */
  public static getInstance(dbName = "mydb"): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService(dbName);
    }
    return MongoDBService.instance;
  }

  /**
   * Connects to MongoDB using the provided URI, if not already connected.
   * @param uri The connection string for MongoDB
   */
  public async connect(uri: string): Promise<void> {
    if (this.client) {
      console.log("[MongoDB] Already connected.");
      return;
    }
    console.log(`[MongoDB] Connecting to: ${uri}`);
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    console.log("[MongoDB] Connected successfully!");
  }

  /**
   * Retrieves the underlying Db instance.
   */
  public getDB(): Db {
    if (!this.db) {
      // console.log("[MongoDB] Connecting to DB now...")
      throw new Error("[MongoDB] Not connected yet. Call connect() first.");
    }
    return this.db;
  }

  /**
   * Retrieves a MongoDB collection for the given name, optionally typed.
   * @param name The name of the collection
   */
  public getCollection<T extends Document>(name: string): Collection<T> {
    return this.getDB().collection<T>(name);
  }
}
