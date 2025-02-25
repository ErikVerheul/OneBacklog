<template>
  <div>
    <TreeInput ref="focusTreeView" />
  </div>
</template>

<script>
  export default {
    components: {
      TreeInput,
    },
    methods: {
      focusInput() {
        this.$refs.focusTreeView.$el.children[0].focus()
      }
    }
  }
</script>