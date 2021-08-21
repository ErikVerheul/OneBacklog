<template>
  <b-modal
    ref="d_contextMenuRef"
    :ok-disabled="disableOkButton"
    @ok="procSelected"
    @cancel="doCancel"
    :title="contextNodeTitle"
  >
    <template v-if="contextOptionSelected === SHOWDEPENDENCIES || contextOptionSelected === SHOWCONDITIONS">
      <template v-if="contextOptionSelected === SHOWDEPENDENCIES">
        <p>Select the dependencies to remove:</p>
				<b-form-checkbox-group
					v-model="selectedDependencyIds"
					stacked
					:options="dependenciesObjects"
					value-field="_id"
					text-field="title">
				</b-form-checkbox-group>
      </template>
      <template v-if="contextOptionSelected === SHOWCONDITIONS">
        <p>Select the conditions to remove:</p>
				<b-form-checkbox-group
					v-model="selectedConditionIds"
					stacked
					:options="conditionsObjects"
					value-field="_id"
					text-field="title">
				</b-form-checkbox-group>
      </template>
    </template>
    <template v-else>
      <b-list-group>
        <template v-if="!$store.state.moveOngoing && !$store.state.selectNodeOngoing">
          <template v-if="(isPO || isDeveloper) && contextNodeLevel > epicLevel && myTeam !== 'not assigned yet' && contextNodeTeam !== myTeam">
            <b-list-group-item
              v-if="contextNodeLevel > pbiLevel"
              button
              :active="contextOptionSelected === ASIGNTOMYTEAM"
              variant="dark"
              @click="showSelected(ASIGNTOMYTEAM)"
            >Assign this {{ contextNodeType }} to my team</b-list-group-item>
            <b-list-group-item v-else
              button
              :active="contextOptionSelected === ASIGNTOMYTEAM"
              variant="dark"
              @click="showSelected(ASIGNTOMYTEAM)"
            >Assign this {{ contextNodeType }} and its {{ contextNodeDescendants.count }} descendants to my team</b-list-group-item>
          </template>
          <template v-else>
						<!-- cannot create a database or product here -->
            <b-list-group-item
              v-if="contextNodeLevel > productLevel"
              button
              :active="contextOptionSelected === INSERTBELOW"
              variant="dark"
              @click="showSelected(INSERTBELOW)"
            >Insert a {{ contextNodeType }} below this {{ contextNodeType }}</b-list-group-item>

						<p v-if="contextNodeLevel === databaseLevel"> A new product is created in the admin view.</p>
						<template v-else>
							<!-- cannot create item inside task -->
							<b-list-group-item
								v-if="contextNodeLevel < taskLevel"
								button
								:active="contextOptionSelected === INSERTINSIDE"
								variant="dark"
								@click="showSelected(INSERTINSIDE)"
							>Insert a {{ contextChildType }} inside this {{ contextNodeType }}</b-list-group-item>
						</template>

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
              v-if="canAssignPbiToSprint"
              button
              :active="contextOptionSelected === PBITOSPRINT"
              variant="dark"
              @click="showSelected(PBITOSPRINT)"
            >Assing this {{ contextNodeType }} to a sprint</b-list-group-item>

            <b-list-group-item
              v-if="canAssignTaskToSprint"
              button
              :active="contextOptionSelected === TASKTOSPRINT"
              variant="dark"
              @click="showSelected(TASKTOSPRINT)"
            >Assing this task to the sprint</b-list-group-item>

            <b-list-group-item
              v-if="isInSprint"
              button
              :active="contextOptionSelected === FROMSPRINT"
              variant="dark"
              @click="showSelected(FROMSPRINT)"
            >Remove this {{ contextNodeType }} from the sprint</b-list-group-item>

            <b-list-group-item
              v-if="allowRemoval && contextNodeLevel >= productLevel"
              button
              :active="contextOptionSelected === REMOVEITEM"
              variant="danger"
              @click="showSelected(REMOVEITEM)"
            >Delete this {{ contextNodeType }} and its {{ contextNodeDescendants.count }} descendants</b-list-group-item>
          </template>
        </template>

        <b-list-group-item
          v-if="$store.state.selectNodeOngoing"
          button
          :active="contextOptionSelected === SETDEPENDENCY"
          variant="dark"
          @click="showSelected(SETDEPENDENCY)"
        >Select this node as a condition for '{{ dependentOnNode.title }}'</b-list-group-item>

        <b-list-group-item
          v-if="$store.state.moveOngoing && moveSourceProductId !== $store.state.currentProductId"
          button
          :active="contextOptionSelected === MOVETOPRODUCT"
          variant="dark"
          @click="showSelected(MOVETOPRODUCT)"
        >Insert the {{ getLevelText(this.movedNode.level, this.movedNode.data.subtype) }} here</b-list-group-item>
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
        <div v-if="showAssistance" class="d-block text-left border" v-html="assistanceText"></div>
        <div v-if="contextWarning" class="d-block warning">{{ contextWarning }}</div>
      </div>
    </template>
  </b-modal>
</template>

<script src="./d_context.js"></script>

<style scoped>

.border {
  padding: 10px;
}
.message {
  margin: 10px;
}
.warning {
  margin: 10px;
  padding: 10px;
  color: rgb(255, 115, 0);
}
</style>
