<template>
  <quilly-editor ref="editor" v-model="content" :options="options" />
</template>

<script setup>
  import { MISC } from '../constants.js'
  import { defineEmits, onMounted, ref } from 'vue'
  import Quill from 'quill'
  import { QuillyEditor } from 'vue-quilly'
  import 'quill/dist/quill.snow.css'

  const emit = defineEmits(['blur'])
  const editor = ref()
  const content = ref(MISC.EMPTYQUILL)
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
    const quill = editor.value.initialize(Quill)
    quill.root.addEventListener('blur', () => {
      emit('blur', quill)
    })
  })

</script>