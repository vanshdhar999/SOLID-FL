import { fetchFilesFromPod } from '../utils/solidFileOperations.js';
import { Session } from '@inrupt/solid-client-authn-node';
import path from 'path';

async function testFetchFiles() {
    try {
        // Initialize session
        const session = new Session();
        
        // Login to your Pod
        await session.login({
            clientId: "5af30133-90e8-43e7-897f-30c4b9b0ab58",
            clientSecret: "5c29d956-daad-4923-980f-31dba1c9eb01",
            oidcIssuer: "https://login.inrupt.com",
        });

        if (!session.info.isLoggedIn) {
            throw new Error("Not logged in");
        }

        // Your Pod URL and container path
        const podUrl = "https://storage.ap.inrupt.com/e259ad49-19b1-415f-836b-6f704fc67ec8/";
        const containerPath = "test-files/";
        const containerURL = `${podUrl}${containerPath}`;

        // Local directory to save files
        const localDir = path.join(process.cwd(), 'downloaded-files');

        // Fetch and save files
        await fetchFilesFromPod(containerURL, localDir, session.fetch);
        
        console.log('Test completed successfully');
    } catch (error) {
        console.error('Error in test:', error);
    }
}

// Run the test
testFetchFiles(); 