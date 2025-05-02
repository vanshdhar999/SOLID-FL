import { fetchFilesFromPod, readFileFromPod, saveFileToPod, overwriteFileInPod } from './solidFileOperations.js';
import { Session } from '@inrupt/solid-client-authn-node';

// Pod configuration
const POD_URL = 'https://storage.ap.inrupt.com/e259ad49-19b1-415f-836b-6f704fc67ec8/';
const TRAINING_CONTAINER = `${POD_URL}training-data/`;

/**
 * Initialize a session with the Solid pod
 * @returns {Promise<Session>} The authenticated session
 */
async function initializeSession() {
    const session = new Session();
    await session.login({
        clientId: "5af30133-90e8-43e7-897f-30c4b9b0ab58",
        clientSecret: "5c29d956-daad-4923-980f-31dba1c9eb01",
        oidcIssuer: "https://login.inrupt.com",
    });

    if (!session.info.isLoggedIn) {
        throw new Error("Failed to log in to the Pod");
    }

    return session;
}

/**
 * Save training data (CSV) to the pod
 * @param {string} fileName - Name of the file to save
 * @param {string} filePath - Local path to the CSV file
 * @param {Function} fetch - The fetch function from the authenticated session
 * @returns {Promise<string>} URL of the saved file
 */
export async function saveTrainingData(fileName, filePath, fetch) {
    return await saveFileToPod(
        TRAINING_CONTAINER,
        filePath,
        'text/csv',
        fileName,
        fetch
    );
}

/**
 * Read training data from the pod
 * @param {string} fileUrl - URL of the file in the pod
 * @param {Function} fetch - The fetch function from the authenticated session
 * @returns {Promise<string>} Contents of the CSV file
 */
export async function readTrainingData(fileUrl, fetch) {
    return await readFileFromPod(fileUrl, fetch);
}

/**
 * Update training data in the pod
 * @param {string} fileUrl - URL of the file to update
 * @param {string} filePath - Local path to the updated CSV file
 * @param {Function} fetch - The fetch function from the authenticated session
 * @returns {Promise<string>} URL of the updated file
 */
export async function updateTrainingData(fileUrl, filePath, fetch) {
    return await overwriteFileInPod(
        fileUrl,
        filePath,
        'text/csv',
        fetch
    );
}

/**
 * Fetch all training data files from the pod
 * @param {string} localDir - Local directory to save the files
 * @param {Function} fetch - The fetch function from the authenticated session
 * @returns {Promise<void>}
 */
export async function fetchAllTrainingData(localDir, fetch) {
    return await fetchFilesFromPod(TRAINING_CONTAINER, localDir, fetch);
}

/**
 * Example usage of the training data operations
 */
export async function exampleUsage() {
    try {
        const session = await initializeSession();
        
        // Example: Save a new training data file
        const savedFileUrl = await saveTrainingData(
            'training-data.csv',
            './local-data/training-data.csv',
            session.fetch
        );
        console.log('Training data saved at:', savedFileUrl);

        // Example: Read the training data
        const trainingData = await readTrainingData(savedFileUrl, session.fetch);
        console.log('Training data:', trainingData);

        // Example: Update the training data
        const updatedFileUrl = await updateTrainingData(
            savedFileUrl,
            './local-data/updated-training-data.csv',
            session.fetch
        );
        console.log('Training data updated at:', updatedFileUrl);

        // Example: Fetch all training data files
        await fetchAllTrainingData('./downloaded-training-data', session.fetch);
        
        await session.logout();
    } catch (error) {
        console.error('Error in training data operations:', error);
    }
} 