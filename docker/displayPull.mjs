// /noona/warden/docker/displayPull.mjs

import { makeLoadBar } from '../noona/logger/makeLoadBar.mjs';
import {
    printSubHeader,
    printNote,
    printResult,
    printDivider,
    printError,
    printDebug
} from '../noona/logger/logUtils.mjs';
import { formatBytes, ordinalSuffix } from './getMetadata.mjs';

/**
 * Handles Docker image pull progress with milestone logging per layer.
 * @param {import('dockerode')} docker - Dockerode instance
 * @param {NodeJS.ReadableStream} stream - Docker pull stream
 * @param {string} imageName - Name of the Docker image
 */
export async function handlePullProgress(docker, stream, imageName) {
    return new Promise((resolve, reject) => {
        try {
            const layers = {};       // Layer data by ID
            const milestones = [0, 0.2, 0.4, 0.6, 0.8, 1.0]; // 6 milestones including 0% and 100%
            const printed = {};     // Tracks printed milestones per layer

            docker.modem.followProgress(stream, onFinished, onProgress);

            function onProgress(event) {
                const { id, progressDetail, status } = event;

                // Debug log for every event
                printDebug(`Event: ${JSON.stringify(event)}`);

                if (!id || !progressDetail || !progressDetail.total || !progressDetail.current) return;

                const current = progressDetail.current;
                const total = progressDetail.total;

                // Initialize layer data if first time
                if (!layers[id]) {
                    layers[id] = { current: 0, total };
                    printed[id] = new Set();

                    const index = Object.keys(layers).length;
                    const readableSize = formatBytes(total);
                    printSubHeader(`Downloading ${ordinalSuffix(index)} layer: ${id}`);
                    printNote(`› Size: ${readableSize}`);
                }

                layers[id].current = current;

                const ratio = current / total;
                for (let i = 0; i < milestones.length; i++) {
                    const threshold = milestones[i];
                    const key = `${Math.floor(threshold * 100)}%`;

                    // Check if the milestone is passed, and print a progress bar
                    if (ratio >= threshold && !printed[id].has(key)) {
                        printed[id].add(key);
                        const bar = makeLoadBar(threshold);
                        printResult(`${bar} ${key} of layer ${id}`);
                    }
                }

                // If the event indicates a skipped layer due to caching, display progress manually
                if (status.includes('Cached') || status.includes('No downloadable layers')) {
                    if (!layers[id].current || layers[id].current === 0) {
                        const bar = makeLoadBar(1);
                        printResult(`${bar} 100% of layer ${id} (cached)`);
                    }
                }
            }

            async function onFinished(err) {
                if (err) {
                    printError(`Failed to pull image: ${imageName}`);
                    return reject(err);
                }

                // Sum layer sizes for a rough total
                const totalSize = Object.values(layers).reduce((acc, l) => acc + l.total, 0);
                if (totalSize === 0) {
                    printResult(`No downloadable layers found. Likely cached image: ${imageName}`);
                } else {
                    printResult(`✔ Pulled: ${imageName}`);
                    printNote(`› Total Size: ${formatBytes(totalSize)}`);
                }

                printDivider();
                resolve();
            }

        } catch (err) {
            printError(`Error during pull of ${imageName}: ${err.message}`);
            reject(err);
        }
    });
}
