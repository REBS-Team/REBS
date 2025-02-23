const axios = require('axios');
const { exec } = require('child_process'); // For running CaptchaHarvester CLI
const fun = require("funcaptcha");

module.exports = {
  data: {
    name: "report",
    description: "Report an infringing URL with detailed information",
    "integration_types": [1],
    "contexts": [0, 1, 2],
    options: [
      {
        name: "illegalcontenturl",
        description: "The infringing URL to report",
        type: 3,
        required: true
      },
      {
        name: "country",
        description: "Select the country where the infringement occurred",
        type: 3,
        required: true,
        choices: [
          { name: "Austria", value: "Austria" },
          { name: "Belgium", value: "Belgium" },
          { name: "Bulgaria", value: "Bulgaria" },
          { name: "Croatia", value: "Croatia" },
          { name: "Czechia", value: "Czechia" },
          { name: "Denmark", value: "Denmark" },
          { name: "Estonia", value: "Estonia" },
          { name: "Finland", value: "Finland" },
          { name: "France", value: "France" },
          { name: "Germany", value: "Germany" },
          { name: "Greece", value: "Greece" },
          { name: "Hungary", value: "Hungary" },
          { name: "Ireland", value: "Ireland" },
          { name: "Italy", value: "Italy" },
          { name: "Latvia", value: "Latvia" },
          { name: "Lithuania", value: "Lithuania" },
          { name: "Netherlands", value: "Netherlands" },
          { name: "Norway", value: "Norway" },
          { name: "Poland", value: "Poland" },
          { name: "Portugal", value: "Portugal" },
          { name: "Romania", value: "Romania" },
          { name: "Slovakia", value: "Slovakia" },
          { name: "Slovenia", value: "Slovenia" },
          { name: "Spain", value: "Spain" },
          { name: "Sweden", value: "Sweden" }
        ]
      },
      {
        name: "illegaltype",
        description: "Select the reason for reporting",
        type: 3,
        required: true,
        choices: [
          { name: "Illegal Content", value: "IllegalContent" },
          { name: "Child Sexual Exploitation", value: "ChildSexualExploitation" },
          { name: "Terrorism and Violent Extremism", value: "TerrorismAndViolentExtremism" },
          { name: "Threats of Violence", value: "ThreatsOfViolence" },
          { name: "Hate Speech", value: "HateSpeech" },
          { name: "Scams", value: "Scams" },
          { name: "Illegal Goods and Activities", value: "IllegalGoodsAndActivities" },
          { name: "IP Infringement", value: "IPInfringement" },
          { name: "Other", value: "Other" }
        ]
      },
      {
        name: "otherviolation",
        description: "Specify the other reason for reporting (if 'Other' is selected)",
        type: 3,
        required: true,
        choices: [
          { name: "None", value: "" },
          { name: "Child Endangerment", value: "Child Endangerment" }
        ]
      },
      {
        name: "reason",
        description: "Elaborate on the reason (for all reasons)",
        type: 3,
        required: true
      },
      {
        name: "email",
        description: "Your email for response",
        type: 3,
        required: false
      },
      {
        name: "name",
        description: "Your name for response",
        type: 3,
        required: false
      }
    ]
  },
  async execute(interaction) {
    const url = interaction.options.getString("illegalcontenturl");
    const country = interaction.options.getString("country");
    const reason = interaction.options.getString("reason");
    const details = interaction.options.getString("illegaltype");
    const otherReason = interaction.options.getString("otherviolation");
    const email = interaction.options.getString("email") || "";
    const name = interaction.options.getString("name") || "";

    // Validation: Check if otherReason is set when illegaltype is not "Other"
    if (details !== "Other" && otherReason !== "") {
      return await interaction.reply({
        content: "Error: You can't specify an 'Other Violation' when the main reason isn't 'Other'! Please select 'Other' as the Illegal Type if you want to specify an Other Violation, or set Other Violation to 'None'.",
        ephemeral: true
      });
    }

    // Build initial response message
    let response = `New Report Submitted!\n` +
                   `IllegalContentUrl: ${url}\n` +
                   `Country: ${country}\n` +
                   `IllegalType: ${details}\n` +
                   `Reason: ${reason}\n` +
                   (details === "Other" ? `OtherViolation: ${otherReason || "Not specified"}\n` : "") +
                   `Email: ${email}\n` +
                   `Name: ${name}\n` +
                   `Bot made by: <@530047797441855553>\n`;

    // Send initial reply to Discord
    await interaction.reply({ content: response, tts: true, ephemeral: false });

    try {
      // Step 1: Get session cookie from Roblox metadata
      const sessionCookie = await getCookieFromReportingMetadata(url, country, details, otherReason, reason, email, name);
      response += `Session Cookie: ${sessionCookie || "Not provided"}\n`;

      // Step 2: Get Arkose Labs public key and dataExchangeBlob from CAPTCHA metadata
      const { publicKey, dataExchangeBlob } = await getCaptchaMetadata(); // Updated function to get both
      response += `Arkose Public Key: ${publicKey}\n`;

      // Step 3: Use funcaptcha to get Arkose token (manual solving required)
      response += `Please solve the CAPTCHA in the browser window that opens. Waiting for token...\n`;
      await interaction.editReply({ content: response, tts: true });
      const arkoseToken = await getArkoseTokenWithCaptchaHarvester(publicKey, dataExchangeBlob);
      response += `Arkose Session Token: ${arkoseToken}\n`;

      // Step 4: Submit the report to Roblox
      const submissionResult = await submitReport(sessionCookie, arkoseToken, url, country, details, otherReason, reason, email, name);
      response += `\nReport Submission Result: ${JSON.stringify(submissionResult, null, 2)}`;
    } catch (error) {
      console.error("Error during report submission:", error.message);
      response += `\nError: ${error.message}`;
    }

    // Update the Discord reply with the final response
    await interaction.editReply({ content: response, tts: true });
  }
};

// Helper Functions

async function getCookieFromReportingMetadata(url, country, details, otherReason, reason, email, name) {
  const cookieEndpoint = "https://www.roblox.com/illegal-content-reporting/metadata";
  const params = {
    IllegalContentUrl: url,
    Country: country,
    IllegalType: details,
    OtherViolation: details === "Other" ? otherReason : "",
    Reason: reason,
    Email: email,
    Name: name
  };

  const headers = {
    'authority': 'www.roblox.com',
    'method': 'GET',
    'path': '/illegal-content-reporting/metadata',
    'scheme': 'https',
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://www.roblox.com',
    'referer': 'https://www.roblox.com/illegal-content-reporting',
    'sec-ch-ua': '"Not/A)Brand";v="24", "Chromium";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await axios.get(cookieEndpoint, { params, headers });
    if (response.status === 200 && response.headers['set-cookie']) {
      return response.headers['set-cookie'].join('; ');
    } else {
      throw new Error(`No session cookie returned. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching session cookie:", error.message);
    throw new Error(`Failed to retrieve session cookie: ${error.message}`);
  }
}

async function getCaptchaMetadata() {
  const captchaEndpoint = "https://apis.rbxcdn.com/captcha/v1/metadata";
  const headers = {
    'authority': 'apis.rbxcdn.com',
    'method': 'GET',
    'path': '/captcha/v1/metadata',
    'scheme': 'https',
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://www.roblox.com',
    'referer': 'https://www.roblox.com/',
    'sec-ch-ua': '"Not/A)Brand";v="24", "Chromium";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await axios.get(captchaEndpoint, { headers });
    if (response.status === 200) {
      const publicKey = response.data.funCaptchaPublicKeys?.['ACTION_TYPE_SUPPORT_REQUEST'];
      if (!publicKey) {
        throw new Error("Arkose Labs public key for ACTION_TYPE_SUPPORT_REQUEST not found in CAPTCHA metadata");
      }

      // Attempt to extract dataExchangeBlob from the response
      let dataExchangeBlob = null;
      if (response.headers['rbx-challenge-metadata']) {
        const fieldData = JSON.parse(Buffer.from(response.headers['rbx-challenge-metadata'], 'base64').toString('utf8'));
        dataExchangeBlob = fieldData.dataExchangeBlob;
      } else if (response.data && response.data.dataExchangeBlob) {
        // Fallback: Check if the response body contains the blob
        dataExchangeBlob = response.data.dataExchangeBlob;
      }

      if (!dataExchangeBlob) {
        throw new Error("dataExchangeBlob not found in CAPTCHA metadata or headers");
      }

      return { publicKey, dataExchangeBlob };
    } else {
      throw new Error(`Unexpected status from CAPTCHA metadata: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching CAPTCHA metadata:", error.message);
    throw new Error(`Failed to retrieve CAPTCHA metadata: ${error.message}`);
  }
}

async function getArkoseTokenWithCaptchaHarvester(publicKey, dataExchangeBlob) {
  const fun = require("funcaptcha");

  try {
    const token = await fun.getToken({
      pkey: publicKey, // Use the public key obtained from getCaptchaMetadata
      surl: "https://roblox-api.arkoselabs.com", // Roblox-specific Arkose Labs service URL
      data: { // Use the dynamically fetched dataExchangeBlob
        blob: dataExchangeBlob
      },
      headers: { // Optional: Custom headers with a User-Agent
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
      },
      site: "https://www.roblox.com/illegal-content-reporting", // The specific Roblox reporting page
      proxy: "http://127.0.0.1:8888" // Optional: Proxy for token fetching (remove if not needed)
    });
    return token;
  } catch (error) {
    console.error("Error fetching Arkose token with funcaptcha:", error.message);
    throw new Error(`Failed to obtain Arkose token: ${error.message}`);
  }
}

async function submitReport(sessionCookie, arkoseToken, url, country, details, otherReason, reason, email, name) {
  // Placeholder endpoint - replace with actual URL from network inspection
  const submissionEndpoint = "https://www.roblox.com/illegal-content-reporting";
  const payload = {
    IllegalContentUrl: url,
    Country: country,
    IllegalType: details,
    OtherViolation: details === "Other" ? otherReason : "",
    Reason: reason,
    Email: email,
    Name: name,
    "arkose_token": arkoseToken // Arkose Labs typically uses "arkose_token" as the field name
  };

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': sessionCookie,
    'authority': 'www.roblox.com',
    'method': 'POST',
    'path': '/illegal-content-reporting', // Update path if endpoint differs
    'scheme': 'https',
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://www.roblox.com',
    'referer': 'https://www.roblox.com/illegal-content-reporting',
    'sec-ch-ua': '"Not/A)Brand";v="24", "Chromium";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await axios.post(submissionEndpoint, payload, { headers });
    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        message: "Report submitted successfully",
        data: response.data
      };
    } else {
      throw new Error(`Unexpected status from submission: ${response.status}`);
    }
  } catch (error) {
    console.error("Error submitting report:", error.message);
    throw new Error(`Failed to submit report: ${error.message}`);
  }
};