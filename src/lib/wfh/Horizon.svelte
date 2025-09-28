<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";

  onMount(() => {
    const svg = d3
      .select("#altitude-indicator")
      .attr("width", 300)
      .attr("height", 300);

    // Define the mask first, before any elements that use it
    const defs = svg.append("defs");
    defs.append("clipPath")
      .attr("id", "circle-mask")
      .append("circle")
      .attr("cx", 150)
      .attr("cy", 150)
      .attr("r", 100);

    // Create a group for all clipped elements
    const clippedGroup = svg.append("g")
      .attr("clip-path", "url(#circle-mask)");

    // Draw the circular frame (not clipped)
    svg.append("circle")
      .attr("cx", 150)
      .attr("cy", 150)
      .attr("r", 100)
      .attr("stroke", "yellow")
      .attr("stroke-width", 2)
      .attr("fill", "none");

    // Create a horizon group that moves together
    const horizonGroup = clippedGroup.append("g");

    // Draw pitch markers inside the horizon group so they move with the horizon
    const pitchMarkers = [-50, -25, 0, 25, 50];
    pitchMarkers.forEach((pitch) => {
      const color = pitch >= 0 ? "blue" : "red"; // Blue for sky (positive), red for dirt (negative)
      horizonGroup.append("line")
        .attr("x1", 0)
        .attr("y1", 150 - pitch)
        .attr("x2", 300)
        .attr("y2", 150 - pitch)
        .attr("stroke", color)
        .attr("stroke-width", 1);
    });

    // Draw the ground (red area below horizon)
    const groundRect = horizonGroup.append("rect")
      .attr("x", 0)
      .attr("y", 150) // Start at horizon line
      .attr("width", 300)
      .attr("height", 150) // Extend down
      .attr("fill", "red")
      .attr("opacity", 0.3);

    // Draw the sky (blue area above horizon)
    const skyRect = horizonGroup.append("rect")
      .attr("x", 0)
      .attr("y", 0) // Start at top
      .attr("width", 300)
      .attr("height", 150) // Extend to horizon line
      .attr("fill", "blue")
      .attr("opacity", 0.3);

    // Draw the horizon line
    const horizonLine = horizonGroup.append("line")
      .attr("x1", 0) // Extend beyond the circle
      .attr("y1", 150)
      .attr("x2", 300) // Extend beyond the circle
      .attr("y2", 150)
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // Draw the aircraft symbol (not clipped)
    svg.append("line")
      .attr("x1", 140)
      .attr("y1", 150)
      .attr("x2", 160)
      .attr("y2", 150)
      .attr("stroke", "yellow")
      .attr("stroke-width", 2);

    svg.append("line")
      .attr("x1", 150)
      .attr("y1", 140)
      .attr("x2", 150)
      .attr("y2", 160)
      .attr("stroke", "yellow")
      .attr("stroke-width", 2);

    // Simulate pitch and roll changes
    let pitch = 0; // Vertical movement (-50 to 50)
    let roll = 0; // Rotation in degrees (-45 to 45)

    const updateHorizon = () => {
      horizonGroup.attr("transform", `translate(0, ${pitch}) rotate(${roll}, 150, 150)`);
    };

    setInterval(() => {
      pitch = parseFloat((Math.sin(Date.now() / 1000) * 50).toFixed(2)); // Simulate pitch oscillation
      roll = parseFloat((Math.sin(Date.now() / 2000) * 30).toFixed(2)); // Simulate roll oscillation
      updateHorizon();
    }, 100);
  });
</script>

<svg id="altitude-indicator"></svg>

