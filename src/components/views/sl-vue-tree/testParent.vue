<template>
  <div>
    <CustomInput
      ref="usernameInput"
      id="username"
      label="Username"
      v-model="username"
      placeholder="Enter your username"
    />
    <button @click="focusInput">Focus on Username Input</button>
  </div>
</template>

<script>
import CustomInput from './CustomInput.vue';

export default {
  components: {
    CustomInput
  },
  data() {
    return {
      username: ''
    };
  },
  methods: {
    focusInput() {
      // Call the focus method on the custom input component
      this.$refs.usernameInput.focus();
    }
  }
}
</script>
