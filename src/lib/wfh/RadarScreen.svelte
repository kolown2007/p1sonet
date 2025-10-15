<script>
  import './wfh.css';
  import Time from './Time.svelte';
  import Pulsar from './Pulsar.svelte';
  import Horizon from './Horizon.svelte';
  import Wavy from './Wavy.svelte';
  // Your component logic here
</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" >
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">

<div class="level1 space-mono-regular">
    
        <div class="level2">
           
           
             <div class ="level3">
                <Time />
            </div>
            

            <div class="level3" id="cell-2">
                <Horizon />
            </div>

   <div class="level3" id="cell-3">
                <Pulsar />
            </div>


             <div class="level3" id="cell-3">
                <Wavy />
            </div>

           

        </div>


      
</div>