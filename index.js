// Imports readline.
var rl, readline = require('readline');

// Creates an interface if one doesn't already exist. If it does exist, then resumes current interface.
/**
 * @param stdin
 * @param stdout
 * @returns rl
 */
var get_interface = function(stdin, stdout) {
  if (!rl) rl = readline.createInterface(stdin, stdout);
  else stdin.resume(); // interface exists
  return rl;
}

// Sets up message and question with default 'yes' answer. Sets up question to prompt the user.
/**
 * @param message
 * @param callback
 */
var confirm = exports.confirm = function(message, callback) {

  var question = {
    'reply': {
      type: 'confirm',
      message: message,
      default: 'yes'
    }
  }
  
// Gets a yes/no question from user. If no question is asked, then error will appear.
/**
 * @params err
 * @params answer
 * @returns callback(err)
 */
  get(question, function(err, answer) {
    if (err) return callback(err);
    callback(null, answer.reply === true || answer.reply == 'yes');
  });

};

// Prompts the user for answers, uses default answer if applicable, validates the answer, and moves onto the next question and shows errors if applicable. Allows user to end prompt as well.
/**
 * @param options
 * @param callback
 * @returns {} || @returns callback
 */
var get = exports.get = function(options, callback) {

  if (!callback) return; // no point in continuing

  if (typeof options != 'object')
    return callback(new Error("Please pass a valid options object."))

  var answers = {},
      stdin = process.stdin,
      stdout = process.stdout,
      fields = Object.keys(options);

// Calls for answers from user at the end.
  var done = function() {
    close_prompt();
    callback(null, answers);
  }

// Pauses input, ends the prompt for the user if readline is finished.
/**
 * @returns {}
 */
  var close_prompt = function() {
    stdin.pause();
    if (!rl) return;
    rl.close();
    rl = null;
  }

// Checks available questions for default answer and uses the default if present.
/**
 * @param key
 * @param partial_answers
 * @returns default values if present
 */
  var get_default = function(key, partial_answers) {
    if (typeof options[key] == 'object')
      return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default;
    else
      return options[key];
  }

// Passes in user input and returns the type of the input and their reply.
/**
 * @param reply
 * @returns boolean, integer, and string
 */
  var guess_type = function(reply) {

    if (reply.trim() == '')
      return;
    else if (reply.match(/^(true|y(es)?)$/))
      return true;
    else if (reply.match(/^(false|n(o)?)$/))
      return false;
    else if ((reply*1).toString() === reply)
      return reply*1;

    return reply;
  }

// Returns a boolean checking that the answer is valid.
/**
 * @param key
 * @param answer
 * @returns boolean
 */
  var validate = function(key, answer) {

    if (typeof answer == 'undefined')
      return options[key].allow_empty || typeof get_default(key) != 'undefined';
    else if(regex = options[key].regex)
      return regex.test(answer);
    else if(options[key].options)
      return options[key].options.indexOf(answer) != -1;
    else if(options[key].type == 'confirm')
      return typeof(answer) == 'boolean'; // answer was given so it should be
    else if(options[key].type && options[key].type != 'password')
      return typeof(answer) == options[key].type;

    return true;

  }

// Displays error message when invalid input is given. Lists options if options are present.
/**
 * @param key
 */
  var show_error = function(key) {
    var str = options[key].error ? options[key].error : 'Invalid value.';

    if (options[key].options)
        str += ' (options are ' + options[key].options.join(', ') + ')';

    stdout.write("\033[31m" + str + "\033[0m" + "\n");
  }

// Displays the question with the options in it.
/**
 * @param key
 */
  var show_message = function(key) {
    var msg = '';

    if (text = options[key].message)
      msg += text.trim() + ' ';

    if (options[key].options)
      msg += '(options are ' + options[key].options.join(', ') + ')';

    if (msg != '') stdout.write("\033[1m" + msg + "\033[0m\n");
  }

  // taken from commander lib
  // Tests and validates the password.
  /**
 * @param prompt
 * @param callback
 */
  var wait_for_password = function(prompt, callback) {

    var buf = '',
        mask = '*';
    /**
    * @param c
    * @param key
    * @returns callback(buf)
    */
    var keypress_callback = function(c, key) {
        
      // Returns an empty string for password.
      if (key && (key.name == 'enter' || key.name == 'return')) {
        stdout.write("\n");
        stdin.removeAllListeners('keypress');
        // stdin.setRawMode(false);
        return callback(buf);
      }
      // Closes the prompt.
      if (key && key.ctrl && key.name == 'c')
        close_prompt();
        
      // Removes typed characters.
      if (key && key.name == 'backspace') {
        buf = buf.substr(0, buf.length-1);
        var masked = '';
        for (i = 0; i < buf.length; i++) { masked += mask; }
        stdout.write('\r\033[2K' + prompt + masked);
      } else {
        stdout.write(mask);
        buf += c;
      }

    };

    stdin.on('keypress', keypress_callback);
  }

  // Applies the answer and checks if answer is valid. Moves onto the next question if answer is valid or repeats current question.
  /**
 * @param index
 * @param curr_key
 * @param fallback
 * @param reply
 */
  var check_reply = function(index, curr_key, fallback, reply) {
    var answer = guess_type(reply);
    var return_answer = (typeof answer != 'undefined') ? answer : fallback;

    if (validate(curr_key, answer))
      next_question(++index, curr_key, return_answer);
    else
      show_error(curr_key) || next_question(index); // repeats current
  }

// Returns a boolean that shows if dependencies are met or not.
/**
 * @param conds
 * @returns boolean
 */
  var dependencies_met = function(conds) {
    for (var key in conds) {
      var cond = conds[key];
      if (cond.not) { // object, inverse
        if (answers[key] === cond.not)
          return false;
      } else if (cond.in) { // array 
        if (cond.in.indexOf(answers[key]) == -1) 
          return false;
      } else {
        if (answers[key] !== cond)
          return false; 
      }
    }

    return true;
  }

// Checks if answers are equal and prompts options for questions. Shows default answer if there is one and the question. Checks if question is password related, waits for password, then prompts the next question.
/**
 * @param index
 * @param prev_key
 * @param answer
 * @returns done() or next_question
 */
  var next_question = function(index, prev_key, answer) {
    if (prev_key) answers[prev_key] = answer;

    var curr_key = fields[index];
    if (!curr_key) return done();

    if (options[curr_key].depends_on) {
      if (!dependencies_met(options[curr_key].depends_on))
        return next_question(++index, curr_key, undefined);
    }

    var prompt = (options[curr_key].type == 'confirm') ?
      ' - yes/no: ' : " - " + curr_key + ": ";

    var fallback = get_default(curr_key, answers);
    if (typeof(fallback) != 'undefined' && fallback !== '')
      prompt += "[" + fallback + "] ";

    show_message(curr_key);

    if (options[curr_key].type == 'password') {

      var listener = stdin._events.keypress; // to reassign down later
      stdin.removeAllListeners('keypress');

      // stdin.setRawMode(true);
      stdout.write(prompt);

      wait_for_password(prompt, function(reply) {
        stdin._events.keypress = listener; // reassign
        check_reply(index, curr_key, fallback, reply)
      });

    } else {

      rl.question(prompt, function(reply) {
        check_reply(index, curr_key, fallback, reply);
      });

    }

  }

  rl = get_interface(stdin, stdout);
  next_question(0);

  rl.on('close', function() {
    close_prompt(); // just in case

/**
 * @returns {}
 */
    var given_answers = Object.keys(answers).length;
    if (fields.length == given_answers) return;

    var err = new Error("Cancelled after giving " + given_answers + " answers.");
    callback(err, answers);
  });

}
