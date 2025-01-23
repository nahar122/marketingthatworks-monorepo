// src/utils/googleClient.ts
import { google } from "googleapis";
import { readFileSync } from "fs";
import path from "path";

class GoogleAuthService {
  private static jwtClient: any = null;

  public static async getClient() {
    console.log(
      "THIS IS GOOGLE SERVICE ACC PATH: ",
      path.resolve("marketingthatworks-service-acc.json")
    );
    if (!this.jwtClient) {
      const credentials = JSON.parse(
        readFileSync(
          path.resolve("marketingthatworks-service-acc.json"),
          "utf8"
        )
      );

      // Instantiate JWT client
      this.jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/business.manage"], // Adjust scope as needed
      });

      // Authorize the client
      try {
        await this.jwtClient.authorize();
        console.log("Google JWT Client successfully authorized.");
      } catch (err) {
        console.error("Error authorizing Google JWT Client: ", err);
        throw err;
      }
    }

    return this.jwtClient;
  }
}

export default GoogleAuthService;
