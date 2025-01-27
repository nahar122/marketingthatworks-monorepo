import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { ObjectId } from "mongodb";

// Import environment config
import { config } from "./config";

// Import the DB service
import { MongoDBService } from "@marketingthatworks/shared-lib";

// Import your queue manager
import { QueueWorkerManager } from "@marketingthatworks/shared-lib";

// Import interfaces
import { MediaItem, Review, Article } from "@marketingthatworks/shared-lib";

// Embedding + scraping utils
import { getTextEmbeddings, getImageEmbeddings } from "./utils/embeddings";
import { scrapePage } from "./utils/scraper";

// Example: if you're using huggingface/transformers.js with @xenova/transformers
// you could import and load your model(s) here:
import {
  // CLIPModel, CLIPVisionModelWithProjection, etc...
  CLIPVisionModelWithProjection,
  CLIPTextModelWithProjection,
  Processor,
  AutoTokenizer,
  PreTrainedTokenizer,
} from "@huggingface/transformers";

// -----------------------------------------------------
//  Initialize Express
// -----------------------------------------------------
const app = express();
app.use(bodyParser.json());

// -----------------------------------------------------
//  Connect to MongoDB
// -----------------------------------------------------
const mongoService = MongoDBService.getInstance();

mongoService
  .connect(config.MONGO_URI)
  .then(() => {
    console.log("[server] MongoDB connected.");
  })
  .catch((err) => {
    console.error("[server] MongoDB connection error:", err);
    process.exit(1);
  });

// -----------------------------------------------------
//  Load / Initialize Models Once (Optional)
// -----------------------------------------------------
let textModelLoaded: CLIPTextModelWithProjection | null = null;
let textTokenizerLoaded: PreTrainedTokenizer | null = null;
let imageModelLoaded: CLIPVisionModelWithProjection | null = null;
let imageProcessorLoaded: Processor | null = null;

async function loadModels() {
  if (!textModelLoaded || !textTokenizerLoaded) {
    console.log("[server] Loading text model + tokenizer...");
    textTokenizerLoaded = await AutoTokenizer.from_pretrained(
      "Xenova/clip-vit-base-patch32"
    );
    textModelLoaded = await CLIPTextModelWithProjection.from_pretrained(
      "Xenova/clip-vit-base-patch32"
    );
    console.log("[server] Text models loaded.");
  }

  if (!imageModelLoaded || !imageProcessorLoaded) {
    console.log("[server] Loading image model + processor ...");
    imageModelLoaded = await CLIPVisionModelWithProjection.from_pretrained(
      "Xenova/clip-vit-base-patch32"
    );
    imageProcessorLoaded = await Processor.from_pretrained(
      "Xenova/clip-vit-base-patch32",
      {}
    );
    console.log("[server] Image models loaded");
  }
}

// -----------------------------------------------------
//  Initialize Queue Manager & Article Queue + Worker
// -----------------------------------------------------
const ARTICLE_QUEUE_NAME = "articleQueue";
try{

  const qm = QueueWorkerManager.getInstance(config.REDIS_HOST, config.REDIS_PORT);



  // 1) Create the queue if not already existing

  qm.createQueue(ARTICLE_QUEUE_NAME);

  
  // 2) Create the worker (for articles)

  qm.createWorker(ARTICLE_QUEUE_NAME, async (job) => {
    // This function runs inside the worker whenever a new article job is processed
    const { jobId } = job.data;
    console.log(`[ArticleWorker] Received job for URL: ${jobId}`);
  
    // 2a) Check if we already have an article in DB
    const db = mongoService.getDB();
    const articlesColl = db.collection<Article>("articles");
    const existing = await articlesColl.findOne({ url: jobId });
  
    if (existing?.embedding?.length) {
      console.log(
        `[ArticleWorker] URL ${jobId} already has embeddings. Skipping...`
      );
      return;
    }
  
    // 2b) Scrape the article
    const scrapeResult = await scrapePage(jobId);
    const rawText = scrapeResult.textContent || "";
  
    // 2c) Generate embeddings
    if (!textModelLoaded || !textTokenizerLoaded) {
      await loadModels();
    }
    const textEmb = await getTextEmbeddings(
      rawText,
      textModelLoaded!!,
      textTokenizerLoaded!!
    );
    console.log(`[ArticleWorker] Embeddings generated for: ${jobId}`);
  
    // 2d) Store in Mongo
    await articlesColl.updateOne(
      { url: jobId },
      {
        $set: {
          url: jobId,
          content: rawText,
          embedding: textEmb,
        },
      },
      { upsert: true }
    );
  
    console.log(`[ArticleWorker] Article updated in DB: ${jobId}`);
  });
} catch (err: any) {
  console.log(`[server] Note: ${err.message}`);
}


// -----------------------------------------------------
//  Routes
// -----------------------------------------------------

/**
 * POST /embed/media
 * Accepts either a single media item or an array of media items in the request body.
 * We'll embed the "googleUrl" or "thumbnailUrl" to represent the image.
 */
app.post("/embed/media", async (req: Request, res: Response) => {
  // Body can be { items: MediaItem[] } or a single MediaItem
  const { mediaItems } = req.body;
  const db = mongoService.getDB();
  const mediaColl = db.collection<MediaItem>("mediaitems");

  if (!mediaItems){
    res.status(400).json({message: "Missing 'mediaItems' array from request body."})
    return
  }

  let mediaArray: MediaItem[] = [];
  if (!Array.isArray(mediaItems)) {
    res.status(400).json({message: "The 'mediaItems' body argument must be an array."})
    return
  } 

  try {
    if (!imageModelLoaded || !imageProcessorLoaded) {
      await loadModels();
    }

    for await (const media of mediaArray) {
      const existingMedia = await mediaColl.findOne({
        _id: new ObjectId(media._id),
      });

      // If it already has an embedding, skip (optional)
      if (existingMedia?.embedding?.length) {
        console.log(`[Media] Already embedded: ${existingMedia._id}`);
        continue;
      }

      // For example, embed using googleUrl or thumbnailUrl
      const imageUrl = media.googleUrl;
      if(!imageUrl){
        console.log(`[embed/media] Media item does not have a valid googleUrl ${media}`)
        continue
      }
      // In real usage, you might do:
      // const imageEmb = await getImageEmbeddings(imageUrl, imageModelLoaded, imageProcessorLoaded);
      // Mock the imageEmb for now
      const imageEmb = await getImageEmbeddings(imageUrl, imageModelLoaded!!, imageProcessorLoaded!!)

      await mediaColl.updateOne(
        { _id: new ObjectId(media._id) },
        {
          $set: {
            ...media,
            embedding: imageEmb,
          },
        },
        { upsert: true }
      );
    }

    res.status(200).json({ message: "Media embedding(s) complete." });
    return;
  } catch (err) {
    console.error("[/embed/media] Error:", err);
    res.status(500).json({ error: "Failed to process media embeddings." });

    return;
  }
});

/**
 * POST /embed/review
 * Accepts either a single review or an array of reviews in the request body.
 */
app.post("/embed/reviews", async (req: Request, res: Response) => {
  // Body can be { reviews: Review[] } or a single Review

  console.log(`[/embed/reviews] Endpoint hit!`)
  const { reviews } = req.body;
  const db = mongoService.getDB();
  const reviewColl = db.collection<Review>("reviews");

  let reviewArray: Review[] = [];
  if(!reviews){
    res.status(400).json({message: "Missing 'reviews' array from request body."})
    return
  }

  if (!Array.isArray(reviews)) {
    res.status(400).json({message: "The 'reviews' body argument must be an array."})
    return
  }

  try {
    if (!textModelLoaded || !textTokenizerLoaded) {
      await loadModels();
    }

    for await (const rv of reviewArray) {
      const existingReview = await reviewColl.findOne({
        _id: new ObjectId(rv._id),
      });
      if (existingReview?.embedding?.length) {
        console.log(`[Review] Already embedded: ${existingReview._id}`);
        continue;
      }

      // Suppose we embed the "comment" text
      if (!rv.comment) {
        console.log(`[Review] Contains no comment. Skipping.`);
        continue;
      }
      const textEmb = await getTextEmbeddings(
        rv.comment || "",
        textModelLoaded!!,
        textTokenizerLoaded!!
      );

      await reviewColl.updateOne(
        { _id: new ObjectId(rv._id) },
        {
          $set: {
            ...rv,
            embedding: textEmb,
          },
        },
        { upsert: true }
      );
    }

    res.status(200).json({ message: "Review embedding(s) complete." });
    return;
  } catch (err) {
    console.error("[/embed/review] Error:", err);
    res.status(500).json({ error: "Failed to process review embeddings." });
    return;
  }
});

/**
 * POST /embed/article
 * For an article, we introduce the queue/worker logic.
 * The request body might contain a single field: { articleURL: "https://..." }
 */
app.post("/embed/article", async (req: Request, res: Response) => {
  const { url: articleURL } = req.body;
  if (!articleURL) {
    res.status(400).json({ error: "Missing articleURL in request body." });

    return;
  }

  try {
    // Check if article is already embedded in DB
    const db = mongoService.getDB();
    const articlesColl = db.collection<Article>("articles");
    const existing = await articlesColl.findOne({ url: articleURL });
    if (existing?.embedding?.length) {
      // Already embedded
      console.log(`[Article] Embeddings exist for URL: ${articleURL}`);
      res.status(200).json({ message: "Already embedded." });
      return;
    }

    // Optionally, check if there's a queued job for this URL to avoid duplicates
    // If you're using jobId dedup, you can do:
    // or just rely on your DB "in-progress" status approach.

    // For simplicity, let's just queue it:
    const qm = QueueWorkerManager.getInstance(config.REDIS_HOST, config.REDIS_PORT);

    const isJobInQueue = await qm.isJobInQueue(ARTICLE_QUEUE_NAME, articleURL);
    if (isJobInQueue) {
      console.log(
        `[Article] Job with ID: ${articleURL}, for URL: ${articleURL} already exists. Ignoring request.`
      );
      res.status(200).json({ message: "Job already in queue", articleURL });
      return
    }
    const jobId = await qm.addJob(ARTICLE_QUEUE_NAME, { jobId: articleURL });
    console.log(
      `[Article] Job queued with ID: ${jobId}, for URL: ${articleURL}`
    );

    res.status(200).json({
      message: "Article embedding job queued.",
      jobId,
      articleURL,
    });
    return;
  } catch (err) {
    console.error("[/embed/article] Error:", err);
    res.status(500).json({ error: "Failed to queue article embedding job." });
    return;
  }
});

// -----------------------------------------------------
//  Start the Express Server
// -----------------------------------------------------
app.listen(config.PORT ? parseInt(config.PORT, 10) : 4000, async () => {
  console.log(
    `[server] Listening on port ${
      config.PORT ? parseInt(config.PORT, 10) : 4000
    }`
  );
  await loadModels(); // Preload models so they're in memory
  console.log(
    `[server] Listening for requests on port ${
      config.PORT ? config.PORT : 4000
    }`
  );
});
