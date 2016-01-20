var reply = require('reply');

reply.confirm('Are you ready to rumble?', function(err, yes) {
  var answer = (!err && yes) ? "Fantastic!" : 'Awww too bad.';
  console.log(answer);
});