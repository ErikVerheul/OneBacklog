<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'app',
}

</script>

<style>
body,
html {
  padding: 3px;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
/*
* see https://stackoverflow.com/questions/50763152/rendering-custom-styles-in-bootstrap-vue
* define these styles globally
*/
#dropdownMenuButton > button {
  width: 100%;
}

#dropdownMenuButton__BV_toggle_ {
  width: 100%;
}

.btn-seablue {
  background-color: #408fae;
  color: white;
}

.btn.btn-secondary.dropdown-toggle {
  background-color: #408fae;
  color: white;
  border-radius: 0.25rem;
}
</style>
