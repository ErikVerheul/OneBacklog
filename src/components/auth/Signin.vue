<template>
  <BContainer>
    <div class="row">
      <div class="col-lg-12 col-sm-12">
        <BImg :src="logo" center alt="OneBacklog logo" />
      </div>
      <div class="col-lg-12 col-sm-12" id="signin">
        <div class="signin-form">
          <div class="input">
            <label for="name">Name</label>
            <input type="text" id="name" autocomplete="username" v-model="state.name" />
          </div>
          <div class="input">
            <label for="password">Password</label>
            <input type="password" autocomplete="current-password" id="password" v-model="state.password" />
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
        <div v-if="!store.state.demo" class="text-center big-margin">No account yet? Ask your SM or PO to create
          one.</div>
        <div class="text-center">
          This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
          implied warranty of
          MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the Licence information item in the User dropdown menu.
        </div>
        <div v-if="store.state.demo" class="text-center">
          <p>
            This is a demo instance of the application. Your changes can be overridden by others or by a database restore.
            <br />Please leave your findings in this applications register or raise an issue at
            <a href="https://github.com/ErikVerheul/OneBacklog/issues">Github</a>
          </p>
          <p>
            Signin with
            <b>demoUser</b> and password
            <b>demoUser</b>.
          </p>
          <p>
            Note that demoUser has the overall permission of Area PO and the permissions of "PO", "developer" and "guest"
            for the 'Register your feature proposals and bug findings here' and 'Feel free
            to play with this product'.
            <br />So you can do almost everything. Please do not remove other peoples entries.
          </p>
        </div>
      </div>
    </div>
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
  console.log('onSubmit is fired')
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

.big-margin {
  margin-bottom: 6em;
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

.input input:focus {
  outline: none;
  border: 1px solid #521751;
  background-color: #eee;
}

.submit button {
  border: 1px solid #521751;
  color: #521751;
  padding: 10px 20px;
  font: inherit;
  cursor: pointer;
}

.submit button:hover,
.submit button:active {
  background-color: #408fae;
  color: white;
}

.submit button[disabled],
.submit button[disabled]:hover,
.submit button[disabled]:active {
  border: 1px solid #ccc;
  background-color: transparent;
  color: #ccc;
  cursor: not-allowed;
}
</style>
