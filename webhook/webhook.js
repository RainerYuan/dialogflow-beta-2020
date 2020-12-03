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

    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

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

  /**
   * category query function
   */
  async function catQuery() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    let catData = await apiGet(ENDPOINT_URL + '/categories')
    catData = catData.categories;
    let respond = 'Here is the list of categories:\n'

    for (let i = 0; i < catData.length; i++) {
      respond += (`${i + 1}.` + catData[i] + ' ')
    }
    agent.add(respond)

    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )

  }

  /**
   * cart number query fucntion
   */
  async function cartNumQuery() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    let cartData = await apiGet(ENDPOINT_URL + "/application/products")

    cartProduct = cartData.products;

    let respond = "there are total " + cartProduct.length + " items in your cart";
    agent.add(respond);

    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )
  }
  /**
   * cart type query function
   */

  async function cartTypeQuery() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )
    let cartData = await apiGet(ENDPOINT_URL + "/application/products")
    cartProduct = cartData.products;

    let catSet = new Set();
    cartProduct.forEach(item => {
      catSet.add(item.category);
    })

    // format here
    let arr = [...catSet]
    let str = "You have these types of items in you cart: ";
    // catSet.values().forEach((style, index) => {
    //   str += `${index + 1}` + style.toString() + ' ';
    // })

    for (let i = 0; i < arr.length; i++) {
      str += `${i + 1}.` + arr[i].toString() + ' ';
    }

    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + str, 'isUser': false }
    )

  }



  /**
   * cart price query function
   */
  async function cartPriceQuery() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    let cartData = await apiGet(ENDPOINT_URL + "/application/products")
    cartProduct = cartData.products;
    let sum = 0
    for (let i = 0; i < cartProduct.length; i++) {
      sum += (cartProduct[i].price * cartProduct[i].count)
    }
    let respond = "the total cost of items in your cart is: " + sum + ' dollars'
    agent.add(respond)
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )
  }

  /**
   * tag query function. also require catgories
   */
  async function tagQuery() {
    // user query
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    let cat = agent.parameters.categories
    let tagsData = await apiGet(ENDPOINT_URL + '/categories/' + cat + '/tags');
    let tags = tagsData.tags;

    let respond = 'Here is the list of tags for ' + `${cat}:` + '\n'
    for (let i = 0; i < tags.length; i++) {
      respond += (`${i + 1}.` + tags[i] + ' ')
    }

    agent.add(respond)

    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )
  }

  async function productInfo() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )
    let app = await apiGet(ENDPOINT_URL + '/application')
    let currpage = app.page
    let pid = agent.parameters.product


    if (!Number.isInteger(Number(currpage.substring(currpage.lastIndexOf("/") + 1)))) {
      await gotoPage({ 'page': currpage + '/products/' + pid })
    }

    let productInfo = await apiGet(ENDPOINT_URL + '/products/' + pid)
    let respond = 'Here is the product description: ' + productInfo.description
    agent.add(respond)
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )
  }

  async function productReview() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )
    let app = await apiGet(ENDPOINT_URL + '/application')
    let currpage = app.page

    if (!Number.isInteger(Number(currpage.substring(currpage.lastIndexOf("/") + 1)))) {
      let res = 'Could you go to a product page and then ask about its review? thanks!'
      agent.add(res)

      await apiPost(
        ENDPOINT_URL + "/application/messages",
        { 'text': '' + res, 'isUser': false }
      )
      return
    }


    let pid = currpage.substring(currpage.lastIndexOf("/") + 1)
    let reviewData = await apiGet(ENDPOINT_URL + '/products/' + pid + '/reviews')
    reviews = reviewData.reviews;

    let sum = 0.0;
    let respond = 'Hi, the average ratting of this product is '

    if (reviews.length === 0) {
      respond = 'I am sorry, the product currentlly has no review'
    } else {
      for (let i = 0; i < reviews.length; i++) {
        sum += reviews[i].stars;
      }
      let avg = sum / reviews.length;
      respond = respond + avg + ' stars. '
      respond += "\n Below is a list of reviews: "

      // output the first 5 reviews 
      for (let i = 0; i < reviews.length; i++) {
        if (i > 4) { break; }
        if (reviews[i].text !== '<Product Review Text>')
          respond += `${i + 1}.` + reviews[i].text
      }
    }

    agent.add(respond)
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )

  }

  async function narrowTag() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    let tagList = agent.parameters.tags
    for (let i = 0; i < tagList.length; i++) {
      await apiPost(ENDPOINT_URL + '/application/tags/' + tagList[i].toString());
    }

    let respond = "Sure, updating filter for you";
    agent.add(respond)
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )

  }

  async function clearFilter() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    await apiDelete(ENDPOINT_URL + '/application/tags');

    let respond = "Sure, updating filter for you";
    agent.add(respond)
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )
  }

  /**
   * function to add items in cart
   */
  async function cartAdd() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )

    let app = await apiGet(ENDPOINT_URL + '/application')
    let currpage = app.page
    let pid = agent.parameters.product

    if (!Number.isInteger(Number(currpage.substring(currpage.lastIndexOf("/") + 1)))) {
      let res = 'Could you go to a product page and then ask to add items!'
      agent.add(res)
      await apiPost(
        ENDPOINT_URL + "/application/messages",
        { 'text': '' + res, 'isUser': false }
      )
      return
    }

    pid = currpage.substring(currpage.lastIndexOf("/") + 1)
    let number = agent.parameters.number;

    for (let i = 0; i < number; i++) {
      await apiPost(ENDPOINT_URL + '/application/products/' + pid)
    }

    let respond = 'Got it, I have add the the items into your cart';
    agent.add(respond)

    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )
  }

  /**
   * Remove items from cart
   */
  async function cartRemove() {
    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + agent.query, 'isUser': true }
    )
    let pid = parseInt(agent.parameters.products);
    let num = parseInt(agent.parameters.number);
    for (let i = 0; i < num; i++) {
      await apiDelete(ENDPOINT_URL + '/application/products/' + pid)
    }

    let respond = 'Got it, I have removed those item From your cart';
    agent.add(respond)

    await apiPost(
      ENDPOINT_URL + "/application/messages",
      { 'text': '' + respond, 'isUser': false }
    )
  }





  /**
   * navigate function here
   */
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
  intentMap.set('Category Query Intent', catQuery)
  intentMap.set('Tags Query Intent', tagQuery)
  intentMap.set('Cart Num Intent', cartNumQuery)
  intentMap.set('Cart Price Intent', cartPriceQuery)
  intentMap.set('Cart Type Intent', cartTypeQuery)
  intentMap.set('product InfoQuery Intent', productInfo)
  intentMap.set('Product Reveiw Intent', productReview)
  intentMap.set('Filter Intent', narrowTag)
  intentMap.set('Clear Filter Intent', clearFilter)
  intentMap.set('Add to Cart Intent', cartAdd)
  intentMap.set('Remove From Cart Intent', cartRemove)
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
