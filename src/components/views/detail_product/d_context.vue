<template>
  <b-modal
    ref="contextMenuRef"
    :ok-disabled="disableOkButton"
    @ok="procSelected"
    @cancel="doCancel"
    :title="contextNodeTitle"
  >
    <template v-if="contextOptionSelected === SHOWDEPENDENCIES || contextOptionSelected === SHOWCONDITIONS">
      <template v-if="contextOptionSelected === SHOWDEPENDENCIES">
        <p>Click on a red button to remove the dependency:</p>
        <div v-for="(dependency) in dependenciesObjects" :key="dependency._id">
          <span>
            {{ dependency.title }}
            <b-button
              class="space3px"
              variant="danger"
              size="sm"
              @click="removeDependency(dependency._id)"
            >X</b-button>
          </span>
        </div>
      </template>
      <template v-if="contextOptionSelected === SHOWCONDITIONS">
        <p>Click on a red button to remove the condition for:</p>
        <div v-for="(condition) in conditionsObjects" :key="condition._id">
          <span>
            {{ condition.title }}
            <b-button
              class="space3px"
              variant="danger"
              size="sm"
              @click="removeCondition(condition._id)"
            >X</b-button>
          </span>
        </div>
      </template>
    </template>
    <template v-else>
      <b-list-group>
        <template v-if="!$store.state.moveOngoing && !$store.state.selectNodeOngoing">
          <template v-if="contextNodeTeam !== $store.state.userData.myTeam">
            <b-list-group-item
              v-if="contextNodeLevel > featureLevel"
              button
              :active="contextOptionSelected === ASIGNTOMYTEAM"
              variant="dark"
              @click="showSelected(ASIGNTOMYTEAM)"
            >Assign this {{ contextNodeType }} to my team</b-list-group-item>

            <b-list-group-item
              v-else-if="contextNodeLevel >= productLevel"
              button
              :active="contextOptionSelected === ASIGNTOMYTEAM"
              variant="dark"
              @click="showSelected(ASIGNTOMYTEAM)"
            >Assign this {{ contextNodeType }} and its {{ contextNodeDescendantsCount }} descendants to my team</b-list-group-item>
          </template>
          <template v-else>
            <b-list-group-item
              v-if="contextNodeLevel !== productLevel"
              button
              :active="contextOptionSelected === INSERTBELOW"
              variant="dark"
              @click="showSelected(INSERTBELOW)"
            >Insert a {{ contextNodeType }} below this node</b-list-group-item>

            <b-list-group-item
              v-if="contextNodeLevel < pbiLevel"
              button
              :active="contextOptionSelected === INSERTINSIDE"
              variant="dark"
              @click="showSelected(INSERTINSIDE)"
            >Insert a {{ contextChildType }} inside this {{ contextNodeType }}</b-list-group-item>

            <b-list-group-item
              v-if="contextNodeLevel >= productLevel"
              button
              :active="contextOptionSelected === CHECKSTATES"
              variant="dark"
              @click="showSelected(CHECKSTATES)"
            >Run a check on item state consistency</b-list-group-item>

            <b-list-group-item
              v-if="hasDependencies && contextNodeLevel > productLevel"
              button
              :active="contextOptionSelected === SHOWDEPENDENCIES"
              variant="dark"
              @click="showSelected(SHOWDEPENDENCIES)"
            >▲ Show/remove existing dependencies on this item</b-list-group-item>

            <b-list-group-item
              v-if="hasConditions && contextNodeLevel > productLevel"
              button
              :active="contextOptionSelected === SHOWCONDITIONS"
              variant="dark"
              @click="showSelected(SHOWCONDITIONS)"
            >▼ Show/remove existing conditions for other items</b-list-group-item>

            <b-list-group-item
              v-if="contextNodeLevel > productLevel"
              button
              :active="contextOptionSelected === SETDEPENDENCY"
              variant="dark"
              @click="showSelected(SETDEPENDENCY)"
            >
              <template
                v-if="this.contextNodeSelected.dependencies.length === 0"
              >Select a node this item depends on</template>
              <template v-else>Select another node this item depends on</template>
            </b-list-group-item>

            <b-list-group-item
              v-if="contextNodeLevel > productLevel"
              button
              :active="contextOptionSelected === MOVETOPRODUCT"
              variant="dark"
              @click="showSelected(MOVETOPRODUCT)"
            >Move this {{ contextNodeType }} to another product</b-list-group-item>

            <b-list-group-item
              v-if="contextNodeLevel === productLevel"
              button
              :active="contextOptionSelected === CLONEPRODUCT"
              variant="dark"
              @click="showSelected(CLONEPRODUCT)"
            >Make a clone of this {{ contextNodeType }}</b-list-group-item>

            <b-list-group-item
              v-if="contextNodeLevel > productLevel"
              button
              :active="contextOptionSelected === CLONEITEM"
              variant="dark"
              @click="showSelected(CLONEITEM)"
            >Make a copy of this {{ contextNodeType }}</b-list-group-item>

            <b-list-group-item
              v-if="allowRemoval && contextNodeLevel >= productLevel"
              button
              :active="contextOptionSelected === REMOVEITEM"
              variant="danger"
              @click="showSelected(REMOVEITEM)"
            >Remove this {{ contextNodeType }} and its {{ contextNodeDescendantsCount }} descendants</b-list-group-item>

          </template>
        </template>

        <b-list-group-item
          v-if="$store.state.selectNodeOngoing"
          button
          :active="contextOptionSelected === SETDEPENDENCY"
          variant="dark"
          @click="showSelected(SETDEPENDENCY)"
        >Select this node as a condition for '{{ getNodeWithDependencies().title }}'</b-list-group-item>

        <b-list-group-item
          v-if="$store.state.moveOngoing && moveSourceProductId !== $store.state.currentProductId"
          button
          :active="contextOptionSelected === MOVETOPRODUCT"
          variant="dark"
          @click="showSelected(MOVETOPRODUCT)"
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
  </b-modal>
</template>

<script src="./d_context.js"></script>

<style scoped>
.message {
  margin: 10px;
}
.warning {
  margin: 10px;
  padding: 10px;
  color: rgb(255, 115, 0);
}
.space3px {
  margin: 3px;
}
</style>
