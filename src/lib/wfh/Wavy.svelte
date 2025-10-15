<script>
  export let className = '';
</script>

<div class="wrapper {className}">
  <svg viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
    <path class="wave wave-1" d="M0 10 C 50 5, 150 15, 200 10 S 350 5, 400 10">
      <animateTransform attributeName="transform" type="translate" values="0,0; -20,0; 0,0" dur="3s" repeatCount="indefinite"/>
    </path>
    <path class="wave wave-2" d="M0 20 C 50 15, 150 25, 200 20 S 350 15, 400 20">
      <animateTransform attributeName="transform" type="translate" values="0,0; -15,0; 0,0" dur="2.8s" repeatCount="indefinite"/>
    </path>
    <path class="wave wave-3" d="M0 30 C 50 25, 150 35, 200 30 S 350 25, 400 30">
      <animateTransform attributeName="transform" type="translate" values="0,0; -18,0; 0,0" dur="3.2s" repeatCount="indefinite"/>
    </path>
    <path class="wave wave-4" d="M0 40 C 50 35, 150 45, 200 40 S 350 35, 400 40">
      <animateTransform attributeName="transform" type="translate" values="0,0; -22,0; 0,0" dur="2.5s" repeatCount="indefinite"/>
    </path>
    <path class="wave wave-5" d="M0 50 C 50 45, 150 55, 200 50 S 350 45, 400 50">
      <animateTransform attributeName="transform" type="translate" values="0,0; -16,0; 0,0" dur="3.5s" repeatCount="indefinite"/>
    </path>
    <path class="wave wave-6" d="M0 60 C 50 55, 150 65, 200 60 S 350 55, 400 60">
      <animateTransform attributeName="transform" type="translate" values="0,0; -19,0; 0,0" dur="2.9s" repeatCount="indefinite"/>
    </path>
    <path class="wave wave-7" d="M0 70 C 50 65, 150 75, 200 70 S 350 65, 400 70">
      <animateTransform attributeName="transform" type="translate" values="0,0; -21,0; 0,0" dur="3.1s" repeatCount="indefinite"/>
    </path>
  </svg>
</div>

<style>
  .wrapper{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  svg{width:100%;height:100%}
  .wave{stroke:yellow;stroke-width:0.5;fill:none;stroke-linecap:round;opacity:0.8}
</style>