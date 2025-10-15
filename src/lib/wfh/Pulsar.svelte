<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  onMount(() => {
    const container = d3.select("#pulsar-container");
    const containerNode = container.node() as HTMLElement;
    const width = containerNode.clientWidth;
    const height = containerNode.clientHeight;
    
    const svg = d3
      .select("#pulsar-svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 10;
    
    // Create circles that scale with container size
    const circlesData = [
      maxRadius * 0.3,
      maxRadius * 0.6, 
      maxRadius * 0.9
    ];

    const animateCircles = () => {
      svg.selectAll("circle").remove(); // Clear previous circles
      
      svg
        .selectAll("circle")
        .data(circlesData)
        .join("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", 0) // Start with radius 0 for animation
        .attr("stroke", "yellow")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("opacity", 0.8)
        .transition() // Add transition for animation
        .duration(1500) // Animation duration for each circle
        .delay((d, i) => i * 600) // Delay based on index
        .attr("r", d => d) // Animate radius to final value
        .transition()
        .duration(500)
        .attr("opacity", 0)
        .on("end", function (d, i) {
          if (i === circlesData.length - 1) {
            setTimeout(() => animateCircles(), 200); // Restart animation after the last circle
          }
        });
    };

    animateCircles();
  });
</script>

<div id="pulsar-container">
  <svg id="pulsar-svg"></svg>
</div>

<style>
  #pulsar-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  #pulsar-svg {
    width: 100%;
    height: 100%;
  }
</style>

