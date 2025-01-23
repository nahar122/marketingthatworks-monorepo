import puppeteer from "puppeteer";
import { ScrapeResult } from "@marketingthatworks/shared-lib";

export async function scrapePage(url: string): Promise<ScrapeResult> {
  console.log("[Scraper Service] Starting to scrape page with url of:", url);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true, // or 'true' if 'new' not supported in your Puppeteer version
      // If you're running in Docker or a server environment, you might need:
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Navigate to the URL
    console.log("[Scraper Service] Navigating to: ", url);
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60000, // 60s timeout
    });

    // Optionally wait for specific selectors or do any extra steps

    // Extract the text content
    console.log("[Scraper Service] Retrieving URL text content...");
    const textContent = await page.evaluate(() => {
      // This will grab the entire page's text. If you only want certain parts,
      // you can refine your query here.
      return document.body.innerText;
    });

    console.log(
      "[Scraper Service] Successfully retrieved URL content: ",
      textContent
    );

    return {
      url,
      textContent,
    };
  } catch (error) {
    console.error(`[Scraper Service] Error scraping ${url}:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
