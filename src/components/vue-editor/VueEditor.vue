<!-- This component is a Vue3 adapted version of the David Royer vue2-editor. See https://github.com/davidroyer/vue2-editor -->
<template>
  <div class="quillWrapper">
    <slot name="toolbar"></slot>
    <div :id="id" ref="quillContainer"></div>
    <input v-if="useCustomImageHandler" id="file-upload" ref="fileInput" type="file" accept="image/*" style="display:none" @change="emitImageInfo($event)" />
  </div>
</template>

<script>
import Quill from "quill"
import defaultToolbar from "../../vueeditor-helpers/default-toolbar.js"
import oldApi from "../../vueeditor-helpers/old-api.js"
import mergeDeep from "../../vueeditor-helpers/merge-deep.js"
import MarkdownShortcuts from "../../vueeditor-helpers/markdown-shortcuts.js"
import 'quill/dist/quill.snow.css'

function objectHasKey(obj, key) {
	const allKeys = Object.keys(obj)
	return allKeys.includes(key)
}

export default {
  name: "VueEditor",
  mixins: [oldApi],
  props: {
    id: {
      type: String,
      default: "quill-container"
    },
    placeholder: {
      type: String,
      default: ""
    },
    value: {
      type: String,
      default: ""
    },
    disabled: {
      type: Boolean
    },
    editorToolbar: {
      type: Array,
      default: () => []
    },
    editorOptions: {
      type: Object,
      required: false,
      default: () => ({})
    },
    useCustomImageHandler: {
      type: Boolean,
      default: false
    },
    useMarkdownShortcuts: {
      type: Boolean,
      default: false
    }
  },

	emits: [
		'blur',
		'editor-change',
		'emitImageInfo',
		'focus',
		'image-added',
		'image-removed',
		'input',
		'ready',
		'selection-change',
		'text-change',
		'type'
	],

  data: () => ({
    quill: null
  }),

  watch: {
    value(val) {
      if (val != this.quill.root.innerHTML && !this.quill.hasFocus()) {
        this.quill.root.innerHTML = val
      }
    },
    disabled(status) {
      this.quill.enable(!status)
    }
  },

  mounted() {
    this.registerCustomModules(Quill)
    this.registerPrototypes()
    this.initializeEditor()
  },

  beforeMount() {
    this.quill = null
    delete this.quill
  },

  methods: {
    initializeEditor() {
      this.setupQuillEditor()
      this.checkForCustomImageHandler()
      this.handleInitialContent()
      this.registerEditorEventListeners()
      this.$emit("ready", this.quill)
    },

    setupQuillEditor() {
      const editorConfig = {
        debug: false,
        modules: this.setModules(),
        theme: "snow",
        placeholder: this.placeholder ? this.placeholder : "",
        readOnly: this.disabled ? this.disabled : false
      }

      this.prepareEditorConfig(editorConfig)
      this.quill = new Quill(this.$refs.quillContainer, editorConfig)
    },

    setModules() {
      const modules = {
        toolbar: this.editorToolbar.length ? this.editorToolbar : defaultToolbar
      }
      if (this.useMarkdownShortcuts) {
        Quill.register("modules/markdownShortcuts", MarkdownShortcuts, true)
        modules["markdownShortcuts"] = {}
      }
      return modules
    },

    prepareEditorConfig(editorConfig) {
      if (
        Object.keys(this.editorOptions).length > 0 &&
        this.editorOptions.constructor === Object
      ) {
        if (
          this.editorOptions.modules &&
          typeof this.editorOptions.modules.toolbar !== "undefined"
        ) {
          // We don't want to merge default toolbar with provided toolbar.
          delete editorConfig.modules.toolbar
        }

        mergeDeep(editorConfig, this.editorOptions)
      }
    },

    registerPrototypes() {
      Quill.prototype.getHTML = function () {
        return this.container.querySelector(".ql-editor").innerHTML
      }
      Quill.prototype.getWordCount = function () {
        return this.container.querySelector(".ql-editor").innerText.length
      }
    },

    registerEditorEventListeners() {
      this.quill.on("text-change", this.handleTextChange)
      this.quill.on("selection-change", this.handleSelectionChange)
      this.listenForEditorEvent("text-change")
      this.listenForEditorEvent("selection-change")
      this.listenForEditorEvent("editor-change")
    },

    listenForEditorEvent(type) {
      this.quill.on(type, (...args) => {
        this.$emit(type, ...args)
      })
    },

    handleInitialContent() {
      if (this.value) this.quill.root.innerHTML = this.value // Set initial editor content
    },

    handleSelectionChange(range, oldRange) {
      if (!range && oldRange) this.$emit("blur", this.quill)
      else if (range && !oldRange) this.$emit("focus", this.quill)
    },

    handleTextChange(delta, oldContents) {
      const editorContent =
        this.quill.getHTML() === "<p><br></p>" ? "" : this.quill.getHTML()
      this.$emit("input", editorContent)

      if (this.useCustomImageHandler)
        this.handleImageRemoved(delta, oldContents)
    },

    handleImageRemoved(delta, oldContents) {
      const currrentContents = this.quill.getContents()
      const deletedContents = currrentContents.diff(oldContents)
      const operations = deletedContents.ops

      operations.map(operation => {
				//  if (operation.insert && operation.insert.hasOwnProperty("image")) {
        if (operation.insert && objectHasKey(operation.insert, "image")) {
          const { image } = operation.insert
          this.$emit("image-removed", image)
        }
      })
    },
    checkForCustomImageHandler() {
      this.useCustomImageHandler === true ? this.setupCustomImageHandler() : ""
    },

    setupCustomImageHandler() {
      const toolbar = this.quill.getModule("toolbar")
      toolbar.addHandler("image", this.customImageHandler)
    },

		//ToDo: custom image handler will not work is the property click does not exist
    customImageHandler() {
      this.$refs.fileInput.click()
    },

    emitImageInfo($event) {
      const resetUploader = function () {
        var uploader = document.getElementById("file-upload")
        uploader.value = ""
      }
      const file = $event.target.files[0]
      const Editor = this.quill
      const range = Editor.getSelection()
      const cursorLocation = range.index
      this.$emit("image-added", file, Editor, cursorLocation, resetUploader)
    }
  }
}
</script>

<style lang="scss" scoped>
.ql-editor {
  min-height: 200px;
  font-size: 16px;
}

.ql-snow .ql-stroke.ql-thin,
.ql-snow .ql-thin {
  stroke-width: 1px !important;
}

.quillWrapper .ql-snow.ql-toolbar {
  padding-top: 8px;
  padding-bottom: 4px;
}
/* .quillWrapper .ql-snow.ql-toolbar button {
  margin: 1px 4px;
} */
.quillWrapper .ql-snow.ql-toolbar .ql-formats {
  margin-bottom: 10px;
}

.ql-snow .ql-toolbar button svg,
.quillWrapper .ql-snow.ql-toolbar button svg {
  width: 22px;
  height: 22px;
}

.quillWrapper .ql-editor ul[data-checked="false"] > li::before,
.quillWrapper .ql-editor ul[data-checked="true"] > li::before {
  font-size: 1.35em;
  vertical-align: baseline;
  bottom: -0.065em;
  font-weight: 900;
  color: #222;
}

.quillWrapper .ql-snow .ql-stroke {
  stroke: rgba(63, 63, 63, 0.95);
  stroke-linecap: square;
  stroke-linejoin: initial;
  stroke-width: 1.7px;
}

.quillWrapper .ql-picker-label {
  font-size: 15px;
}

.quillWrapper .ql-snow .ql-active .ql-stroke {
  stroke-width: 2.25px;
}

.quillWrapper .ql-toolbar.ql-snow .ql-formats {
  vertical-align: top;
}

.ql-picker {
  &:not(.ql-background) {
    position: relative;
    top: 2px;
  }

  &.ql-color-picker {
    svg {
      width: 22px !important;
      height: 22px !important;
    }
  }
}

.quillWrapper {
  & .imageResizeActive {
    img {
      display: block;
      cursor: pointer;
    }

    & ~ div svg {
      cursor: pointer;
    }
  }
}
</style>
