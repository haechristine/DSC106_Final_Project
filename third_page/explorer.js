import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg = d3.select("#chart");
const margin = { top: 60, right: 0, bottom: 40, left: 60 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;
const chartGroup = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

const line = d3.line()
  .x(d => x(d.datetime))
  .y(d => y(d.glucose))
  .curve(d3.curveMonotoneX);

const xAxis = chartGroup.append("g").attr("transform", `translate(0,${height})`);
const yAxis = chartGroup.append("g");

const personSelect = document.getElementById("person-select");
personSelect.addEventListener("change", () => loadData(personSelect.value));

loadData("01");

function loadData(personId) {
  d3.json(`../data/${personId}_full_day_time_only.json`).then(data => {
    data = data.filter(d => d.glucose && d.datetime);
    data.forEach(d => {
      // Use dummy date so D3 can treat time as a Date object
      d.datetime = d3.timeParse("%H:%M:%S")(d.datetime);
    });

    x.domain(d3.extent(data, d => d.datetime));
    y.domain([60, 220]);

    xAxis.transition().duration(1000).call(
      d3.axisBottom(x).ticks(d3.timeHour.every(2)).tickFormat(d3.timeFormat("%-I %p"))
    );
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    chartGroup.selectAll(".range-shade").remove();
    chartGroup.append("rect")
      .attr("class", "range-shade")
      .attr("x", 0)
      .attr("width", width)
      .attr("y", y(100))
      .attr("height", y(70) - y(100))
      .style("fill", "#d1fae5")
      .style("opacity", 0.3);

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

    chartGroup.selectAll(".hover-overlay").remove();

    const hoverDot = chartGroup.append("circle")
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

        tooltip.transition().duration(100).style("opacity", 0.95);
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

    chartGroup.selectAll(".data-point").remove();
    chartGroup.selectAll(".food-label").remove();
  });
}
