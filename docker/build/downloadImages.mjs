// docker/build/downloadImages.mjs
import Docker from 'dockerode';
import { handlePullProgress } from './displayPull.mjs';
import { getImageSize, formatBytes } from '../getMetadata.mjs';
import {
    printSubHeader,
    printSpacer,
    printDivider,
    printError,
    printNote,
    printDownloadSummary,
    printResult
} from '../../noona/logger/logUtils.mjs';
import { containerPresets } from '../containerPresets.mjs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Checks if an image already exists locally.
 * @param {string} imageName
 * @returns {Promise<boolean>}
 */
async function imageExistsLocally(imageName) {
    try {
        const images = await docker.listImages();
        // Check if any image's RepoTags include the given image name.
        return images.some(img => img.RepoTags && img.RepoTags.includes(imageName));
    } catch (err) {
        printError(`❌ Failed to check local images: ${err.message}`);
        return false;
    }
}

/**
 * Pulls all required dependency images and displays download status.
 * Only pulls images for containers active in Warden scope.
 */
export async function pullDependencyImages() {
    printDivider();
    printSubHeader('📦 Downloading Docker Images');
    printDivider();

    // Define only the containers needed by Warden.
    const wardenContainers = [
        'noona-redis',
        'noona-mongodb',
        'noona-mariadb',
        'noona-vault',
        'noona-portal'
    ];

    // Get unique image names from container presets.
    const uniqueImages = [
        ...new Set(
            wardenContainers
                .map(name => containerPresets[name])
                .filter(Boolean)
                .map(preset => preset.Image)
        )
    ];

    for (const imageName of uniqueImages) {
        printSpacer();
        printSubHeader(`📦 Image: ${imageName}`);

        try {
            const exists = await imageExistsLocally(imageName);

            if (exists) {
                printResult(`✔ Reusing image: ${imageName}`);
                const size = await getImageSize(imageName);
                printNote(`› › Total Size: ${formatBytes(size)}`);
                printDivider();
                continue;
            }

            printNote(`Pulling image: ${imageName}...`);
            const pullStream = await docker.pull(imageName);
            await handlePullProgress(docker, pullStream, imageName);
            // Optionally log size after pull.
            const size = await getImageSize(imageName);
            printNote(`› › Downloaded Size: ${formatBytes(size)}`);
            printDivider();
        } catch (err) {
            printError(`❌ Failed to pull ${imageName}: ${err.message}`);
            printDivider();
        }
    }

    printDownloadSummary();
}
