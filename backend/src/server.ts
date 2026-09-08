import dotenv from "dotenv";
dotenv.config();

import cors from "@fastify/cors"
import fastify from "fastify";
import z from "zod";
import { generate } from "short-uuid";
import { Pool } from 'pg';

const port = Number(process.env.PORT) || 3000;
const app = fastify({ logger: true });

const pool = new Pool({
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    host: process.env.DB_HOST,
    ssl: true,
});

const RESERVED_URLS = new Set(["favicon.ico", "urls", "admin"]);
app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
});
app.setErrorHandler((error, req, res) => {
    if (error instanceof z.ZodError) {
        return res.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Validation failed.",
            details: error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return res.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: "This URL slug is already in use.",
        });
    }

    req.log.error(error);
    return res.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "An unexpected error occurred on the server.",
    });
});
export default async function handler(req: any, res: any) {
    await app.ready();
    app.server.emit('request', req, res);
}
async function cleanExpiredUrls() {
    try {
        const deletedRows = await pool.query(`
            DELETE FROM url_storage
            WHERE expiration_date < NOW() - INTERVAL '90 days'
        `);
        console.log(`${deletedRows.rowCount} expired URLs removed.`);
    } catch (e) {
        console.error("Expired URLs cleanup failed:", e);
    }
}

app.post("/urls", async (req, res) => {
    const urlSchema = z.object({
        url: z.string().url("Invalid URL format"),
        validTime: z
            .number()
            .int()
            .positive("validTime must be greater than 0")
            .max(366, "URL cannot remain active for more than 1 year"),
    });

    const { url, validTime } = urlSchema.parse(req.body);
    const short_url = generate();

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + validTime);

    await pool.query(
        `INSERT INTO url_storage (original_url, short_url, expiration_date) VALUES ($1, $2, $3)`,
        [url, short_url, expirationDate]
    );

    return res.status(201).send({
        originalUrl: url,
        shortUrl: short_url,
        expirationDate,
    });
});

app.post("/urls/custom", async (req, res) => {
    const urlSchema = z.object({
        url: z.string().url("Invalid URL format"),
        customName: z
            .string()
            .min(3, "Slug must be at least 3 characters long")
            .max(12, "Slug cannot exceed 12 characters")
            .regex(/^[a-zA-Z0-9-]+$/, "Slug must contain only letters, numbers, and hyphens")
            .refine((val) => !RESERVED_URLS.has(val.toLowerCase()), {
                message: "This custom slug is reserved by the system",
            }),
        validTime: z
            .number()
            .int()
            .positive("validTime must be greater than 0")
            .max(366, "URL cannot remain active for more than 1 year"),
    });

    const { url, customName, validTime } = urlSchema.parse(req.body);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + validTime);

    await pool.query(
        `INSERT INTO url_storage (original_url, short_url, expiration_date) VALUES ($1, $2, $3)`,
        [url, customName, expirationDate]
    );

    return res.status(201).send({
        originalUrl: url,
        shortUrl: customName,
        expirationDate,
    });
});

app.get("/urls/:url/stats", async (req, res) => {
    const paramsSchema = z.object({
        url: z.string().min(1, "URL parameter is required"),
    });
    const { url } = paramsSchema.parse(req.params);

    const fullUrlRow = await pool.query(
        `SELECT original_url, short_url, expiration_date, creation_date, click_amount 
         FROM url_storage 
         WHERE short_url = $1`,
        [url]
    );

    if (fullUrlRow.rows.length === 0) {
        return res.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "URL not found.",
        });
    }

    const fullUrl = fullUrlRow.rows[0];
    return res.status(200).send({
        originalUrl: fullUrl.original_url,
        shortUrl: fullUrl.short_url,
        creationDate: fullUrl.creation_date,
        expirationDate: fullUrl.expiration_date,
        clickAmount: fullUrl.click_amount,
    });
});


app.get("/:url", async (req, res) => {
    const paramsSchema = z.object({
        url: z.string().min(1, "URL parameter is required"),
    });
    const { url } = paramsSchema.parse(req.params);

    if (url === "favicon.ico") {
        return res.status(204).send();
    }

    const fullUrlRow = await pool.query(
        `SELECT original_url, expiration_date FROM url_storage WHERE short_url = $1`,
        [url]
    );

    if (fullUrlRow.rows.length === 0) {
        return res.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "URL not found.",
        });
    }

    const record = fullUrlRow.rows[0];
    const currentDate = new Date();

    if (new Date(record.expiration_date) < currentDate) {
        return res.status(410).send({
            statusCode: 410,
            error: "Gone",
            message: "This URL has expired.",
        });
    }

    await pool.query(
        `UPDATE url_storage SET click_amount = click_amount + 1 WHERE short_url = $1`,
        [url]
    );

    return res.redirect(record.original_url);
});

async function start() {
    try {

        await app.listen({ port });
        console.log(`Server running on port ${port}`);
        await cleanExpiredUrls();
    } catch (e) {
        console.error("Application startup error:", e);
        process.exit(1);
    }

}
if (!process.env.VERCEL) {
    setInterval(cleanExpiredUrls, 86_400_000);
    start();
}