import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, 'data/processed');

/**
 * Dev-server middleware that serves data/processed/** at the expected URL path.
 * Without this, Vite's root is src/ and has no visibility into data/processed/.
 * Not used during build — CI copies the files into dist/ after vite build.
 */
function localDataPlugin() {
    return {
        name: 'serve-local-data',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const match = req.url.match(/\/data\/processed\/(.+?)(?:\?.*)?$/);
                if (!match) return next();

                const rel = match[1];
                const abs = path.resolve(DATA_DIR, rel);

                // Guard against path-traversal attempts
                if (!abs.startsWith(DATA_DIR + path.sep) && abs !== DATA_DIR) return next();
                if (!existsSync(abs)) return next();

                res.setHeader('Content-Type', 'application/json');
                createReadStream(abs).pipe(res);
            });
        },
    };
}

export default defineConfig({
    base: '/follow-the-money-in/',
    plugins: [tailwindcss(), localDataPlugin()],
    root: 'src',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, 'src/index.html'),
                candidates: path.resolve(__dirname, 'src/candidates.html'),
                candidate: path.resolve(__dirname, 'src/candidate.html'),
                races: path.resolve(__dirname, 'src/races.html'),
                race: path.resolve(__dirname, 'src/race.html'),
            },
        },
    },
});
