import dotenv from "dotenv";
dotenv.config();
import fastify from "fastify";
import z from "zod";
import {generate} from "short-uuid";
import Pool from "pg-pool"

console.log("SENHA LIDA",{
    existe: Boolean(process.env.DB_PASSWORD),
    tipo: typeof process.env.DB_PASSWORD,
})
const app = fastify()
const pool = new Pool({
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    host: process.env.DB_HOST,
})
app.post("/urls", async (req, res) => {
    const urlSchema = z.object({url: z.url(), validTime: z.int().max(366, "A url não pode ficar ativa por mais de 1 ano")})
    const { url, validTime } = urlSchema.parse(req.body)
    const short_url = generate();

    const currentDate = new Date()
    const endTime = new Date()
    endTime.setDate(currentDate.getDate() + validTime)

    await pool.query(`
        INSERT INTO url_storage (original_url, short_url, expiration_date) VALUES ($1, $2, $3)
    `,[url, short_url, endTime])

    return res.status(201).send({
        statusCode: 201,
        body:{
            url,
            short_url,
            endTime
        }
    })
})

app.get("/:url", async (req, res) => {
    const urlSchema = z.object({url: z.string()})
    const { url } = urlSchema.parse(req.params)

    const fullUrlRow = await pool.query(`
        SELECT original_url, expiration_date FROM url_storage WHERE short_url = $1
    `, [url])

    if(fullUrlRow.rows.length === 0) {
        return res.status(404).send({
            statusCode: 404,
            error: "Not found",
            message: "URL not found."
        })
    }

    const fullUrl = fullUrlRow.rows[0]
    const currentDate = new Date()

    if(fullUrl.expiration_date < currentDate) {
        return res.status(410).send({
            statusCode: 410,
            error: "Gone",
            message: "This url is not longer valid."
        })
    }
    await pool.query(`
    UPDATE url_storage
    SET click_amount = click_amount + 1
    WHERE short_url = $1`, [url])
    return res.redirect(fullUrl.original_url)
})
const port = 3000
app.listen({ port } , () => console.log(`Server running on port 3000`))