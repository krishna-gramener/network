import { network } from "https://cdn.jsdelivr.net/npm/@gramex/network@2";
import { kpartite } from "https://cdn.jsdelivr.net/npm/@gramex/network@2/dist/kpartite.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";

const fileInput = document.getElementById("fileInput");
const controls = document.getElementById("controls");
const cards=document.querySelectorAll(".card");
const DescriptionBox=document.getElementById("description-box");

const values={

  "author":{
    title:'Co-authors',
    description:'"Coauthors" presents a graph visualizing the collaborative relationships between authors and co-authors in Arxiv papers focused on Large Language Models (LLMs), highlighting key contributors and their research networks.'
  },

  "rbc":{
    title:'Religion by Country',
    description:'"Religion by Country" displays a network graph that explores the distribution and relationships of religions practiced across different countries, offering insights into cultural and religious diversity worldwide.'
  },

  "flight":{

    title:'Flights by Airport 2023',
    description:'Analyze the network to gain insights into flights arriving at a specific airport.'
  }

}

cards.forEach((card)=>{

  card.addEventListener("click",()=>{

    DescriptionBox.classList.remove("d-none");
    const val=card.getAttribute("data-card");
    const title=values[val].title;
    const description=values[val].description;
    // console.log(title," ",description);
    document.getElementById("title").innerHTML=title;
    document.getElementById("description").innerHTML=description;
  })
})

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
    console.log(nodeLinks.links);
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
