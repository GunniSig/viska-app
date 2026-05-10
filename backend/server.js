import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import pkg from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const axios = require("axios");
const { PrismaClient } = pkg;

dotenv.config();
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY EXISTS:", !!process.env.SUPABASE_ANON_KEY);

const app = express();

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getUser(req) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user;
}

app.get("/", (req, res) => {
  res.json({
    message: "Viska API virkar!",
  });
});

app.get("/messages", async (req, res) => {

  try {

    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(messages);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Villa við að sækja skilaboð.",
    });
  }
});

app.delete("/messages", async (req, res) => {

  try {

    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    await prisma.chatMessage.deleteMany({
      where: {
        userId: user.id,
      },
    });

    res.json({
      message: "Samtal hreinsað.",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Villa við að hreinsa skilaboð.",
    });
  }
});

async function findNearbyPharmacy(lat, lng) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: "pharmacy",
          format: "json",
          limit: 3,
          lat,
          lon: lng,
        },
        headers: {
          "User-Agent": "ViskaApp/1.0",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Nominatim villa:", error);

    return [];
  }
}

app.post("/ask", async (req, res) => {

  try {

    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { question, lat, lng } = req.body;

    let nearbyPharmacies = [];

    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "user",
        content: question,
      },
    });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
Þú ert Viska, stafræn hjálparaðstoð fyrir eldri borgara á Íslandi.
Svaraðu einfalt, hlýlega og skýrt á íslensku.

Ef notandi spyr um þjónustu nálægt sér, apótek, heilsugæslu, strætó eða staðsetningu, notaðu staðsetningargögnin ef þau eru til staðar.

Staðsetning notanda:
Latitude: ${lat || "óþekkt"}
Longitude: ${lng || "óþekkt"}

Mikilvægt:
- Ekki þykjast vita nákvæm opnunartíma eða fjarlægðir nema gögn séu til staðar.
- Ef staðsetning er til staðar, segðu að þú getir hjálpað að leita að þjónustu nálægt þessari staðsetningu.
- Ef staðsetning vantar, biddu notanda vinsamlega að leyfa staðsetningu í vafranum.
- Notaðu einfalt mál og stuttar setningar.


Spurning:
${question}
      `,
    });

    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: response.output_text,
      },
    });

    res.json({
      answer: response.output_text,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Villa kom upp.",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});