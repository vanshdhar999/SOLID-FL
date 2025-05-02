import { Session } from '@inrupt/solid-client-authn-node';
import { writeFile } from 'fs/promises';

// Configuration
const config = {
    podUrl: 'https://storage.ap.inrupt.com/dd6cd4bc-f5c8-4da0-93a7-28a84df7edbd/',
    webId: 'https://id.inrupt.com/vanshdhar',
    clientId: '65d6a5f1-6998-4518-b048-7caa7b79a893',
    clientSecret: 'e94f0702-112d-46cd-8689-02ae3adcffff',
    walletBaseUrl: 'https://datawallet.inrupt.com',
    oidcIssuer: 'https://login.inrupt.com'
};

class WalletResourceFetcher {
    constructor() {
        this.metrics = {
            listResources: [],
            getResource: [],
            errors: []
        };
    }

    startTimer() {
        return process.hrtime();
    }

    endTimer(startTime) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    }

    async saveToFile(data, filename = 'wallet_resources.json') {
        try {
            await writeFile(filename, JSON.stringify(data, null, 2));
            console.log(`Wallet resources saved to ${filename}`);
        } catch (error) {
            console.error('Error saving wallet resources:', error);
        }
    }

    async fetchWalletResources(session) {
        try {
            // List all resources in the wallet
            console.log('Fetching list of resources from wallet...');
            const listStart = this.startTimer();
            const listResponse = await session.fetch(`${config.walletBaseUrl}/wallet`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Failed to list resources: ${listResponse.status} ${errorText}`);
            }

            const resources = await listResponse.json();
            this.metrics.listResources.push(this.endTimer(listStart));

            console.log(`Found ${resources.length} resources in wallet`);

            // Fetch details for each resource
            const resourceDetails = [];
            for (const resource of resources) {
                console.log(`Fetching details for resource: ${resource.identifier}`);
                const getStart = this.startTimer();
                
                try {
                    const resourceResponse = await session.fetch(`${config.walletBaseUrl}/wallet/${resource.identifier}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!resourceResponse.ok) {
                        const errorText = await resourceResponse.text();
                        throw new Error(`Failed to fetch resource ${resource.identifier}: ${resourceResponse.status} ${errorText}`);
                    }

                    const resourceData = await resourceResponse.json();
                    resourceDetails.push({
                        identifier: resource.identifier,
                        data: resourceData,
                        metadata: {
                            fetchedAt: new Date().toISOString(),
                            size: JSON.stringify(resourceData).length
                        }
                    });
                } catch (error) {
                    console.error(`Error fetching resource ${resource.identifier}:`, error);
                    this.metrics.errors.push({
                        resource: resource.identifier,
                        error: error.message
                    });
                }

                this.metrics.getResource.push(this.endTimer(getStart));
            }

            // Save the fetched resources
            await this.saveToFile({
                timestamp: new Date().toISOString(),
                totalResources: resources.length,
                resources: resourceDetails,
                metrics: {
                    listResources: {
                        min: Math.min(...this.metrics.listResources),
                        max: Math.max(...this.metrics.listResources),
                        avg: this.metrics.listResources.reduce((a, b) => a + b, 0) / this.metrics.listResources.length
                    },
                    getResource: {
                        min: Math.min(...this.metrics.getResource),
                        max: Math.max(...this.metrics.getResource),
                        avg: this.metrics.getResource.reduce((a, b) => a + b, 0) / this.metrics.getResource.length
                    },
                    errors: this.metrics.errors
                }
            });

            return resourceDetails;
        } catch (error) {
            console.error('Error fetching wallet resources:', error);
            throw error;
        }
    }
}

async function testWalletResourceFetch() {
    console.log('Starting Wallet Resource Fetch Test...');
    const fetcher = new WalletResourceFetcher();
    const session = new Session();

    try {
        // Login to pod
        await session.login({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            oidcIssuer: config.oidcIssuer,
            tokenType: "DPoP",
            grantType: "client_credentials"
        });

        if (!session.info.isLoggedIn) {
            throw new Error("Failed to log in to the Pod");
        }

        // Fetch resources
        const resources = await fetcher.fetchWalletResources(session);
        
        console.log('\nWallet Resource Fetch Test completed successfully!');
        console.log(`Fetched ${resources.length} resources from wallet`);
        
    } catch (error) {
        console.error('Error during Wallet Resource Fetch Test:', error);
        throw error;
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await session.logout();
    }
}

// Run the test
testWalletResourceFetch().catch(error => {
    console.error('Wallet Resource Fetch Test failed:', error);
    process.exit(1);
}); 