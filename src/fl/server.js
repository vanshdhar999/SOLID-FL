import { Session } from '@inrupt/solid-client-authn-node';
import { saveFileToPod, readFileFromPod } from '../utils/solidFileOperations.js';
import { spawn } from 'child_process';
import { SERVER_CONFIG } from '../config/flConfig.js';

class FLServer {
    constructor(clientId, clientSecret, podUrl) {
        this.session = new Session();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.podUrl = podUrl;
        this.container = `${podUrl}${SERVER_CONFIG.CONTAINER}`;
        this.pythonProcess = spawn('python3', ['src/fl/fl_server.py']);
        
        // Handle Python process errors
        this.pythonProcess.stderr.on('data', (data) => {
            console.error('Python process error:', data.toString());
        });
    }

    async initialize() {
        try {
            await this.session.login({
                clientId: this.clientId,
                clientSecret: this.clientSecret,
                oidcIssuer: "https://login.inrupt.com",
                tokenType: "DPoP",
                grantType: "client_credentials"
            });

            if (!this.session.info.isLoggedIn) {
                throw new Error("Failed to log in to the Server Pod");
            }
            console.log('Server successfully authenticated');
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    async getInitialModel() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for initial model'));
            }, 5000);

            this.pythonProcess.stdout.once('data', (data) => {
                clearTimeout(timeout);
                resolve(data.toString().trim());
            });

            this.pythonProcess.stderr.once('data', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.toString()));
            });

            this.pythonProcess.stdin.write(JSON.stringify({
                type: 'get_initial_model'
            }) + '\n');
        });
    }

    async saveModel(modelState) {
        const modelPath = `${this.container}global_model.json`;
        await saveFileToPod(
            this.container,
            modelState,
            'application/json',
            'global_model.json',
            this.session.fetch
        );
        return modelPath;
    }

    async getModel() {
        try {
            const modelPath = `${this.container}global_model.json`;
            return await readFileFromPod(modelPath, this.session.fetch);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('No existing model found, creating initial model...');
                const initialModel = await this.getInitialModel();
                await this.saveModel(initialModel);
                return initialModel;
            }
            throw error;
        }
    }

    async aggregateModels(clientModels) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for model aggregation'));
            }, 5000);

            this.pythonProcess.stdout.once('data', (data) => {
                clearTimeout(timeout);
                resolve(data.toString().trim());
            });

            this.pythonProcess.stderr.once('data', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.toString()));
            });

            this.pythonProcess.stdin.write(JSON.stringify({
                type: 'aggregate',
                models: clientModels
            }) + '\n');
        });
    }

    async stop() {
        this.pythonProcess.kill();
        await this.session.logout();
    }
}

export { FLServer }; 