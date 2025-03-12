/*
* This component is based on the adapted QuillyEditor component with a set theme and toolbar.
* It emits a blur when leaving the editor area to the toolbar or anywhere else.
*/

<template>
  <quilly-editor ref="editor" v-model="content" :options="options" :isSemanticHtmlModel="true" @mouseleave="emitBlur" />
</template>

<script setup>
  import { MISC } from '../../constants.js'
  import { onMounted, ref } from 'vue'
  import Quill from 'quill'
  import QuillyEditor from './QuillyEditor.vue'
  import 'quill/dist/quill.snow.css'

  let quill = null
  const editor = ref()
  const content = ref(MISC.EMPTYQUILL)
  const emit = defineEmits(['blur'])
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

  // Emit a blur event when the cursor leaves the editor (or moves to the editor toolbar)
  const emitBlur = () => {
    // hasFocus: Checks if editor has focus. Note focus on toolbar, tooltips, does not count as the editor
    if (quill && quill.hasFocus()) {
      emit('blur', quill)
    }
  }

  onMounted(() => {
    quill = editor.value.initialize(Quill)
  })

</script>