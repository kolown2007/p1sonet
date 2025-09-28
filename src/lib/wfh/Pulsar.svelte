<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  onMount(() => {
    const svg = d3
      .select("#pulsar-svg")
      .attr("width", 200)
      .attr("height", 200);

    const circlesData = [40, 60, 80];

    const animateCircles = () => {
      svg
        .selectAll("circle")
        .data(circlesData)
        .join("circle")
        .attr("cx", 100)
        .attr("cy", 100)
        .attr("r", 0) // Start with radius 0 for animation
        .attr("stroke", "yellow")
        .attr("stroke-width", 0.5)
        .attr("fill", "none")
        .transition() // Add transition for animation
        .duration(1000) // Animation duration for each circle
        .delay((d, i) => i * 500) // Delay based on index (500ms between circles)
        .attr("r", d => d) // Animate radius to final value
        .on("end", function () {
          if (d3.select(this).attr("r") === String(circlesData[circlesData.length - 1])) {
            animateCircles(); // Restart animation after the last circle
          }
        });
    };

    animateCircles();
  });
</script>

<svg id="pulsar-svg"></svg>

