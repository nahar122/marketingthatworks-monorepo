import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  Review,
  MediaItem,
  Article,
  MongoDBService,
} from "@marketingthatworks/shared-lib";
import { config } from "../config";
import axios from "axios";
import { Collection } from "mongodb";

interface WidgetRoutesDeps {
  reviewsCol: Collection<Review>;
  mediaCol: Collection<MediaItem>;
  articlesCol: Collection<Article>;
}

export function widgetRoutes(deps: WidgetRoutesDeps): Router {
  const { reviewsCol, mediaCol, articlesCol } = deps;
  const router = Router();

  router.get(
    "/reviews",
    authMiddleware,
    async (req: Request, res: Response) => {
      console.log("Endpoint /widget/reviews hit");
      const widgetName = req.query.name as string;
      const url = req.query.url as string;
      var numReviews: number = parseInt(req.query.limit as string);

      if (!url) {
        res.status(400).json({
          error:
            "URL parameter is required. For example: 'https://articleurl.com'",
        });
        return;
      }

      if (!widgetName) {
        res.status(400).json({
          error:
            "Widget name is required. For example: /widget/reviews?name=carousel",
        });
        return;
      }

      if (!numReviews) {
        numReviews = 5;
      }

      if (!req.account_id) {
        res.status(400).json({ error: "Missing account information." });
        return;
      }

      if (!req.location_id) {
        res.status(400).json({ error: "Missing location information." });
        return;
      }

      try {
        const decodedUrl = decodeURIComponent(url);

        var existingArticle = await articlesCol.findOne({ url: decodedUrl });

        var articleVectorSearchEmbeddingArray = existingArticle?.embedding;

        if (!existingArticle) {
          console.log(`${config.EMBEDDING_SERVICE_BASE_URL}/embed/article`);
          const addArticleToQueue = await axios.post(
            `${config.EMBEDDING_SERVICE_BASE_URL}/embed/article`,
            { url: decodedUrl }
          );
          if (addArticleToQueue.status != 200) {
            console.error(
              `[WidgetRoute] Failed to add article to queue. Error: ${addArticleToQueue.data.message}`
            );
            res.status(500).send("");
            return;
          }

          res
            .status(202)
            .send(
              "<div><span>Added article to db. Try again later</span></div>"
            );
          return;
        }

        console.log(
          "ARTICLE VECTOR ARRAY: ",
          articleVectorSearchEmbeddingArray
        );
        console.log(`Searching for top ${numReviews} reviews...`);
        const topReviews = (await reviewsCol
          .aggregate([
            {
              $search: {
                index: "embeddingIndex",
                knnBeta: {
                  vector: articleVectorSearchEmbeddingArray,
                  path: "embedding",
                  k: numReviews,
                },
              },
            },
          ])
          .toArray()) as Review[];

        console.log("Found relevant reviews: ", topReviews);
        res.status(200).send(generateCarouselWidgetHTML(topReviews));
        return;
      } catch (error) {
        console.error(error);
        res.status(400).send(error);
        return;
      }
    }
  );

  router.get("/images", authMiddleware, async (req: Request, res: Response) => {
    console.log("Endpoint /widget/images hit");
    const widgetName = req.query.name as string;
    const url = req.query.url as string;
    var numImages: number = parseInt(req.query.limit as string);

    if (!url) {
      res.status(400).json({
        error:
          "URL parameter is required. For example: 'https://articleurl.com'",
      });
      return;
    }

    if (!widgetName) {
      res.status(400).json({
        error:
          "Widget name is required. For example: /widget/reviews?name=carousel",
      });
      return;
    }

    if (!numImages) {
      numImages = 5;
    }

    if (!req.account_id) {
      res.status(400).json({ error: "Missing account information." });
      return;
    }

    if (!req.location_id) {
      res.status(400).json({ error: "Missing location information." });
      return;
    }

    try {
      const decodedUrl = decodeURIComponent(url);

      var existingArticle = await articlesCol.findOne({ url: decodedUrl });

      var articleVectorSearchEmbeddingArray = existingArticle?.embedding;

      if (!existingArticle) {
        console.log(`${config.EMBEDDING_SERVICE_BASE_URL}/embed/article`);
        const addArticleToQueue = await axios.post(
          `${config.EMBEDDING_SERVICE_BASE_URL}/embed/article`,
          { url: decodedUrl }
        );
        if (addArticleToQueue.status != 200) {
          console.error(
            `[WidgetRoute] Failed to add article to queue. Error: ${addArticleToQueue.data.message}`
          );
          res.status(500).send("");
          return;
        }
        res
          .status(202)
          .send("<div><span>Added article to db. Try again later</span></div>");
        return;
      }

      console.log(`Searching for top ${numImages} most relevant images...`);
      const topMedia = (await mediaCol
        .aggregate([
          {
            $search: {
              index: "embeddingIndex",
              knnBeta: {
                vector: articleVectorSearchEmbeddingArray,
                path: "embedding",
                k: numImages,
              },
            },
          },
        ])
        .toArray()) as MediaItem[];
      console.log("Found relevant images: ", topMedia);
      res.status(200).send(generateCarouselWidgetHTMLForMediaItems(topMedia));
      return;
    } catch (error) {
      console.error(error);
      res.status(400).send(error);
      return;
    }
  });

  return router;
}

function generateCarouselWidgetHTML(reviews: Review[]) {
  // Use the relative URL to your static file
  const imageUrl = "https://marketingthatworks-public.s3.us-east-1.amazonaws.com/review-icon.webp";

  // Chunk reviews into groups of three
  const chunkedReviews = [];
  for (let i = 0; i < reviews.length; i += 3) {
    chunkedReviews.push(reviews.slice(i, i + 3));
  }

  // For each chunk (slide), create the HTML with up to 3 review cards
  const slidesHTML = chunkedReviews
    .map((chunk) => {
      const reviewCards = chunk
        .map((review) => {
          const authorName = review.reviewer?.displayName || "Anonymous";
          const text = review.comment || "No review text available.";
          return `
        <div class="review-card">
          <div class="review-text">${text}</div>
          <div class="review-footer">
            <div class="reviewer-name">${authorName}</div>
            <div class="review-footer-sourced-from">
              <span class="source-from-text">Sourced from</span>
              <img class="review-icon" src="${imageUrl}" alt="icon"/>
            </div>
          </div>
        </div>
      `;
        })
        .join("");

      return `
      <div class="google-review-slide">
        ${reviewCards}
      </div>
    `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  .review-footer-sourced-from {
    font-size: 0.8rem;
    color:#505050;
    display: flex;
    flex-direction: column;
  }
  
  .google-reviews-carousel {
    position: relative;
    overflow: hidden;
    width: 100%;
    max-width: 600px;
    margin: auto;
  }
  
  .google-reviews-track {
    display: flex;
    transition: transform 0.5s ease;
    will-change: transform;
  }
  
  /* Each slide now represents a "page" containing up to 3 reviews side by side */
  .google-review-slide {
    min-width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    gap: 10px;
    padding: 20px;
  }
  
  /* Each individual review card within the slide */
  .review-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 10px;
    flex: 1; /* Distribute space evenly between cards */
    border: 1px solid #ccc;
    padding: 10px;
    box-sizing: border-box;
  }
  
  .review-text {
    font-size: 1rem;
    color: #333;
  }
  
  .review-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 1.25rem;
  }
  
  .reviewer-name {
    font-weight: bold;
  }
  
  .review-icon {
    width: 50px;
    height: 25px;
  }
  
  .google-review-controls {
    text-align: center;
    margin-top: 10px;
  }
  
  .google-review-controls button {
    background: #eee;
    border: none;
    padding: 8px 12px;
    margin: 0 5px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s ease;
  }
  
  .google-review-controls button:hover {
    background: #ccc;
  }
</style>
</head>
<body>
<div class="google-reviews-carousel">
  <div class="google-reviews-track">
    ${slidesHTML}
  </div>
</div>
<div class="google-review-controls">
  <button id="google-review-prev"><img src="https://marketingthatworks-public.s3.us-east-1.amazonaws.com/arrow-left-circle.svg" alt="left-arrow.svg" /></button>
  <button id="google-review-next"><img src="https://marketingthatworks-public.s3.us-east-1.amazonaws.com/arrow-right-circle.svg" alt="right-arrow.svg" /></button>
</div>
<script>
  (function() {
    const track = document.querySelector('.google-reviews-track');
    const slides = track.children;
    const totalSlides = slides.length;
    let currentIndex = 0;

    function updateCarousel() {
      track.style.transform = 'translateX(' + (-currentIndex * 100) + '%)';
    }

    document.getElementById('google-review-prev').addEventListener('click', () => {
      currentIndex = (currentIndex === 0) ? totalSlides - 1 : currentIndex - 1;
      updateCarousel();
    });

    document.getElementById('google-review-next').addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % totalSlides;
      updateCarousel();
    });
  })();
</script>
</body>
</html>
  `;
}

function generateCarouselWidgetHTMLForMediaItems(mediaItems: MediaItem[]) {
  // Chunk media items into groups of three
  const chunkedItems = [];
  for (let i = 0; i < mediaItems.length; i += 3) {
    chunkedItems.push(mediaItems.slice(i, i + 3));
  }

  // For each chunk (slide), create the HTML with up to 3 "cards"
  const slidesHTML = chunkedItems
    .map((chunk) => {
      const mediaCards = chunk
        .map((mediaItem) => {
          const image = mediaItem.googleUrl;
          const { widthPixels, heightPixels } = mediaItem.dimensions || {};

          // Fallback for images without dimension data
          const aspectRatio =
            widthPixels && heightPixels
              ? `${widthPixels} / ${heightPixels}`
              : "16 / 9"; // or pick any default ratio

          return `
            <div
              class="media-card"
              style="aspect-ratio: ${aspectRatio}"
            >
              <img
                class="media-item"
                src="${image}"
                alt="media"
              />
            </div>
          `;
        })
        .join("");

      return `
        <div class="google-review-slide">
          ${mediaCards}
        </div>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    /* Outer container that masks overflow */
    .google-reviews-carousel {
      position: relative; /* Allows absolutely positioned arrows on top */
              /* or specify a fixed width if you prefer */
      overflow: hidden;
      margin: 0 auto;     /* Center the carousel if it has a fixed width */
    }

    /* The track that holds all slides horizontally */
    .google-reviews-track {
      display: flex;                   /* Align slides horizontally in a row */
      transition: transform 0.5s ease; /* Smooth sliding animation */
    }

    /* Each “slide” should be as wide as the container */
    .google-review-slide {
      flex: 0 0 100%;     /* Each slide is 100% of the carousel’s width */
      display: flex;      /* So you can keep your 3 media-cards horizontally within each slide */
      gap: 1rem;
      justify-content: center; /* Optional: center the cards on each slide */
      box-sizing: border-box;
      padding: 1rem;      /* Optional spacing around the cards */
    }

    /* Card container for each image */
    .media-card {
      /* aspect-ratio is set inline via style attribute. */
      width: 200px;      /* This sets the container’s width; height is auto via aspect ratio. */
      overflow: hidden;
      position: relative;
      background-color: #fafafa;
    }

    /* Each image covers its container by default */
    .media-item {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: 10px;
    }

    /*
      The container for the arrow buttons:
      We'll absolutely position this to overlay the carousel,
      and have the buttons appear at the left and right ends.
    */
    .google-review-controls {
      position: absolute;
      top: 50%;               /* Center vertically */
      transform: translateY(-50%);
      width: 100%;            /* Full width so we can position left/right buttons */
      display: flex;
      justify-content: space-between;
      pointer-events: none;   /* So the container doesn't interfere with clicks outside the buttons */
    }

    /* Style for the actual arrow buttons */
    .google-review-controls button {
      pointer-events: auto;   /* Re-enable clicks for the buttons themselves */
      background: #eee;
      border: none;
      padding: 8px 12px;
      margin: 0 5px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s ease;
      opacity: 0.8;           /* Slightly transparent */
    }

    .google-review-controls button:hover {
      background: #ccc;
      opacity: 1;
    }

    /* Fine-tune left/right button placement, if needed */
    #google-review-prev {
      margin-left: 10px;
    }
    #google-review-next {
      margin-right: 10px;
    }
  </style>
</head>
<body>
  <!-- Outer container: Masks overflow -->
  <div class="google-reviews-carousel">
    <!-- Inner track: Used for sliding left/right via transform -->
    <div class="google-reviews-track">
      ${slidesHTML}
    </div>
    <!-- Arrows are absolutely positioned over the carousel -->
    <div class="google-review-controls">
      <button id="google-review-prev">
        <img src="https://marketingthatworks-public.s3.us-east-1.amazonaws.com/arrow-left-circle.svg" alt="left-arrow.svg" />
      </button>
      <button id="google-review-next">
        <img src="https://marketingthatworks-public.s3.us-east-1.amazonaws.com/arrow-right-circle.svg" />
      </button>
    </div>
  </div>

  <script>
    (function() {
      const track = document.querySelector('.google-reviews-track');
      const slides = track.children;
      const totalSlides = slides.length;
      let currentIndex = 0;

      function updateCarousel() {
        // Slide the track to show the current index
        track.style.transform = 'translateX(' + (-currentIndex * 100) + '%)';
      }

      document.getElementById('google-review-prev').addEventListener('click', () => {
        currentIndex = (currentIndex === 0) ? totalSlides - 1 : currentIndex - 1;
        updateCarousel();
      });

      document.getElementById('google-review-next').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateCarousel();
      });
    })();
  </script>
</body>
</html>
  `;
}
