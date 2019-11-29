<template>
  <b-modal ref="contextMenuRef" @ok="procSelected()" @cancel="doCancel" :title="contextNodeTitle">
    <b-list-group>
      <template
        v-if="contextNodeTeam !== $store.state.userData.myTeam"
      >
        <b-list-group-item
          v-if="contextNodeLevel > featureLevel"
          button
          variant="dark"
          v-on:click="contextSelected = 4"
        >Assign this {{ contextNodeType }} to my team</b-list-group-item>
        <b-list-group-item
          v-else-if="contextNodeLevel >= productLevel"
          button
          variant="dark"
          v-on:click="contextSelected = 4"
        >Assign this {{ contextNodeType }} and its {{ contextNodeDescendantsCount }} descendants to my team</b-list-group-item>
      </template>
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
      >Remove this {{ contextNodeType }} and its {{ contextNodeDescendantsCount }} descendants</b-list-group-item>
      <b-list-group-item
        v-if="contextNodeLevel >= productLevel"
        button
        variant="dark"
        v-on:click="contextSelected = 5"
      >Run a check on item state consistency</b-list-group-item>
    </b-list-group>
    <div class="d-block text-center">
      <div class="message">{{ showSelected() }}</div>
      <b-button
        v-if="contextSelected !== undefined"
        v-show="!showAssistance"
        size="sm"
        variant="outline-primary"
        @click="contextAssistance(contextSelected)"
      >Need assistance?</b-button>
      <b-alert class="d-block text-left" :show="showAssistance" v-html="assistanceText"></b-alert>
      <div v-if="contextWarning" class="d-block warning">{{ contextWarning }}</div>
    </div>
  </b-modal>
</template>

<script src="./context.js"></script>

<style scoped>
.message {
  margin: 10px;
}
.warning {
  margin: 10px;
  padding: 10px;
  color: rgb(255, 115, 0);
}
</style>
