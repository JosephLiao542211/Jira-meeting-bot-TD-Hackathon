import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
