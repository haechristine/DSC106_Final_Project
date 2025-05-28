const range = document.getElementById("glucoseRange");
const output = document.getElementById("rangeOutput");

range.addEventListener("input", () => {
  output.textContent = `Glucose: ${range.value} mg/dL`;
});
