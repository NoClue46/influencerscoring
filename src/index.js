import 'dotenv/config';
import {Hono} from 'hono';
import {serve} from '@hono/node-server';
import {html} from "hono/html";
import {fetchAllReels, fetchReelsUrl} from "./scrape-creators.js";
import {mkdir, readdir} from 'node:fs/promises';
import {statSync, writeFileSync} from "node:fs";
import {downloadVideo} from "./files.js";
import {videoToFrames} from "./replicate.js";
import {askOpenai} from "./ask-openai.js";
import path from "node:path";

const app = new Hono();

const layout = (children) => html`
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>App</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
        <meta name="color-scheme" content="light dark" />
        <style>
            body {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
            }
            form {
                width: 400px;
                height: 400px;
                margin-top: 20vh;
            }
        </style>
        <script src="//unpkg.com/alpinejs" defer></script>
    </head>
    <body>
    ${children}
    </body>
    </html>
`;

app.post("/", async (c) => {
    try {
        const body = await c.req.parseBody()

        let username = body.username;
        if (username.startsWith('@')) {
            username = username.substring(1);
        }

        const dir = path.join("./videos", username);

        await mkdir(dir, {recursive: true});

        // step 1: fetch reels info
        let reelsList = await fetchAllReels(username);

        // todo: remove
        reelsList = reelsList.slice(0, 2);

        console.info(`Found reels: ${reelsList}`);

        // step 2: fetch reels urls
        const reelsUrls = [];
        for (let i = 0; i < reelsList.length;) {
            const currentPromises = [];
            for (let j = 0; j < 3 && i + j < reelsList.length; j++, i++) {
                currentPromises.push(fetchReelsUrl(reelsList[i]));
            }
            const currentUrls = await Promise.all(currentPromises);
            reelsUrls.push(...currentUrls.filter(url => !!url));
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.info("reels urls: ", reelsUrls);

        // step 3: download and save reels
        for (let i = 0; i < reelsUrls.length; i++) {
            console.info(`Downloading ${i} video`);
            await downloadVideo(reelsUrls[i], path.join(dir, `${i}.mp4`));
        }

        let files = await readdir(dir);

        // todo: remove
        files = files.slice(0,2);

        const result = [];

        for (const file of files) {
            try {
                console.info("Analyzing file: ", file);

                const filepath = path.join(dir, file);

                if (statSync(filepath).size >= 100 * 1024 * 1024) {
                    continue;
                }

                const currentResult = await videoToFrames(filepath)
                    .then(links => askOpenai(links.slice(0, 200)));

                result.push(currentResult);

                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error("Failed to analyze file: ", error);
            }
        }

        writeFileSync(`${dir}/result.json`, JSON.stringify(result));

        // Форматирование результатов для HTML
        const resultsHtml = result.map((r, i) => {
            const textContent = r.text || JSON.stringify(r);
            return `
                <article>
                    <header><strong>Video ${i + 1}</strong></header>
                    <details>
                        <summary>OpenAI Analysis</summary>
                        <pre style="white-space: pre-wrap; word-wrap: break-word;">${textContent}</pre>
                    </details>
                </article>
            `;
        }).join('');

        return c.html(
            layout(
                html`
                    <div style="width: 90%; max-width: 1200px; margin: 2rem auto;">
                        <h1>Results for @${username}</h1>
                        <p>Analyzed ${result.length} videos</p>

                        ${html([resultsHtml])}

                        <article>
                            <header><strong>Raw JSON Data</strong></header>
                            <details>
                                <summary>Full Results</summary>
                                <pre style="white-space: pre-wrap; word-wrap: break-word; max-height: 500px; overflow-y: auto;">${JSON.stringify(result, null, 2)}</pre>
                            </details>
                        </article>
                    </div>
                `
            )
        );
    } catch (error) {
        console.error("failed to check reels: ", error);
        return c.html(layout(html`<h1 style="color: red;">Internal server error!</h1>`))
    }
})

app.get("/", c => {
    return c.html(
        layout(
            html`
                <form action="/" method="post" x-data>
                    <input type="text" name="username" placeholder="cristiano" />
                    <button type="submit" @click="$el.setAttribute('aria-busy', 'true')">Check</button>
                </form>`
        )
    )
})

const server = serve(app)

process.on('SIGINT', () => {
    server.close()
    process.exit(0)
})
process.on('SIGTERM', () => {
    server.close((err) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        process.exit(0)
    })
})