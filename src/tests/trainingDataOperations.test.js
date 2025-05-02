import { saveTrainingData, readTrainingData, updateTrainingData, fetchAllTrainingData } from '../utils/trainingDataOperations.js';
import { Session } from '@inrupt/solid-client-authn-node';
import fs from 'fs';
import path from 'path';

async function testTrainingDataOperations() {
    try {
        // Initialize session
        const session = new Session();
        await session.login({
            clientId: "5af30133-90e8-43e7-897f-30c4b9b0ab58",
            clientSecret: "5c29d956-daad-4923-980f-31dba1c9eb01",
            oidcIssuer: "https://login.inrupt.com",
        });

        if (!session.info.isLoggedIn) {
            throw new Error("Not logged in");
        }

        // Create a sample CSV file
        const sampleData = `feature1,feature2,label
1.0,2.0,0
2.0,3.0,1
3.0,4.0,0`;
        
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        
        const csvPath = path.join(tempDir, 'sample.csv');
        fs.writeFileSync(csvPath, sampleData);

        // Test saving training data
        const savedFileUrl = await saveTrainingData(
            'sample.csv',
            csvPath,
            session.fetch
        );
        console.log('Training data saved at:', savedFileUrl);

        // Test reading training data
        const trainingData = await readTrainingData(savedFileUrl, session.fetch);
        console.log('Read training data:', trainingData);

        // Test updating training data
        const updatedData = `feature1,feature2,label
1.0,2.0,0
2.0,3.0,1
3.0,4.0,0
4.0,5.0,1`;
        
        const updatedCsvPath = path.join(tempDir, 'updated.csv');
        fs.writeFileSync(updatedCsvPath, updatedData);

        const updatedFileUrl = await updateTrainingData(
            savedFileUrl,
            updatedCsvPath,
            session.fetch
        );
        console.log('Training data updated at:', updatedFileUrl);

        // Test fetching all training data
        const downloadDir = path.join(process.cwd(), 'downloaded-training-data');
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir);
        }

        await fetchAllTrainingData(downloadDir, session.fetch);
        console.log('All training data files downloaded to:', downloadDir);

        // Cleanup
        fs.unlinkSync(csvPath);
        fs.unlinkSync(updatedCsvPath);
        fs.rmdirSync(tempDir);

        await session.logout();
        console.log('Test completed successfully');
    } catch (error) {
        console.error('Error in test:', error);
    }
}

// Run the test
testTrainingDataOperations(); 