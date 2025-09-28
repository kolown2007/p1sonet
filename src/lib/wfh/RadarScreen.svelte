<script>
  import './wfh.css';
  import Time from './Time.svelte';
  import Pulsar from './Pulsar.svelte';
  import Horizon from './Horizon.svelte';
  // Your component logic here
</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" >
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">

<div class="level1 space-mono-regular">
    
        <div class="level2">
            <div class="level3" id="cell-1">
            <!-- <h3 class ="title"> Data1</h3>  -->
           
          
             <div class ="level3">
                <Time />
            </div>
            </div>

            <div class="level3" id="cell-2">
                <Horizon />
            </div>

        </div>


      
</div>