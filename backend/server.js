import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import pkg from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

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
Svaraðu alltaf á íslensku, einfalt, hlýlega og skýrt.

Staðsetning notanda:
Latitude: ${lat || "óþekkt"}
Longitude: ${lng || "óþekkt"}

Reglur:
- Notaðu markdown þegar það hjálpar: stutta punkta, feitletrun og fyrirsagnir.
- Hafðu svör skýr og vel uppsett.
- ALDREI spyrja "Viltu að ég leiti?".
- Ekki biðja um staðfestingu ef notandi hefur þegar spurt.
- Ef notandi spyr um næsta apótek og engin apótekagögn eru til staðar, segðu strax að Viska sé ekki enn tengd lifandi apótekaleit.
- Ekki búa til nöfn á apótekum, opnunartíma eða fjarlægðir.
- Gefðu notanda gagnlegt næsta skref.
- Hafðu svarið stutt.
- Þú mátt nota markdown lista og fyrirsagnir til að gera svör skýrari.

Spurning notanda:
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