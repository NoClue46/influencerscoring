import { html } from 'hono/html';

export function layout(children: ReturnType<typeof html>) {
    return html`
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
            </style>
            <script src="//unpkg.com/alpinejs" defer></script>
        </head>
        <body>
        ${children}
        </body>
        </html>
    `;
}
