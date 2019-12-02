<template>
  <b-modal ref="contextMenuRef" @ok="procSelected" @cancel="doCancel" :title="contextNodeTitle">
    <template v-if="!showDependencies">
      <b-list-group>
        <template v-if="!$store.state.moveOngoing && !$store.state.selectNodeOngoing">
          <template v-if="contextNodeTeam !== $store.state.userData.myTeam">
            <b-list-group-item
              v-if="contextNodeLevel > FEATURELEVEL"
              button
              variant="dark"
              v-on:click="showSelected(ASIGNTOMYTEAM)"
            >Assign this {{ contextNodeType }} to my team</b-list-group-item>
            <b-list-group-item
              v-else-if="contextNodeLevel >= PRODUCTLEVEL"
              button
              variant="dark"
              v-on:click="showSelected(ASIGNTOMYTEAM)"
            >Assign this {{ contextNodeType }} and its {{ contextNodeDescendantsCount }} descendants to my team</b-list-group-item>
          </template>
          <b-list-group-item
            v-if="contextNodeLevel !== PRODUCTLEVEL"
            button
            variant="dark"
            v-on:click="showSelected(INSERTBELOW)"
          >Insert a {{ contextNodeType }} below this node</b-list-group-item>
          <b-list-group-item
            v-if="contextNodeLevel < PBILEVEL"
            button
            variant="dark"
            v-on:click="showSelected(INSERTINSIDE)"
          >Insert a {{ contextChildType }} inside this {{ contextNodeType }}</b-list-group-item>
          <b-list-group-item
            v-if="contextNodeLevel >= PRODUCTLEVEL"
            button
            variant="danger"
            v-on:click="showSelected(REMOVEITEM)"
          >Remove this {{ contextNodeType }} and its {{ contextNodeDescendantsCount }} descendants</b-list-group-item>
          <b-list-group-item
            v-if="contextNodeLevel >= PRODUCTLEVEL"
            button
            variant="dark"
            v-on:click="showSelected(CHECKSTATES)"
          >Run a check on item state consistency</b-list-group-item>

          <b-list-group-item
            v-if="hasDependencies && contextNodeLevel > PRODUCTLEVEL"
            button
            variant="dark"
            v-on:click="showSelected(SHOWDEPENDENCIES)"
          >Show/remove existing dependencies for this item</b-list-group-item>
          <b-list-group-item
            v-if="contextNodeLevel > PRODUCTLEVEL"
            button
            variant="dark"
            v-on:click="showSelected(SETDEPENDENCY)"
          >Select {{ dependencyTextTweak }} node this item depends on</b-list-group-item>
          <b-list-group-item
            v-if="contextNodeLevel > PRODUCTLEVEL"
            button
            variant="dark"
            v-on:click="showSelected(MOVETOPRODUCT)"
          >Move this {{ contextNodeType }} to another product</b-list-group-item>
        </template>

        <b-list-group-item
          v-if="$store.state.selectNodeOngoing"
          button
          variant="dark"
          v-on:click="showSelected(SETDEPENDENCY)"
        >Select this node as a condition for '{{ nodeWithDependencies.title }}</b-list-group-item>

        <b-list-group-item
          v-if="$store.state.moveOngoing && moveSourceProductId !== $store.state.load.currentProductId"
          button
          variant="dark"
          v-on:click="showSelected(MOVETOPRODUCT)"
        >Insert the moved item here</b-list-group-item>
      </b-list-group>
      <div class="d-block text-center">
        <div class="message">{{ listItemText }}</div>
        <b-button
          v-if="contextOptionSelected !== undefined"
          v-show="!showAssistance"
          size="sm"
          variant="outline-primary"
          @click="showAssistance='true'"
        >Need assistance?</b-button>
        <b-alert class="d-block text-left" :show="showAssistance" v-html="assistanceText"></b-alert>
        <div v-if="contextWarning" class="d-block warning">{{ contextWarning }}</div>
      </div>
    </template>
    <template v-else>
      <p>Click on a red button to remove the dependency:</p>
      <div v-for="(dependency) in tmpDependencies" :key="dependency._id">
        <span>
          {{ dependency.title }}
          <b-button
            class="space"
            variant="danger"
            size="sm"
            @click="removeDependency(dependency._id)"
          >X</b-button>
        </span>
      </div>
    </template>
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
.space {
  margin: 3px;
}
</style>
