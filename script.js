import {
  network
} from "https://cdn.jsdelivr.net/npm/@gramex/network@2";
import {
  kpartite
} from "https://cdn.jsdelivr.net/npm/@gramex/network@2/dist/kpartite.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import {
  render,
  html
} from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";

const fileInput = document.getElementById("fileInput");
const controls = document.getElementById("controls");
const descriptionBox = document.getElementById("description-box");
const demosDiv = document.getElementById("demos");

let demosArray = [];

async function handleCardClick(event) {
  const target = event.target.closest('.demo');
  if (!target) return;

  const index = target.getAttribute('data-index');
  descriptionBox.classList.remove('d-none');
  document.getElementById('title').textContent = demosArray[index].title;
  document.getElementById('description').textContent = demosArray[index].description;

  event.preventDefault(); // Prevent default action if target is valid

  // Fetch CSV data
  const csvData = await fetch(target.href).then((response) => response.text());
  processCSVData(csvData);

  // Update the URL with all parameters only if cardId has changed
  const currentCardId = new URLSearchParams(window.location.search).get("cardId");
  if (currentCardId !== index) {
    updateURL({
      cardId: index,
      source: document.getElementById("sourceSelect").value,
      target: document.getElementById("targetSelect").value,
      metric: document.getElementById("metricSelect").value,
      threshold: 0.5
    });
  }
}


const fetchAndRenderDemos = async () => {
  try {
    const { demos } = await (await fetch("config.json")).json();
    demosArray = demos;

    render(
      demos.map((demo, index) => html`
        <div class="col py-3">
          <a class="demo card h-100 text-decoration-none" data-index="${index}" href="${demo.href}">
            <div class="card-body">
              <h5 class="card-title">${demo.title}</h5>
              <p class="card-text">${demo.overview}</p>
            </div>
          </a>
        </div>
      `), demosDiv
    );

    const urlParams = new URLSearchParams(window.location.search);
    const cardId = urlParams.get("cardId");
    
    // Pre-select the card and controls based on URL parameters
    if (cardId !== null) {
      const targetCard = demosDiv.querySelector(`.demo[data-index="${cardId}"]`);
      if (targetCard) {
        targetCard.click(); // Simulate a click to load the demo data
        setTimeout(() => {
          ['source', 'target', 'metric'].forEach(param => {
            const value = urlParams.get(param);
            if (value !== null) document.getElementById(`${param}Select`).value = value;
          });

          const threshold = urlParams.get("threshold");
          if (threshold !== null) {
            const thresholdRange = document.getElementById("thresholdRange");
            thresholdRange.value = threshold;
            document.getElementById("thresholdValue").textContent = `${Math.round(threshold * 100)}%`;
          }

          // Update the network after setting values
          updateNetwork();
        }, 100);
      }
    }
  } catch (error) {
    console.error('Error fetching config.json:', error);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderDemos();
  fileInput.addEventListener("change", handleFileUpload);
  demosDiv.addEventListener("click", handleCardClick); // Apply URL parameters to controls and trigger the appropriate output
});

let data, nodeLinks;

function handleFileUpload(event) {
  const file = event.target.files[0];
  descriptionBox.classList.toggle('d-none', file);
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => processCSVData(e.target.result);
    reader.readAsText(file);
  } else {
    controls.innerHTML = "";
  }
}

function processCSVData(csvContent) {
  data = d3.csvParse(csvContent);
  renderControls(data.columns);
}

const nodeColor = (d) => (d.key == "source" ? "rgba(255,0,0,0.5)" : "rgba(0,0,255,0.5)");

function renderControls(headers) {
  headers = headers.filter((d) => d.trim());
  const controlsTemplate = html `
    <form class="row g-3 align-items-center">
      <div class="col-md-2">
        <label for="sourceSelect" class="form-label">Source</label>
        <select id="sourceSelect" name="source" class="form-select">
          ${headers.map(
            (header, index) => html` <option value="${header}" ?selected=${index === 0}>${header}</option> `
          )}
        </select>
      </div>
      <div class="col-md-2">
        <label for="targetSelect" class="form-label">Target</label>
        <select id="targetSelect" name="target" class="form-select">
          ${headers.map(
            (header, index) => html` <option value="${header}" ?selected=${index === 1}>${header}</option> `
          )}
        </select>
      </div>
      <div class="col-md-2">
        <label for="metricSelect" class="form-label">Metric</label>
        <select id="metricSelect" name="metric" class="form-select">
          <option selected value="">Count</option>
          ${headers.map((header) => html`<option value="${header}">${header}</option>`)}
        </select>
      </div>
      <div class="col-md-6">
        <label for="thresholdRange" class="form-label">Threshold</label>
        <div class="d-flex">
          <input type="range" class="form-range" id="thresholdRange" min="0" max="1" step="0.01" value="0.5" />
          <span id="thresholdValue" class="ms-2 text-end" style="width: 3em">50%</span>
        </div>
      </div>
    </form>
  `;

  render(controlsTemplate, controls);
  updateNetwork();

  // Add event listener for the range input
  const thresholdRange = document.getElementById("thresholdRange");
  const thresholdValue = document.getElementById("thresholdValue");
  thresholdRange.addEventListener("input", (e) => {
    thresholdValue.textContent = `${Math.round(e.target.value * 100)}%`;
    drawNetwork();
  });
}

controls.addEventListener("change", (e) => {
  const updateParams = {
    sourceSelect: "source",
    targetSelect: "target",
    metricSelect: "metric",
    thresholdRange: "threshold"
  };

  const param = updateParams[e.target.id];
  if (param) {
    updateURL({ [param]: e.target.value });
    updateNetwork();
  }
});

function updateNetwork() {
  const source = document.getElementById("sourceSelect").value;
  const target = document.getElementById("targetSelect").value;
  const metric = document.getElementById("metricSelect").value;

  if (source && target) {
    nodeLinks = kpartite(data, {
      source,
      target
    }, {
      metric: metric || 1
    });
    nodeLinks.nodes.forEach((node) => (node.value = JSON.parse(node.id)[1]));
    nodeLinks.links.sort((a, b) => b.metric - a.metric);
    nodeLinks.links.forEach((link, index) => (link._rank = index));
  }
  drawNetwork();
}

function drawNetwork() {
  const {
    nodes,
    links
  } = nodeLinks;
  const threshold = +document.getElementById("thresholdRange").value;
  const filteredLinks = links.filter((link) => link._rank / links.length >= threshold);
  const graph = network("#network", {
    nodes,
    links: filteredLinks,
    brush,
    d3
  });

  graph.nodes
    .attr("fill", nodeColor)
    .attr("r", 5)
    .append("title")
    .text((d) => `${d.id}: ${d.metric}`);

  graph.links.attr("stroke", "rgba(var(--bs-body-color-rgb),0.2)");
}

function brush(nodes) {
  const cols = {
    source: document.getElementById("sourceSelect").value,
    target: document.getElementById("targetSelect").value,
  };
  const listGroupTemplate = html `
    <ul class="list-group">
      ${nodes.map(
        (node) => html`
          <li
            class="list-group-item d-flex justify-content-between align-items-center"
            style="background-color: ${nodeColor(node)}"
          >
            ${node.value || "-"}
            <span class="badge bg-${node.key === "source" ? "danger" : "primary"} rounded-pill">
              ${cols[node.key]}
            </span>
          </li>
        `
      )}
    </ul>
  `;
  render(listGroupTemplate, document.getElementById("selection"));
}

function updateURL(params) {
  const url = new URL(window.location);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, value);
  });

  window.history.pushState({}, '', url);
}
