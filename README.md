# Network Explorer

Network Explorer is a visual interface for exploring knowledge graphs and network relationships. It allows users to upload CSV files or use predefined datasets to visualize and analyze network connections.

## Features

- Interactive network visualization
- Customizable source, target, and metric selection
- Drag and drop CSV file upload
- Predefined demo datasets
- Adjustable threshold filtering
- Dark mode support

## Live Demo

You can try out the live version of Network Explorer at [network.straive.app](https://network.straive.app).

## Usage

1. **Upload Data**:

   - The CSV file should contain at least two columns representing the source and target nodes of the network.
   - An optional third column can be used as a metric to weight the connections.
   - Drag and drop a CSV file onto the designated area, or click to select a file.
   - Alternatively, click on one of the provided demo datasets.

2. **Configure Visualization**:

   - Select the source and target columns from your data.
   - Optionally, choose a metric column for weighting connections.
   - Adjust the threshold slider to filter connections.

3. **Explore the Network**:

   - Interact with the network visualization by dragging nodes.
   - Hover over nodes to see additional information.
   - Use the brush tool to select multiple nodes and view details in the sidebar.

4. **Toggle Dark Mode**:
   - Use the theme toggle in the top-right corner to switch between light, dark, and auto modes.

## Setup

To set up the Network Explorer locally:

1. Clone the repository:

   ```
   git clone https://github.com/gramener/network.git
   cd network
   ```

2. Serve the files using a local web server. For example, using Python:

   ```
   python -m http.server 8000
   ```

3. Open a web browser and navigate to `http://localhost:8000`.

## Technologies Used

- [D3.js](https://d3js.org/) for data visualization
- [Bootstrap](https://getbootstrap.com/) for styling
- [lit-html](https://lit.dev/docs/libraries/standalone-templates/) for templating
- [@gramex/network](https://www.npmjs.com/package/@gramex/network) for network layout calculations

## Contributing

Contributions to Network Explorer are welcome! Please submit issues and pull requests through the [GitHub repository](https://github.com/gramener/network).

## License

This project is licensed under the MIT License. See the LICENSE file for details.
