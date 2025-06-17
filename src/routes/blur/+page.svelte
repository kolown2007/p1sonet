<script>
    import { onMount } from 'svelte';
    let loaded = false;
    let imageUrl = 'https://archive.kolown.net/wp-content/uploads/2024/02/p1sonet-1.png'; // Replace with your image path

    function handleImageLoad() {
        loaded = true;
    }
</script>

<div class="image-container">
    <img
        src={imageUrl}
        alt="Blurred preview"
        class="image"
        class:blur={!loaded}
        on:load={handleImageLoad}
    />
</div>

<style>    .image-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }
    
    .image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: filter 0.3s ease-out;
        filter: blur(70px); /* Always apply blur */
    }

    .blur {
        filter: blur(50px);
    }
</style>