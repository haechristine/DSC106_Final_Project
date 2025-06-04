import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg = d3.select("#chart");
const margin = { top: 60, right: 0, bottom: 40, left: 60 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;
const chartGroup = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip").style("opacity", 0);

const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]).domain([50, 230]);

const line = d3.line()
  .x(d => x(d.datetime))
  .y(d => y(d.glucose))
  .curve(d3.curveMonotoneX);

const xAxis = chartGroup.append("g").attr("transform", `translate(0,${height})`);
const yAxis = chartGroup.append("g").call(d3.axisLeft(y));

const profiles = [
  { id: "01", label: "normal" },
  { id: "10", label: "prediabetic" },
  { id: "04", label: "diabetic" }
];

let currentProfile = null;
let selectedGuess = null;
const guesses = [];

function loadNext() {
  if (guesses.length === profiles.length) {
    document.getElementById("quiz-section").style.opacity = 0.3;

    const scrollMsg = document.getElementById("scroll-msg");
    scrollMsg.style.display = "block";
    scrollMsg.classList.add("fade-in");

    const results = document.getElementById("results-section");
    results.style.display = "block";
    results.classList.add("fade-in");

    showResults();
    return;
  }

  selectedGuess = null;
  document.querySelectorAll(".quiz-btn").forEach(btn => btn.classList.remove("selected"));
  document.getElementById("next-btn").disabled = true;

  const remainingProfiles = profiles.filter(p => !guesses.find(g => g.id === p.id));
  const randomIndex = Math.floor(Math.random() * remainingProfiles.length);
  currentProfile = remainingProfiles[randomIndex];

  d3.json(`../data/${currentProfile.id}_full_day_time_only.json`).then(data => {
    data = data.filter(d => d.glucose && d.datetime);
    data.forEach(d => {
      d.datetime = d3.timeParse("%H:%M:%S")(d.datetime);
    });

    x.domain(d3.extent(data, d => d.datetime));
    xAxis.transition().duration(1000)
      .call(d3.axisBottom(x).ticks(d3.timeHour.every(2)).tickFormat(d3.timeFormat("%-I %p")));

    chartGroup.selectAll(".glucose-line").remove();
    const path = chartGroup.append("path")
      .datum(data)
      .attr("class", "glucose-line")
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2500)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);

    chartGroup.selectAll(".food-line").remove();
    chartGroup.selectAll(".food-line")
      .data(data.filter(d => d.logged_food))
      .enter()
      .append("line")
      .attr("class", "food-line")
      .attr("x1", d => x(d.datetime))
      .attr("x2", d => x(d.datetime))
      .attr("y1", height / 2)
      .attr("y2", height / 2)
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 2")
      .transition()
      .duration(800)
      .attr("y1", 0)
      .attr("y2", height);

    // Tooltip overlay
    chartGroup.selectAll(".hover-overlay").remove();
    chartGroup.selectAll(".hover-dot").remove();

    const hoverDot = chartGroup.append("circle")
      .attr("class", "hover-dot")
      .attr("r", 5)
      .attr("fill", "#3b82f6")
      .style("opacity", 0);

    chartGroup.append("rect")
      .attr("class", "hover-overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, this);
        const bisect = d3.bisector(d => d.datetime).left;
        const x0 = x.invert(mx);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = x0 - d0.datetime > d1.datetime - x0 ? d1 : d0;

        hoverDot
          .attr("cx", x(d.datetime))
          .attr("cy", y(d.glucose))
          .style("opacity", 1);

        tooltip.transition().duration(100).style("opacity", 0.9);
        tooltip.html(
          `<strong>${d3.timeFormat("%-I:%M %p")(d.datetime)}</strong><br/>
           Glucose: ${d.glucose} mg/dL` + (d.logged_food ? `<br/>🍽️ ${d.logged_food}` : "")
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(300).style("opacity", 0);
        hoverDot.style("opacity", 0);
      });
  });
}

document.querySelectorAll(".quiz-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".quiz-btn").forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
    selectedGuess = button.getAttribute("data-answer");
    document.getElementById("next-btn").disabled = false;
  });
});

document.getElementById("next-btn").addEventListener("click", () => {
  if (!selectedGuess || !currentProfile) return;

  guesses.push({
    id: currentProfile.id,
    guess: selectedGuess,
    correctLabel: currentProfile.label
  });

  loadNext();
});

function showResults() {
  const section = d3.select("#results-section");
  section.html("<h3>Results</h3>");

  guesses.forEach(({ id, guess, correctLabel }) => {
    const container = section.append("div")
      .style("margin-bottom", "6rem")
      .style("padding", "1rem")
      .style("background", "#f9fafb")
      .style("border-radius", "16px")
      .style("box-shadow", "0 8px 24px rgba(0, 0, 0, 0.08)");

    container.append("p")
      .html(`<strong>Participant ${id}</strong><br/>
             Your guess: ${guess}<br/>
             Correct label: ${correctLabel}`)
      .style("color", guess === correctLabel ? "#15803d" : "#b91c1c");

    const canvasId = `chart-${id}`;
    container.append("svg")
      .attr("id", canvasId)
      .attr("width", 1000)
      .attr("height", 400);

    renderResultChart(canvasId, id);
  });
}

function renderResultChart(canvasId, personId) {
  d3.json(`../data/${personId}_full_day_time_only.json`).then(data => {
    data = data.filter(d => d.glucose && d.datetime);
    data.forEach(d => {
      d.datetime = d3.timeParse("%H:%M:%S")(d.datetime);
    });

    const svg = d3.select(`#${canvasId}`);
    svg.selectAll("*").remove(); // clear if reused

    svg.attr("viewBox", `0 0 1000 400`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = 1000 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().range([0, width]).domain(d3.extent(data, d => d.datetime));
    const y = d3.scaleLinear().range([height, 0]).domain([50, 230]);

    const line = d3.line()
      .x(d => x(d.datetime))
      .y(d => y(d.glucose))
      .curve(d3.curveMonotoneX);

    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(d3.timeHour.every(2)).tickFormat(d3.timeFormat("%-I %p")));

    g.append("g").call(d3.axisLeft(y));

    // Healthy range background
    g.append("rect")
      .attr("x", 0)
      .attr("y", y(100))
      .attr("width", width)
      .attr("height", y(70) - y(100))
      .attr("fill", "#d1fae5")
      .attr("opacity", 0.35);

    const path = g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);

    // Food marker lines
    g.selectAll(".food-line")
      .data(data.filter(d => d.logged_food))
      .enter()
      .append("line")
      .attr("class", "food-line")
      .attr("x1", d => x(d.datetime))
      .attr("x2", d => x(d.datetime))
      .attr("y1", height / 2)
      .attr("y2", height / 2)
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 2")
      .transition()
      .duration(800)
      .attr("y1", 0)
      .attr("y2", height);

    // Hover dot
    const hoverDot = g.append("circle")
      .attr("r", 5)
      .attr("fill", "#3b82f6")
      .style("opacity", 0);

    // Tooltip (reuses global one)
    g.append("rect")
      .attr("class", "hover-overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, this);
        const bisect = d3.bisector(d => d.datetime).left;
        const x0 = x.invert(mx);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = x0 - d0.datetime > d1.datetime - x0 ? d1 : d0;

        hoverDot
          .attr("cx", x(d.datetime))
          .attr("cy", y(d.glucose))
          .style("opacity", 1);

        d3.select(".tooltip")
          .style("opacity", 0.95)
          .html(
            `<strong>${d3.timeFormat("%-I:%M %p")(d.datetime)}</strong><br/>
             Glucose: ${d.glucose} mg/dL` +
            (d.logged_food ? `<br/>🍽️ ${d.logged_food}` : "")
          )
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        d3.select(".tooltip").transition().duration(300).style("opacity", 0);
        hoverDot.style("opacity", 0);
      });
  });
}

// Start quiz
loadNext();
