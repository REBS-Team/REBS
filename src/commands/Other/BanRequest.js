const axios = require('axios');
const fun = require('funcaptcha');

module.exports = {
  data: {
    name: "report",
    description: "Report an infringing URL with detailed information",
    integration_types: [1],
    contexts: [0, 1, 2],
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

    if (details !== "Other" && otherReason !== "") {
      return await interaction.reply({
        content: "Error: You can't specify an 'Other Violation' when the main reason isn't 'Other'! Please select 'Other' as the Illegal Type if you want to specify an Other Violation, or set Other Violation to 'None'.",
        ephemeral: true
      });
    }

    let response = `New Report Submitted!\n` +
                   `IllegalContentUrl: ${url}\n` +
                   `Country: ${country}\n` +
                   `IllegalType: ${details}\n` +
                   `Reason: ${reason}\n` +
                   (details === "Other" ? `OtherViolation: ${otherReason || "Not specified"}\n` : "") +
                   `Email: ${email}\n` +
                   `Name: ${name}\n` +
                   `Bot made by: <@530047797441855553>\n`;

    await interaction.reply({ content: response, tts: true, ephemeral: false });

    try {
      const sessionCookie = await getCookieFromReportingMetadata(url, country, details, otherReason, reason, email, name);
      response += `Session Cookie: ${sessionCookie || "Not provided"}\n`;

      const loginEndpoint = "https://auth.roblox.com/v2/login";
      const loginPayload = {
        ctype: "Username",
        cvalue: "dummyuser",
        password: "dummypass"
      };
      const loginHeaders = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Origin": "https://www.roblox.com",
        "Referer": "https://www.roblox.com/",
        "Cookie": sessionCookie || ""
      };

      const loginResponse = await axios.post(loginEndpoint, loginPayload, { headers: loginHeaders });
      response += `Login Attempt Status: ${loginResponse.status}\n`;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        const fieldData = error.response.data.errors[0].fieldData;
        const parsedFieldData = JSON.parse(fieldData);
        const dxBlob = parsedFieldData.dxBlob || "Not found";
        response += `Data Exchange Blob: ${dxBlob}\n`;
      } else {
        response += `Login Error: ${error.message}\n`;
      }
    }

    try {
      const publicKey = "63E4117F-E727-42B4-6DAA-C8448E9B137F";
      response += `Arkose Public Key: ${publicKey}\n`;

      const tokenObj = await fun.getToken({
        pkey: publicKey,
        surl: "https://roblox-api.arkoselabs.com",
        data: {},
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Origin": "https://www.roblox.com",
          "Referer": "https://www.roblox.com/illegal-content-reporting"
        },
        site: "https://www.roblox.com/illegal-content-reporting"
      });

      const token = tokenObj.token || JSON.stringify(tokenObj);
      response += `CAPTCHA Token: ${token || "Not retrieved"}\n`;

      if (tokenObj.data && tokenObj.data.blob) {
        response += `Funcaptcha Blob (Bonus): ${tokenObj.data.blob}\n`;
      }
    } catch (error) {
      response += `\nCAPTCHA Error: ${error.message}`;
    }

    await interaction.editReply({ content: response, tts: true });
  }
};

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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.roblox.com",
    "Referer": "https://www.roblox.com/illegal-content-reporting",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
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