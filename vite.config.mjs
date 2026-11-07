import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cssFiles, updateCssVersions } from './scripts/update-css-version.mjs';

export default {
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'update-css-versions',
            buildStart() {
                updateCssVersions();
            },
            configureServer(server) {
                server.watcher.add(cssFiles);
                server.watcher.on('change', path => {
                    if (cssFiles.includes(resolve(path))) {
                        updateCssVersions();
                    }
                });
            }
        }
    ]
};
