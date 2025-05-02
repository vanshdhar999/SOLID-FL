import torch
import torch.nn as nn
import torch.optim as optim
import json
import sys

class SimpleModel(nn.Module):
    def __init__(self, input_size=2, hidden_size=10, output_size=1):
        super(SimpleModel, self).__init__()
        self.layer1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.layer2 = nn.Linear(hidden_size, output_size)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        x = self.sigmoid(x)
        return x

class FederatedServer:
    def __init__(self):
        self.model = SimpleModel()
        self.criterion = nn.BCELoss()
        
    def get_initial_model(self):
        model_state = {
            k: v.tolist() for k, v in self.model.state_dict().items()
        }
        return json.dumps(model_state)
        
    def aggregate_models(self, client_models):
        # Convert client models to tensors
        client_tensors = []
        for model_json in client_models:
            state_dict = json.loads(model_json)
            state_dict = {k: torch.tensor(v) for k, v in state_dict.items()}
            client_tensors.append(state_dict)
            
        # Average the weights
        averaged_weights = {}
        for key in client_tensors[0].keys():
            averaged_weights[key] = torch.mean(
                torch.stack([client[key] for client in client_tensors]),
                dim=0
            )
            
        # Update global model
        self.model.load_state_dict(averaged_weights)
        
        # Convert model state to JSON for storage
        model_state = {
            k: v.tolist() for k, v in self.model.state_dict().items()
        }
        return json.dumps(model_state)

def main():
    server = FederatedServer()
    
    # Set stdout to be line buffered
    sys.stdout.reconfigure(line_buffering=True)
    
    for line in sys.stdin:
        try:
            data = json.loads(line.strip())
            if data['type'] == 'get_initial_model':
                model_state = server.get_initial_model()
                print(model_state, flush=True)
            elif data['type'] == 'aggregate':
                client_models = data['models']
                aggregated_model = server.aggregate_models(client_models)
                print(aggregated_model, flush=True)
        except Exception as e:
            print(f"Error: {str(e)}", file=sys.stderr, flush=True)

if __name__ == "__main__":
    main() 