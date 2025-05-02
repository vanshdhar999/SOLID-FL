import { Session } from '@inrupt/solid-client-authn-node';
import { createContainer, saveFileToPod } from './utils/solidFileOperations.js';
import { SERVER_CONFIG, CLIENT_CONFIG } from './config/flConfig.js';

async function setupPods() {
    try {
        // Setup server pod
        console.log('Setting up server pod...');
        const serverSession = new Session();
        await serverSession.login({
            clientId: SERVER_CONFIG.CLIENT_ID,
            clientSecret: SERVER_CONFIG.CLIENT_SECRET,
            oidcIssuer: "https://login.inrupt.com",
            tokenType: "DPoP",
            grantType: "client_credentials"
        });

        if (!serverSession.info.isLoggedIn) {
            throw new Error("Failed to log in to the Server Pod");
        }

        // Create server container
        await createContainer(SERVER_CONFIG.POD_URL, SERVER_CONFIG.CONTAINER, serverSession.fetch);
        console.log('Server container created');

        // Setup client pods
        for (const [index, config] of CLIENT_CONFIG.entries()) {
            console.log(`Setting up client ${index + 1} pod...`);
            const clientSession = new Session();
            await clientSession.login({
                clientId: config.CLIENT_ID,
                clientSecret: config.CLIENT_SECRET,
                oidcIssuer: "https://login.inrupt.com",
                tokenType: "DPoP",
                grantType: "client_credentials"
            });

            if (!clientSession.info.isLoggedIn) {
                throw new Error(`Failed to log in to Client ${index + 1} Pod`);
            }

            // Create client container
            await createContainer(config.POD_URL, config.CONTAINER, clientSession.fetch);
            console.log(`Client ${index + 1} container created`);

            // Create training data container
            await createContainer(config.POD_URL, 'training-data/', clientSession.fetch);
            console.log(`Client ${index + 1} training data container created`);

            // Save sample training data
            const sampleData = `feature1,feature2,label
1.0,2.0,0
2.0,3.0,1
3.0,4.0,0
4.0,5.0,1
5.0,6.0,0`;
            
            const trainingDataContainer = `${config.POD_URL}training-data/`;
            await saveFileToPod(
                trainingDataContainer,
                sampleData,
                'text/csv',
                `client${index + 1}_data.csv`,
                clientSession.fetch
            );
            console.log(`Client ${index + 1} sample training data saved`);

            await clientSession.logout();
        }

        await serverSession.logout();
        console.log('Setup completed successfully!');
        
    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

// Run the setup
setupPods(); 