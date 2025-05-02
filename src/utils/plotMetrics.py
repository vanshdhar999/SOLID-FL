import json
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from pathlib import Path
import argparse
import sys

def load_metrics(file_path):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find metrics file at {file_path}")
        print("Please ensure the metrics file exists or specify a different path using --input")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in {file_path}")
        sys.exit(1)

def setup_plotting_style():
    """Set up consistent plotting style"""
    plt.style.use('default')  # Use default style as base
    sns.set_theme(style="whitegrid")  # Add grid
    sns.set_palette("husl")  # Set color palette
    plt.rcParams['figure.figsize'] = [10, 6]  # Default figure size
    plt.rcParams['font.size'] = 12  # Default font size
    plt.rcParams['axes.labelsize'] = 14  # Axis label size
    plt.rcParams['axes.titlesize'] = 16  # Title size

def create_latency_plots(metrics, output_dir='plots'):
    try:
        # Create output directory if it doesn't exist
        Path(output_dir).mkdir(exist_ok=True)
        
        # Set up plotting style
        setup_plotting_style()
        
        # Prepare data for latency plots
        operations = ['create', 'read', 'update', 'delete']
        file_types = ['csv', 'json', 'txt']
        
        # Create a figure with subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('CRUD Operation Latencies by File Type', fontsize=16)
        
        # Flatten axes for easier iteration
        axes = axes.flatten()
        
        for i, operation in enumerate(operations):
            data = []
            for file_type in file_types:
                stats = metrics['fileOperations'][operation][file_type]
                data.append({
                    'File Type': file_type.upper(),
                    'Min': stats['min'],
                    'Max': stats['max'],
                    'Average': stats['avg']
                })
            
            df = pd.DataFrame(data)
            ax = axes[i]
            
            # Create bar plot
            x = range(len(file_types))
            width = 0.25
            
            ax.bar([i - width for i in x], df['Min'], width, label='Min')
            ax.bar(x, df['Average'], width, label='Average')
            ax.bar([i + width for i in x], df['Max'], width, label='Max')
            
            ax.set_title(f'{operation.capitalize()} Operation')
            ax.set_xticks(x)
            ax.set_xticklabels(df['File Type'])
            ax.set_ylabel('Latency (ms)')
            ax.legend()
            
            # Add value labels
            for j, (min_val, avg_val, max_val) in enumerate(zip(df['Min'], df['Average'], df['Max'])):
                ax.text(j - width, min_val, f'{min_val:.1f}', ha='center', va='bottom')
                ax.text(j, avg_val, f'{avg_val:.1f}', ha='center', va='bottom')
                ax.text(j + width, max_val, f'{max_val:.1f}', ha='center', va='bottom')
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/crud_latencies.png', dpi=300, bbox_inches='tight')
        plt.close()
    except Exception as e:
        print(f"Error creating latency plots: {str(e)}")
        sys.exit(1)

def create_transfer_rate_plot(metrics, output_dir='plots'):
    try:
        # Prepare data for transfer rate plot
        file_types = ['csv', 'json', 'txt']
        operations = ['create', 'read']
        
        data = []
        for file_type in file_types:
            for operation in operations:
                rate = metrics['transferRates'][file_type][operation]
                data.append({
                    'File Type': file_type.upper(),
                    'Operation': operation.capitalize(),
                    'Transfer Rate': rate
                })
        
        df = pd.DataFrame(data)
        
        # Create bar plot
        plt.figure(figsize=(10, 6))
        sns.barplot(x='File Type', y='Transfer Rate', hue='Operation', data=df)
        plt.title('Transfer Rates by File Type and Operation', fontsize=14)
        plt.ylabel('Transfer Rate (KB/s)')
        
        # Add value labels
        for i, rate in enumerate(df['Transfer Rate']):
            plt.text(i, rate, f'{rate:.2f}', ha='center', va='bottom')
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/transfer_rates.png', dpi=300, bbox_inches='tight')
        plt.close()
    except Exception as e:
        print(f"Error creating transfer rate plot: {str(e)}")
        sys.exit(1)

def create_file_size_plot(metrics, output_dir='plots'):
    try:
        # Prepare data for file size plot
        file_types = ['csv', 'json', 'txt']
        sizes = [metrics['fileOperations']['fileSizes'][ft] for ft in file_types]
        
        # Create bar plot
        plt.figure(figsize=(8, 6))
        bars = plt.bar(file_types, sizes)
        plt.title('File Sizes by Type', fontsize=14)
        plt.ylabel('Size (bytes)')
        
        # Add value labels
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height} bytes',
                    ha='center', va='bottom')
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/file_sizes.png', dpi=300, bbox_inches='tight')
        plt.close()
    except Exception as e:
        print(f"Error creating file size plot: {str(e)}")
        sys.exit(1)

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Generate plots from metrics data')
    parser.add_argument('--input', '-i', default='metrics_report.json',
                      help='Path to the metrics JSON file (default: metrics_report.json)')
    parser.add_argument('--output', '-o', default='plots',
                      help='Directory to save the plots (default: plots)')
    args = parser.parse_args()
    
    try:
        # Load metrics
        metrics = load_metrics(args.input)
        
        # Create plots
        create_latency_plots(metrics, args.output)
        create_transfer_rate_plot(metrics, args.output)
        create_file_size_plot(metrics, args.output)
        
        print(f"Plots have been generated in the '{args.output}' directory")
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 