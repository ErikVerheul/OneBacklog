<template>
  <quilly-editor ref="editor" v-model="content" :options="options" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Quill from 'quill'
import { QuillyEditor } from 'vue-quilly'
import 'quill/dist/quill.snow.css'

const editor = ref()
const content = ref('<p><br></p>')

const options = ref({
  theme: 'snow',
  modules: {
    toolbar: [
      [{ header: [false, 1, 2, 3, 4, 5, 6] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
      ['link', 'image', 'code-block'],
      ['clean'] // remove formatting button
    ],
  },
  placeholder: 'Insert text here ...',
  readOnly: false
})

onMounted(() => {
  editor.value.initialize(Quill)
})

</script>