import { Session } from '@inrupt/solid-client-authn-node';
import { readFileFromPod, saveFileToPod, createContainerInPod } from '../utils/solidFileOperations.js';

class FLServer {
    constructor(config) {
        this.session = new Session();
        this.config = config;
        this.clientPods = new Map(); // Map to store client pod URLs and their WebIDs
        this.globalModel = null;
        this.roundNumber = 0;
        this.trainingContainer = 'fl-training/';
    }

    async initialize() {
        try {
            // First, ensure we're logged out
            if (this.session.info.isLoggedIn) {
                await this.session.logout();
            }

            // Login with proper configuration
            await this.session.login({
                clientId: this.config.serverClientId,
                clientSecret: this.config.serverClientSecret,
                oidcIssuer: "https://login.inrupt.com",
                tokenType: "DPoP",
                grantType: "client_credentials",
                redirectUrl: "http://localhost:3000/callback"
            });

            if (!this.session.info.isLoggedIn) {
                throw new Error("Server failed to log in");
            }

            console.log("Server logged in successfully");

            // Initialize training container
            const containerUrl = await createContainerInPod(
                this.config.serverPodUrl,
                this.trainingContainer,
                this.session.fetch
            );
            console.log("Training container created at:", containerUrl);

            console.log("FL Server initialized successfully");
        } catch (error) {
            console.error("Error initializing FL server:", error);
            throw error;
        }
    }

    async registerClient(clientPodUrl, clientWebId) {
        try {
            // Ensure client pod URL ends with /
            clientPodUrl = clientPodUrl.endsWith('/') ? clientPodUrl : clientPodUrl + '/';
            this.clientPods.set(clientWebId, clientPodUrl);
            console.log(`Registered client with WebID: ${clientWebId}`);
        } catch (error) {
            console.error(`Error registering client ${clientWebId}:`, error);
            throw error;
        }
    }

    async collectClientUpdates() {
        const updates = [];
        for (const [clientWebId, podUrl] of this.clientPods.entries()) {
            try {
                const modelPath = `${podUrl}${this.trainingContainer}local_model_${this.roundNumber}.json`;
                const modelData = await readFileFromPod(modelPath, this.session.fetch);
                updates.push(JSON.parse(modelData));
                console.log(`Collected update from client: ${clientWebId}`);
            } catch (error) {
                console.error(`Error collecting update from ${clientWebId}:`, error);
                // Continue with other clients even if one fails
            }
        }
        return updates;
    }

    async aggregateUpdates(updates) {
        if (updates.length === 0) {
            console.log("No updates to aggregate");
            return;
        }

        try {
            // Simple FedAvg implementation
            const numModels = updates.length;
            const aggregated = {};
            
            // Sum all parameters
            for (const update of updates) {
                for (const [key, value] of Object.entries(update)) {
                    if (!aggregated[key]) {
                        aggregated[key] = Array.isArray(value) ? new Array(value.length).fill(0) : 0;
                    }
                    
                    if (Array.isArray(value)) {
                        for (let i = 0; i < value.length; i++) {
                            aggregated[key][i] += value[i] / numModels;
                        }
                    } else {
                        aggregated[key] += value / numModels;
                    }
                }
            }

            this.globalModel = aggregated;
            this.roundNumber++;

            // Save global model to server's pod
            await this.saveGlobalModel();
            console.log("Global model updated - Round", this.roundNumber);
        } catch (error) {
            console.error("Error aggregating updates:", error);
            throw error;
        }
    }

    async saveGlobalModel() {
        try {
            const modelPath = `${this.config.serverPodUrl}${this.trainingContainer}`;
            await saveFileToPod(
                modelPath,
                JSON.stringify(this.globalModel),
                'application/json',
                `global_model_${this.roundNumber}.json`,
                this.session.fetch
            );
            console.log("Global model saved successfully");
        } catch (error) {
            console.error("Error saving global model:", error);
            throw error;
        }
    }

    async shutdown() {
        try {
            await this.session.logout();
            console.log("FL Server shut down");
        } catch (error) {
            console.error("Error shutting down server:", error);
            throw error;
        }
    }
}

export default FLServer; 