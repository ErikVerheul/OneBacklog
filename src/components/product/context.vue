<template>
  <b-modal ref="contextMenuRef" @ok="procSelected()" @cancel="doCancel" :title="contextNodeTitle">
    <b-list-group>
      <b-list-group-item
        v-if="contextNodeLevel !== productLevel"
        button
        variant="dark"
        v-on:click="contextSelected = 0"
      >Insert a {{ contextNodeType }} below this node</b-list-group-item>
      <b-list-group-item
        v-if="contextNodeLevel < pbiLevel"
        button
        variant="dark"
        v-on:click="contextSelected = 1"
      >Insert a {{ contextChildType }} inside this {{ contextNodeType }}</b-list-group-item>
      <b-list-group-item
        v-if="!$store.state.moveOngoing && contextNodeLevel > productLevel"
        button
        variant="dark"
        v-on:click="contextSelected = 2"
      >Move this {{ contextNodeType }} to another product</b-list-group-item>
      <b-list-group-item
        v-if="$store.state.moveOngoing && moveSourceProductId !== $store.state.load.currentProductId"
        button
        variant="dark"
        v-on:click="contextSelected = 2"
      >Insert the moved item here</b-list-group-item>
      <b-list-group-item
        v-if="contextNodeLevel >= productLevel"
        button
        variant="danger"
        v-on:click="contextSelected = 3"
      >Remove this {{ contextNodeType }} and {{ removeDescendantsCount }} descendants</b-list-group-item>
      <hr />
      <div class="d-block text-center">
        {{ showSelected() }}
        <br />
        <br />
        <b-button
          v-if="contextSelected !== undefined"
          v-show="!showAssistance"
          size="sm"
          variant="outline-primary"
          @click="contextAssistance(contextSelected)"
        >Need assistance?</b-button>
        <b-alert class="d-block text-left" :show="showAssistance" v-html="assistanceText"></b-alert>
        <div v-if="contextWarning" class="colorRed">{{ contextWarning }}</div>
      </div>
    </b-list-group>
  </b-modal>
</template>

<script src="./context.js"></script>
