const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

let username = "";
let password = "";
let token = "";

USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = ""
if (USE_LOCAL_ENDPOINT) {
  ENDPOINT_URL = "http://127.0.0.1:5000"
} else {
  ENDPOINT_URL = "https://mysqlcs639.cs.wisc.edu"
}



async function getToken() {
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode(username + ':' + password)
    },
    redirect: 'follow'
  }

  const serverReturn = await fetch(ENDPOINT_URL + '/login', request)
  const serverResponse = await serverReturn.json()
  token = serverResponse.token

  return token === undefined ? serverResponse.message : "you have login successfully"
}

async function apiGet(endpoint) {
  let req = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
      "Authorization": "Basic Og=="
    }
  };

  const serverReturn = await fetch(endpoint, req)
  const serverResponse = await serverReturn.json()
  return serverResponse
}

async function apiPut(endpoint, content) {
  let req = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify(content)
  };
  const serverReturn = await fetch(endpoint, req)
  const serverResponse = await serverReturn.json()
  return serverResponse
}
async function apiPost(endpoint, content) {
  let req = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify(content)
  };
  const serverReturn = await fetch(endpoint, req)
  console.log(serverReturn.status)
  const serverResponse = await serverReturn.json()

  return serverResponse
}

async function apiDelete(endpoint) {
  let req = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    }
  };

  const serverReturn = await fetch(endpoint, req)
  const serverResponse = await serverReturn.json()
  return serverResponse
}


async function gotoPage(content) {
  await apiPut('https://mysqlcs639.cs.wisc.edu/application', content)
}


app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })

  async function welcome() {
    agent.add('Webhook works!')
    let message = ["Hi there!", "I'm your voice shop assitant bucky", "What can I do for you"]

    agent.add(message[0])
    agent.add(message[1])
    agent.add(message[2])

    await apiPost(
      ENDPOINT_URL + '/application/messages',
      { 'text': '' + message[0] + '\n' + message[1] + '\n' + message[2], 'isUser': false }
    )


    console.log(ENDPOINT_URL)
  }



  async function login() {
    // You need to set this from `username` entity that you declare in DialogFlow
    username = agent.parameters.username
    // You need to set this from password entity that you declare in DialogFlow
    password = agent.parameters.password
    let message = await getToken()
    if (message === "you have login successfully") {
      // login successful change to next page and maby be delete message
      await apiDelete(ENDPOINT_URL + '/application/messages')
      await gotoPage({ 'page': '/' + username })

    }

    agent.add(message)
  }

  async function navigate() {

    //post agent query
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    //set up respond text
    respond = ['No problem!', 'Sure!', 'Navigating...']

    let desitination = agent.parameters.page
    if (desitination !== null) {
      let i = Math.round(Math.random() * 2)
      agent.add(respond[i])
      await apiPost(ENDPOINT_URL + "/application/messages", {
        'text': '' + respond[i], 'isUser': false
      })

      if (desitination === 'Home') {
        await gotoPage({ 'page': '/' + username })
      } else if (desitination === 'Back') {
        await gotoPage({ 'back': true })
      } else if (desitination === 'Cart') {
        await gotoPage({ 'page': '/' + username + '/cart' })
      } else if (desitination === 'Hats') {
        await gotoPage({ 'page': '/' + username + '/hats' })
      } else if (desitination === 'Sweatshirts') {
        await gotoPage({ 'page': '/' + username + '/sweatshirts' })
      } else if (desitination === 'Leggings') {
        await gotoPage({ 'page': '/' + username + '/leggings' })
      } else if (desitination === 'Tees') {
        await gotoPage({ 'page': '/' + username + '/tees' })
      } else if (desitination === 'Bottoms') {
        await gotoPage({ 'page': '/' + username + '/bottoms' })
      } else if (desitination === 'Plushes') {
        await gotoPage({ 'page': '/' + username + '/plushes' })
      }
    }

  }





  //function for sending out message




  let intentMap = new Map()
  intentMap.set('Default Welcome Intent', welcome)
  // You will need to declare this `Login` content in DialogFlow to make this work
  intentMap.set('Login', login)
  intentMap.set('Navigate Intent', navigate)
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
