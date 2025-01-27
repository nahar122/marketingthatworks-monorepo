// src/routes/business.ts
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { getImagesFromGMB, getReviewsFromGMB } from "../utils/helpers"
import { MediaItem, Review } from "@marketingthatworks/shared-lib";
import { Collection } from "mongodb";
import { CLIPTextModelWithProjection, CLIPVisionModelWithProjection, PreTrainedTokenizer, Processor } from "@huggingface/transformers";
import { config } from "../config";
import axios from "axios";

interface BusinessRoutesDeps {
    reviewsCol: Collection<Review>;
    mediaCol: Collection<MediaItem>;
}

export function businessRoutes(deps: BusinessRoutesDeps) {

    const router = Router();

    const {reviewsCol, mediaCol} = deps

    router.post("/reviews", authMiddleware, async (req: Request, res: Response) => {
        if (!req.account_id) {
            res.status(400).json({ error: "Missing account information." });
            return
        }
          
          if (!req.location_id) {
            res.status(400).json({ error: "Missing location information." });
            return
        }


          try {
            const latestReview = await reviewsCol.findOne({}, {sort: {createTime: -1}})

            let filterClause = ""
            if (latestReview) {
                const latestCreateTimeString = latestReview.createTime;
                // NOTE: GMB expects an RFC3339 timestamp in quotes for a string comparison
                filterClause = `filter=createTime > "${latestCreateTimeString}"`;
            }

            let url = `https://mybusiness.googleapis.com/v4/accounts/${req.account_id}/locations/${req.location_id}/reviews?pageSize=50`;
            if (filterClause) {
                // Append an ampersand only if pageSize is already used
                url += `&${filterClause}`;
            }

            const reviews = await getReviewsFromGMB(url)

            console.log(`${config.EMBEDDING_SERVICE_BASE_URL}/embed/reviews`);
            const embedReviewsResponse = await axios.post(
              `${config.EMBEDDING_SERVICE_BASE_URL}/embed/reviews`,
              { reviews: reviews }
            );

            if( !(embedReviewsResponse.status === 200) ){
                res.status(500).json({message: "Failed to embed reviews", error: embedReviewsResponse.data.error})
                return
            }

            res.status(200).json({message: "Successfully embedded reviews"})
            return
          } catch (error: any) {
            console.log("ERROR CREATING REVIEW ITEMS IN DB: ", error)
            res.json({message: "failure", error: error})
            return
          }
    })
    
    router.post("/media", authMiddleware, async (req: Request, res: Response) => {
        if (!req.account_id) {
            res.status(400).json({ error: "Missing account information." });
            return
        }
          
          if (!req.location_id) {
            res.status(400).json({ error: "Missing location information." });
            return
        }


          try {
            const latestMediaItem = await mediaCol.findOne({}, {sort: {createTime: -1}})

            let filterClause = ""
            if (latestMediaItem) {
                const latestCreateTimeString = latestMediaItem.createTime;
                // NOTE: GMB expects an RFC3339 timestamp in quotes for a string comparison
                filterClause = `filter=createTime > "${latestCreateTimeString}"`;
            }

            let url = `https://mybusiness.googleapis.com/v4/accounts/${req.account_id}/locations/${req.location_id}/media?pageSize=50`;
            if (filterClause) {
                // Append an ampersand only if pageSize is already used
                url += `&${filterClause}`;
            }

            console.log("FETCH MEDIA URL:", url)

            const mediaItems = await getImagesFromGMB(url)

            
            console.log(`${config.EMBEDDING_SERVICE_BASE_URL}/embed/media`);
            const embedMediaItemsResponse = await axios.post(
              `${config.EMBEDDING_SERVICE_BASE_URL}/embed/media`,
              { mediaItems: mediaItems }
            );

            if( !(embedMediaItemsResponse.status === 200) ){
                res.status(500).json({message: "Failed to embed reviews", error: embedMediaItemsResponse.data.error})
                return
            }

            res.status(200).json({message: "Successfully embedded reviews"})
            return
        } catch (error: any) {
            console.log("ERROR CREATING MEDIA ITEMS IN DB: ", error)
            res.json({message: "success", error: error})
            return
          }
    })

    return router

}