// glucose-zones-enhanced.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const margin = { top: 40, right: 20, bottom: 40, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("#zone-graph")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]).domain([50, 230]);

const line = d3.line()
  .x(d => x(d.datetime))
  .y(d => y(d.glucose))
  .curve(d3.curveMonotoneX);

const zoneDefs = [
  { label: "Normal", min: 70, max: 99, color: "#d1fae5", text: "Healthy regulation < 100 mg/dL" },
  { label: "Prediabetic", min: 100, max: 125, color: "#fef3c7", text: "At risk: 100–125 mg/dL" },
  { label: "Diabetic", min: 126, max: 230, color: "#fee2e2", text: "Elevated: ≥ 126 mg/dL" }
];

function drawZones() {
  zoneDefs.forEach(zone => {
    svg.append("rect")
      .attr("x", 0)
      .attr("y", y(zone.max))
      .attr("width", width)
      .attr("height", y(zone.min) - y(zone.max))
      .attr("fill", zone.color)
      .attr("opacity", 0.4);
  });
}

function loadFastingParticipant() {
  d3.json("../data/01_full_day.json").then(data => {
    const parseTime = d3.timeParse("%H:%M:%S");

    const fasting = data.map(d => {
      const parsed = parseTime(d.time); 
      return parsed ? {
        datetime: parsed,
        glucose: d.glucose,
        logged_food: d.logged_food
      } : null;
    }).filter(d => {
      if (!d) return false;
      const hour = d.datetime.getHours();
      const min = d.datetime.getMinutes();
      const timeInHours = hour + min / 60;
      return d.logged_food === "" && timeInHours >= 12.58 && timeInHours <= 20.92;
    });

    x.domain(d3.extent(fasting, d => d.datetime));  

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(d3.timeHour.every(1)).tickFormat(d3.timeFormat("%-I:%M %p")));

    svg.append("g")
      .call(d3.axisLeft(y));

    drawZones();

    svg.append("path")
      .datum(fasting)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);
  });
}


loadFastingParticipant();
