import cors from "cors";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { config } from "./config";
import { keysRoutes } from "./routes/keys";
import { google } from "googleapis";
import {
  ApiKeyRecord,
  Article,
  MediaItem,
  MongoDBService,
  Review,
} from "@marketingthatworks/shared-lib";
import { MongoServerError } from "mongodb";
import GoogleAuthService from "./services/GoogleClient";
import { widgetRoutes } from "./routes/widget";
import { businessRoutes } from "./routes/business";

const startServer = async () => {
  const mongoUri = config.MONGO_URI;
  const port = config.PORT ? config.PORT : 3000;
  await MongoDBService.getInstance().connect(mongoUri);

  const db = MongoDBService.getInstance().getDB();

  const articlesCol = db.collection<Article>("articles");
  const reviewsCol = db.collection<Review>("reviews");
  const mediaCol = db.collection<MediaItem>("media_items");
  const apiKeysCol = db.collection<ApiKeyRecord>("api_keys");

  const reviewIndex = await reviewsCol.createIndex("name", { unique: true });
  const mediaIndex = await mediaCol.createIndex("name", { unique: true });

  try {
    const createReviewSearchIndexCommand = await db.command({
      createSearchIndexes: "reviews", // collection name
      indexes: [
        {
          name: "embeddingIndex",
          definition: {
            mappings: {
              dynamic: false,
              fields: {
                embedding: {
                  type: "knnVector",
                  dimensions: 512,
                  similarity: "cosine",
                },
              },
            },
          },
        },
      ],
    });

    console.log(
      "Create search index results: ",
      createReviewSearchIndexCommand
    );
  } catch (error: any) {
    if (error instanceof MongoServerError) {
      console.log("Index already created");
    }
    console.log("ERROR OCCURED: ");
  }

  try {
    const createMediaSearchIndexCommand = await db.command({
      createSearchIndexes: "media_items", // collection name
      indexes: [
        {
          name: "embeddingIndex",
          definition: {
            mappings: {
              dynamic: false,
              fields: {
                embedding: {
                  type: "knnVector",
                  dimensions: 512,
                  similarity: "cosine",
                },
              },
            },
          },
        },
      ],
    });
    console.log("Create search index results: ", createMediaSearchIndexCommand);
  } catch (error: any) {
    if (error instanceof MongoServerError) {
      console.log("Index already created");
    }
    console.log("ERROR OCCURED: ");
  }

  const googleAuthClient = await GoogleAuthService.getClient();

  // Set Google global options for the client
  google.options({ auth: googleAuthClient });

  const app = express();
  app.use(cors())
  app.use(bodyParser.json());


  // Routes

  app.use("/keys", keysRoutes());
  app.use("/widget", widgetRoutes({ reviewsCol, articlesCol, mediaCol }));
  app.use("/business", businessRoutes({reviewsCol, mediaCol}))

  
  app.use("/",  (req: Request, res: Response) => {
    console.log("[server] Successfully hit root endpoint")
    res.status(200).json({message: "sucess"})
    return
  })

  app.listen(3000, '0.0.0.0', () => {
    console.log(`[main-service] Listening on port ${port}...`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start main-service:", err);
  process.exit(1);
});
