var reply = require('reply');
 
var options = {
  name: {
    message : 'Please type in your name.',
    allow_empty: false // will require an answer 
  },
  username: {
    default : 'me', // if left empty, will fall back to this value 
    type    : 'string'    // ensure value is not a number 
  },
  gender: {
    options : ['male', 'female', 'animal', 'none of your business']
  },
  password: {
    message : 'Enter a password.',
    type    : 'password',
    regex   : /(\w{6})/,
    error   : 'Six chars minimum. Try again.'
  },
  animal: {
    message : "What's your favorite animal?",
    type : 'string'
  },
  state: {
    message : "What's your favorite state?",
    type : 'string'
  },
}
 
 
reply.get(options, function(err, answers) {
  console.log(answers); 

});