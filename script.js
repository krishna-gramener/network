import { network } from "https://cdn.jsdelivr.net/npm/@gramex/network@2";
import { kpartite } from "https://cdn.jsdelivr.net/npm/@gramex/network@2/dist/kpartite.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";

const fileInput = document.getElementById("fileInput");
const controls = document.getElementById("controls");
const $DescriptionBox=document.getElementById("description-box");
const $demos = document.getElementById("demos");

let demosArray;
let clickedCardId='';

function handleCardClick(event) {
      const target = event.currentTarget; // Get the clicked card element
      const index = target.getAttribute('data-index'); // Get the index from the data attribute
      clickedCardId=index;
      // Retrieve the card details from demosArray using index
      const demo = demosArray[index]; // Access the corresponding demo object
      const title = demo.title; // Get the title
      const description = demo.description; // Get the description

      // Log the title and description or perform any desired actions
      console.log(`Card clicked: ${title}`);
      console.log(`Description: ${description}`);

      $DescriptionBox.classList.remove('d-none');
      document.querySelector('#title').textContent=title;
      document.querySelector('#description').textContent=description;
  }

fetch("config.json")
          .then((res) => res.json())
          .then(data => {
              demosArray = data.demos;
              const demoHTML = demosArray.map((demo,index) => {
                  return html`
                      <div class="col py-3">
                          <a class="demo card h-100 text-decoration-none" data-index="${index}" href="${demo.href}">
                              <div class="card-body">
                                  <h5 class="card-title">${demo.title}</h5>
                                  <p class="card-text">${demo.overview}</p>
                              </div>
                          </a>
                      </div>
                  `;
              });

              render(demoHTML, $demos);
            
            const demoCards = $demos.querySelectorAll('.demo'); // Select all card links
            demoCards.forEach(card => {
                card.addEventListener('click', handleCardClick); // Attach the event listener
            });
          })
          .catch(error => {
              console.error('Error fetching config.json:', error); // Handle any errors
          });


let data, nodeLinks;

document.addEventListener("DOMContentLoaded", () => {
  fileInput.addEventListener("change", handleFileUpload);

  // Add event listener for demo clicks
  document.getElementById("demos").addEventListener("click", handleDemoClick);
});

function handleFileUpload(event) {
  const file = event.target.files[0];
  if(!DescriptionBox.classList.contains('d-none')){
      DescriptionBox.classList.add('d-none');
  }
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => processCSVData(e.target.result);
    reader.readAsText(file);
  } else {
    controls.innerHTML = "";
  }
}

async function handleDemoClick(event) {
  const demoLink = event.target.closest(".demo");
  if (demoLink) {
    event.preventDefault();
    processCSVData(await fetch(demoLink.href).then((r) => r.text()));
  }
}

function processCSVData(csvContent) {
  data = d3.csvParse(csvContent);
  renderControls(data.columns);
}

const nodeColor = (d) => (d.key == "source" ? "rgba(255,0,0,0.5)" : "rgba(0,0,255,0.5)");



function renderControls(headers) {
  headers = headers.filter((d) => d.trim());
  const controlsTemplate = html`
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
          <option selected value="Count">Count</option>
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
    updateURL(); // Call updateURL when threshold changes
  });

  // Add event listeners for the dropdowns to update the URL when changed
  const dropdowns = ['sourceSelect', 'targetSelect', 'metricSelect'];
  dropdowns.forEach(id => {
    document.getElementById(id).addEventListener('change', updateURL);
  });


  // Function to update the URL based on the selected values and clicked card

controls.addEventListener("change", (e) => {
  if (e.target.id == "sourceSelect" || e.target.id == "targetSelect" || e.target.id == "metricSelect") updateNetwork();
});

function updateNetwork() {
  const source = document.getElementById("sourceSelect").value;
  const target = document.getElementById("targetSelect").value;
  const metric = document.getElementById("metricSelect").value;

  if (source && target) {
    nodeLinks = kpartite(data, { source, target }, { metric: metric || 1 });
    nodeLinks.nodes.forEach((node) => (node.value = JSON.parse(node.id)[1]));
    nodeLinks.links.sort((a, b) => b.metric - a.metric);
    nodeLinks.links.forEach((link, index) => (link._rank = index));
    // console.log(nodeLinks.links);
  }
  drawNetwork();
}

function drawNetwork() {
  const { nodes, links } = nodeLinks;
  const threshold = +document.getElementById("thresholdRange").value;
  const filteredLinks = links.filter((link) => link._rank / links.length >= threshold);
  const graph = network("#network", { nodes, links: filteredLinks, brush, d3 });

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
  const listGroupTemplate = html`
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

}





