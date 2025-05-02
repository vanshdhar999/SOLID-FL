import { FLServer } from './fl/server.js';
import { FLClient } from './fl/client.js';
import { SERVER_CONFIG, CLIENT_CONFIG, TRAINING_CONFIG } from './config/flConfig.js';

async function runFLSystem() {
    try {
        // Initialize server
        console.log('Initializing FL Server...');
        const server = new FLServer(
            SERVER_CONFIG.CLIENT_ID,
            SERVER_CONFIG.CLIENT_SECRET,
            SERVER_CONFIG.POD_URL
        );
        await server.initialize();

        // Initialize clients
        console.log('Initializing FL Clients...');
        const clients = CLIENT_CONFIG.map(config => 
            new FLClient(
                config.CLIENT_ID,
                config.CLIENT_SECRET,
                config.POD_URL
            )
        );
        
        // Initialize all clients
        await Promise.all(clients.map(client => client.initialize()));

        // Get or create initial model
        console.log('Getting or creating initial model...');
        let initialModel;
        try {
            initialModel = await server.getModel();
            console.log('Retrieved existing model from server');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('No existing model found, creating initial model...');
                const initialModel = await server.getInitialModel();
                await server.saveModel(initialModel);
                console.log('Initial model created and saved');
            } else {
                throw error;
            }
        }
        
        // Training loop
        for (let round = 0; round < TRAINING_CONFIG.ROUNDS; round++) {
            console.log(`\nStarting round ${round + 1}/${TRAINING_CONFIG.ROUNDS}`);
            
            // Train each client
            const clientModels = await Promise.all(clients.map(async (client, index) => {
                console.log(`Training client ${index + 1}...`);
                
                // Load training data
                const trainingDataUrl = `${CLIENT_CONFIG[index].POD_URL}training-data/client${index + 1}_data.csv`;
                const trainingData = await client.loadTrainingData(trainingDataUrl);
                
                // Train model
                const updatedModel = await client.trainModel(initialModel);
                
                // Save model
                await client.saveModel(updatedModel);
                
                return updatedModel;
            }));
            
            // Aggregate models on server
            console.log('Aggregating models on server...');
            const newGlobalModel = await server.aggregateModels(clientModels);
            
            // Save new global model
            await server.saveModel(newGlobalModel);
            
            console.log(`Round ${round + 1} completed`);
        }

        // Cleanup
        console.log('\nCleaning up...');
        await server.stop();
        await Promise.all(clients.map(client => client.stop()));
        
        console.log('FL training completed successfully!');
        
    } catch (error) {
        console.error('Error in FL system:', error);
        process.exit(1);
    }
}

// Run the FL system
runFLSystem(); 