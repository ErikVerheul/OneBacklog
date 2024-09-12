<template>
  <BContainer>
    <BRow>
      <div class="col-lg-12 col-sm-12">
        <BImg :src="logo" placement="center" alt="OneBacklog logo" />
      </div>
      <div class="col-lg-12 col-sm-12" id="signin">
        <div class="signin-form">
          <div class="input">
            <label for="name">Name</label>
            <BFormInput type="text" id="name" autocomplete="username" v-model="state.name" />
          </div>
          <div class="input">
            <label for="password">Password</label>
            <BFormInput type="password" autocomplete="current-password" id="password" v-model="state.password" />
          </div>
          <div class="submit">
            <template v-if="credentialsEntered">
              <BButton @click="onSubmit">Submit</BButton>
            </template>
            <template v-else>
              <BButton disabled>Submit</BButton>
            </template>
          </div>
        </div>
        <div v-if="!store.state.demo" class="text-center mb-1">No account yet? Ask your SM or PO to create one</div>
        <div class="text-center mb-4">Tip: right-click in the Name field to change the browser spelling check settings for this session</div>
        <div class="text-left">
          This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
          implied warranty of
          MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the Licence information item in the User dropdown menu when signed-in
        </div>
        <div v-if="store.state.demo" class="text-left">
          <p>This is a demo instance of the application. Your changes can be overridden by others or by a database restore. Please leave your findings in this
            applications register or raise an issue
            at <a href="https://github.com/ErikVerheul/OneBacklog/issues">Github</a></p>
          <p class="text-center">Signin with <b>demoUser</b> and password <b>demoUser</b></p>
          <p>Note that demoUser has the overall permission of Area PO and the permissions of "PO", "developer" and "guest"
            for the 'Register your feature proposals and bug findings here' and 'Feel free
            to play with this product'. So you can do almost everything. Please do not remove other peoples entries.</p>
        </div>
      </div>
    </BRow>
  </BContainer>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useStore } from 'vuex'
import logo from '../../assets/logo.png'
const store = useStore()
const state = reactive({
  logo: logo,
  name: '',
  password: ''
})

const credentialsEntered = computed(() => {
  return state.name.length > 0 && state.password.length >= 4
})

function onSubmit() {
  const credentials = {
    name: state.name,
    password: state.password
  }
  store.dispatch('signin', credentials)
}

</script>

<style scoped>
.signin-form {
  width: 400px;
  margin: 30px auto;
  border: 1px solid #eee;
  padding: 20px;
  box-shadow: 0 2px 3px #ccc;
}

.input {
  margin: 10px auto;
}

.input label {
  display: block;
  color: #4e4e4e;
  margin-bottom: 6px;
}

.input input {
  font: inherit;
  width: 100%;
  padding: 6px 12px;
  box-sizing: border-box;
  border: 1px solid #ccc;
}

.submit button {
  border: 1px solid #521751;
  color: #521751;
  background-color: #408fae;
  padding: 10px 20px;
  font: inherit;
  cursor: pointer;
}

.submit button[disabled],
.submit button[disabled]:active {
  border: 1px solid #ccc;
  background-color: transparent;
  color: #ccc;
  cursor: not-allowed;
}
</style>
