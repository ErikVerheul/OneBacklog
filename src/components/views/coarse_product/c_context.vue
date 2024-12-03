<template>
  <BModal ref="c_contextMenuRef" :ok-disabled="disableOkButton" @ok="procSelected" @cancel="doCancel" :title="contextNodeTitle">
    <template v-if="contextOptionSelected === SHOWDEPENDENCIES || contextOptionSelected === SHOWCONDITIONS">
      <template v-if="contextOptionSelected === SHOWDEPENDENCIES">
        <p>Select the dependencies to remove:</p>
        <BFormCheckboxGroup v-model="selectedDependencyIds" stacked :options="dependenciesObjects" value-field="_id" text-field="title">
        </BFormCheckboxGroup>
        <p class="colorRed" v-if="!allDepenciesFound">Not all dependencies are found in this view. Use the Product details view instead.</p>
      </template>
      <template v-if="contextOptionSelected === SHOWCONDITIONS">
        <p>Select the conditions to remove:</p>
        <BFormCheckboxGroup v-model="selectedConditionIds" stacked :options="conditionsObjects" value-field="_id" text-field="title">
        </BFormCheckboxGroup>
        <p class="colorRed" v-if="!allConditionsFound">Not all conditions are found in this view. Use the Product details view instead.</p>
      </template>
    </template>
    <template v-else>
      <BListGroup>
        <template v-if="!store.state.moveOngoing && !store.state.selectNodeOngoing">
          <template v-if="isReqAreaItem">
            <template v-if="isReqAreaTopLevel">
              <BListGroupItem button :active="contextOptionSelected === INSERTINSIDE" variant="dark" @click="showSelected(INSERTINSIDE)">Insert a requirement
                area inside this node</BListGroupItem>
            </template>
            <template v-else>
              <BListGroupItem button :active="contextOptionSelected === INSERTBELOW" variant="dark" @click="showSelected(INSERTBELOW)">Insert a requirement area
                below this node</BListGroupItem>

              <BListGroupItem v-if="allowRemoval && contextNodeLevel >= PRODUCTLEVEL" button :active="contextOptionSelected === REMOVEREQAREA" variant="danger"
                @click="showSelected(REMOVEREQAREA)">Remove this requirement area</BListGroupItem>
            </template>
          </template>
          <template v-else-if="(isPO || isDeveloper) && contextNodeLevel > EPICLEVEL && contextNodeTeam !== myTeam">
            <BListGroupItem v-if="myTeam === MISC.NOTEAM" button :active="contextOptionSelected === ASIGNTOMYTEAM" variant="dark"
              @click="showSelected(ASIGNTOMYTEAM)">Join team '{{ contextNodeTeam }}' to open the context menu here</BListGroupItem>
            <BListGroupItem v-else button :active="contextOptionSelected === ASIGNTOMYTEAM" variant="dark" @click="showSelected(ASIGNTOMYTEAM)">Assign this {{
              contextNodeType }} to my team</BListGroupItem>
          </template>
          <template v-else>
            <!-- cannot create a database or product here -->
            <BListGroupItem v-if="contextNodeLevel > PRODUCTLEVEL" button :active="contextOptionSelected === INSERTBELOW" variant="dark"
              @click="showSelected(INSERTBELOW)">Insert a {{ contextNodeType }} below this {{ contextNodeType }}</BListGroupItem>

            <!-- cannot create item inside feature -->
            <BListGroupItem v-if="contextNodeLevel < USLEVEL" button :active="contextOptionSelected === INSERTINSIDE" variant="dark"
              @click="showSelected(INSERTINSIDE)">Insert a {{ contextChildType }} inside this {{ contextNodeType }}</BListGroupItem>

            <BListGroupItem v-if="hasDependencies && contextNodeLevel > PRODUCTLEVEL" button :active="contextOptionSelected === SHOWDEPENDENCIES" variant="dark"
              @click="showSelected(SHOWDEPENDENCIES)">▲ Show/remove existing dependencies on this item</BListGroupItem>

            <BListGroupItem v-if="hasConditions && contextNodeLevel > PRODUCTLEVEL" button :active="contextOptionSelected === SHOWCONDITIONS" variant="dark"
              @click="showSelected(SHOWCONDITIONS)">▼ Show/remove existing conditions for other items</BListGroupItem>

            <BListGroupItem v-if="contextNodeLevel > PRODUCTLEVEL" button :active="contextOptionSelected === SETDEPENDENCY" variant="dark"
              @click="showSelected(SETDEPENDENCY)">
              <template v-if="this.contextNodeSelected.dependencies.length === 0">Select a node this item is conditional for</template>
              <template v-else>Select another node this item depends on</template>
            </BListGroupItem>

            <BListGroupItem v-if="contextNodeLevel === PRODUCTLEVEL" button :active="contextOptionSelected === CLONEPRODUCT" variant="dark"
              @click="showSelected(CLONEPRODUCT)">Make a clone of this {{ contextNodeType }}</BListGroupItem>

            <BListGroupItem v-if="contextNodeLevel > PRODUCTLEVEL" button :active="contextOptionSelected === CLONEBRANCH" variant="dark"
              @click="showSelected(CLONEBRANCH)">
              Make a clone of this {{ contextNodeType }}</BListGroupItem>

            <BListGroupItem v-if="contextNodeLevel > PRODUCTLEVEL" button :active="contextOptionSelected === CLONEITEM" variant="dark"
              @click="showSelected(CLONEITEM)">Make
              a copy of this {{ contextNodeType }}</BListGroupItem>

            <BListGroupItem v-if="allowRemoval && contextNodeLevel >= PRODUCTLEVEL" button :active="contextOptionSelected === REMOVEITEM" variant="danger"
              @click="showSelected(REMOVEITEM)">Delete this {{ contextNodeType }} and all its descendants</BListGroupItem>
          </template>
        </template>

        <BListGroupItem v-if="store.state.selectNodeOngoing" button :active="contextOptionSelected === SETDEPENDENCY" variant="dark"
          @click="showSelected(SETDEPENDENCY)">Select this node as a condition for '{{ dependentOnNode.title }}'</BListGroupItem>

      </BListGroup>

      <div class="text-center">
        <div class="message-head">{{ listItemText }}</div>
        <BButton v-if="contextOptionSelected !== undefined" v-show="!showAssistance" size="sm" variant="outline-primary" @click="showAssistance = 'true'">Need
          assistance?</BButton>
        <div v-if="showAssistance" class="assist-text" v-html="assistanceText"></div>
        <div v-if="contextWarning" class="warn-text">{{ contextWarning }}</div>
      </div>
    </template>
  </BModal>
</template>

<script src="./c_context.js"></script>

<style lang="scss" scoped>
.assist-text {
  text-align: left;
  padding: 10px;
}

.message-head {
  margin: 10px;
}

.warn-text {
  text-align: left;
  margin: 10px;
  padding: 10px;
  color: rgb(255, 115, 0);
}
</style>
