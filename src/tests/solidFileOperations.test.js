import { readFileFromPod, saveFileToPod, overwriteFileInPod } from '../utils/solidFileOperations.js';
import { Session } from '@inrupt/solid-client-authn-node';

// Initialize session
const session = new Session();

// Pod configuration
const POD_URL = 'https://storage.ap.inrupt.com/e259ad49-19b1-415f-836b-6f704fc67ec8/';
const TEST_CONTAINER = `${POD_URL}test-files/`;

async function testFileOperations() {
    try {
        // Login to the Pod using client credentials
        await session.login({
            clientId: "5af30133-90e8-43e7-897f-30c4b9b0ab58",
            clientSecret: "5c29d956-daad-4923-980f-31dba1c9eb01",
            oidcIssuer: "https://login.inrupt.com",
            tokenType: "DPoP",
            grantType: "client_credentials"
        });

        if (!session.info.isLoggedIn) {
            throw new Error("Failed to log in to the Pod");
        }

        // Test saving a JSON file
        const jsonFilePath = './test-data.json';
        const jsonFileUrl = await saveFileToPod(
            TEST_CONTAINER,
            jsonFilePath,
            'application/json',
            'test-data.json',
            session.fetch
        );
        console.log('JSON file saved at:', jsonFileUrl);

        // Test saving a text file
        const txtFilePath = './test.txt';
        const txtFileUrl = await saveFileToPod(
            TEST_CONTAINER,
            txtFilePath,
            'text/plain',
            'test.txt',
            session.fetch
        );
        console.log('Text file saved at:', txtFileUrl);

        // Test reading the JSON file
        const jsonFile = await readFileFromPod(jsonFileUrl, session.fetch);
        console.log('Read JSON file:', jsonFile);

        // Test reading the text file
        const txtFile = await readFileFromPod(txtFileUrl, session.fetch);
        console.log('Read text file:', txtFile);

        // Test overwriting the JSON file
        const updatedJsonFilePath = './updated-test-data.json';
        const updatedJsonFileUrl = await overwriteFileInPod(
            jsonFileUrl,
            updatedJsonFilePath,
            'application/json',
            session.fetch
        );
        console.log('JSON file overwritten at:', updatedJsonFileUrl);

    } catch (error) {
        console.error('Error in file operations:', error);
    } finally {
        // Logout
        await session.logout();
    }
}

// Run the tests
testFileOperations(); 