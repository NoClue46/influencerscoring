import 'dotenv/config';
import {Hono} from 'hono';
import {serve} from '@hono/node-server';
import {html} from "hono/html";
import {fetchReelsWithUrls} from "./scrape-creators.js";
import {processVideosToFrames} from "./replicate.js";
import {processFramesWithOpenAI} from "./ask-openai.js";

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
        console.log('Step 1: Parsing request body');
        const body = await c.req.parseBody()

        console.log('Step 2: Processing username');
        let username = body.username;
        if (username.startsWith('@')) {
            username = username.substring(1);
        }
        console.log(`Username: ${username}`);

        // steps 1-2: fetch reels with urls
        console.log('Step 3: Fetching reels with urls');
        const reelsUrls = await fetchReelsWithUrls(username);
        console.log(`Found ${reelsUrls.length} reels`);

        // step 3: frame videos
        console.log('Step 4: Processing videos to frames');
        const frameUrls = await processVideosToFrames(reelsUrls);
        console.log(`Generated ${frameUrls.length} frame sets`);

        // step 4: analyze frames with OpenAI
        console.log('Step 5: Analyzing frames with OpenAI');
        const result = await processFramesWithOpenAI(frameUrls);
        console.log(`Analysis complete for ${result.length} videos`);

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