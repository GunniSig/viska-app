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
    const hasLocation = lat && lng;

    const pharmacyMapLink = hasLocation
      ? `https://www.google.com/maps/search/apótek/@${lat},${lng},14z`
      : null;
      const healthMapLink = hasLocation
      ? `https://www.google.com/maps/search/heilsugæsla/@${lat},${lng},14z`
      : null;

    const busMapLink = hasLocation
      ? `https://www.google.com/maps/search/bus+stop/@${lat},${lng},14z`
      : null;

    const servicesMapLink = hasLocation
      ? `https://www.google.com/maps/search/þjónusta/@${lat},${lng},14z`
      : null;
      
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
- Svaraðu spurningunni beint.
- Ekki segja bara að þú sért ekki tengd lifandi leit.
- Ef notandi spyr um apótek og staðsetning er til staðar, gefðu kortahlekkinn og segðu að hann opni apótek nálægt staðsetningunni.
- Ekki búa til nöfn, opnunartíma eða fjarlægðir.
- Notaðu markdown þegar það hjálpar.
- Hafðu svarið stutt og gagnlegt.
- Ef notandi spyr um heilsu eða heilsugæslu og staðsetning er til staðar, gefðu heilsugæslu-kortahlekkinn.
- Ef notandi spyr um strætó eða stoppistöð og staðsetning er til staðar, gefðu strætó-kortahlekkinn.
- Ef notandi spyr um þjónustu nálægt sér og staðsetning er til staðar, gefðu almenna þjónustu-kortahlekkinn.

Kortahlekkur fyrir apótek nálægt notanda:
${pharmacyMapLink || "engin staðsetning til staðar"}
Kortahlekkur fyrir heilsugæslu nálægt notanda:
${healthMapLink || "engin staðsetning til staðar"}

Kortahlekkur fyrir strætó eða stoppistöð nálægt notanda:
${busMapLink || "engin staðsetning til staðar"}

Kortahlekkur fyrir almenna þjónustu nálægt notanda:
${servicesMapLink || "engin staðsetning til staðar"}

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