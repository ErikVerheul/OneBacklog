<template>
  <div class="custom-input">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      :type="type"
      :value="value"
      @input="updateValue"
      :placeholder="placeholder"
      ref="inputField"
    />
  </div>
</template>

<script>
export default {
  props: {
    label: {
      type: String,
      required: true
    },
    value: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text'
    },
    placeholder: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      required: true
    }
  },
  methods: {
    updateValue(event) {
      this.$emit('input', event.target.value);
    },
    focus() {
      this.$refs.inputField.focus();
    }
  }
}
</script>

<style scoped>
.custom-input {
  margin-bottom: 1em;
}
.custom-input label {
  display: block;
  margin-bottom: 0.5em;
}
.custom-input input {
  padding: 0.5em;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
}
</style>
