import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			manifest: false, // we serve our own manifest.webmanifest from static/
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			workbox: {
				runtimeCaching: [
					{
						urlPattern: /^\/api\/matches/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'api-matches',
							expiration: { maxEntries: 1, maxAgeSeconds: 3600 }
						}
					}
				]
			}
		})
	]
});
