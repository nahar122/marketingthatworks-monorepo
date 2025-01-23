import crypto from "crypto";
import { google } from "googleapis";
import GoogleAuthService from "../services/GoogleClient";
import axios from "axios";
import { MediaItem, Review } from "@marketingthatworks/shared-lib";
/**
 * Generates a secure random API key.
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes the API key with SHA-256 before storage or lookup.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function isGMBLocationAccessEnabled(location_id: string) {
  const accountManagement = google.mybusinessaccountmanagement("v1");
  const businessInformation = google.mybusinessbusinessinformation("v1");

  const listAccountsResposne = await accountManagement.accounts.list();

  const accounts = listAccountsResposne.data.accounts;

  if (!accounts) {
    //   console.log(accounts);
    throw new Error("No accounts found");
  }
  const accountName = accounts[0].name;

  console.log(accounts);

  const locationsResponse = await businessInformation.accounts.locations.list({
    parent: accountName as string,
    readMask: "name",
  });

  const locations = locationsResponse.data.locations;

  if (!locations) {
    throw new Error(`No locations found under account '${accountName}'`);
  }

  const isLocationAccessEnabled = locations.some(
    (location) => location.name?.split("/")[1] === location_id
  );

  return isLocationAccessEnabled;
}

export async function getReviewsFromGMB(fetchUrl: string): Promise<Review[]> {
  const client = await GoogleAuthService.getClient();

  const accessToken = client.credentials.access_token;

  if (!accessToken) {
    throw new Error("No valid access token");
  }

  // let url = `https://mybusiness.googleapis.com/v4/accounts/${account_id}/locations/${location_id}/reviews?pageSize=50&`;

  let response = await axios.get(fetchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // You can process the response data here if needed
  if (!response.data) {
    console.log("No reviews found for specified location");
  }

  console.log("Response Data: ", response.data);

  let cumulativeData = {
    reviews: response.data.reviews,
    averageRating: response.data.averageRating,
    totalReviewCount: response.data.totalReviewCount,
  };

  while (response.data.nextPageToken) {
    let new_url = fetchUrl + `pageToken=${response.data.nextPageToken}`;
    response = await axios.get(new_url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.data) {
      cumulativeData.reviews += response.data.reviews;
    }
  }

  return cumulativeData.reviews as Review[];
}

export async function getImagesFromGMB(fetchUrl: string): Promise<MediaItem[]> {
  const client = await GoogleAuthService.getClient();

  const accessToken = client.credentials.access_token;

  if (!accessToken) {
    throw new Error("No valid access token");
  }

  try {
    let response = await axios.get(fetchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // You can process the response data here if needed
    if (!response.data) {
      console.log("No photos found for specified location");
    }

    console.log("Response Data: ", response.data);

    let cumulativeData = {
      mediaItems: response.data.mediaItems,
      totalMediaItemCount: response.data.totalMediaItemCount,
    };

    while (response.data.nextPageToken) {
      let new_url = fetchUrl + `pageToken=${response.data.nextPageToken}`;
      response = await axios.get(new_url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.data) {
        cumulativeData.mediaItems += response.data.mediaItems;
      }
    }

    return cumulativeData.mediaItems as MediaItem[];
  } catch (error: any) {
    console.error(
      "Error retrieving media items:",
      error.response?.data || error
    );

    return [];
  }
}
