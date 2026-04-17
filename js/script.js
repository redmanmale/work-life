$(function(){
  var parser = new Parser()
    , visuals = new Visuals('graph')
    , $repoTitle = $('#repo-title')
    , $repoDescription = $('#repo-description')
    , loadingText = 'Loading...'
    , errorText = 'Error'
    , $repositoryAlert = $('#repository-alert')
    , parsingLocked = false
    , repositoryUri = 'local/ad-data'
    , $graphs = $('#graphs')
    , $progress = $('#progress')
    , $progressBar = $progress.children('.progress-bar')
    , $tokenForm = $('#token-form')
    , $tokenInput = $('#token-input')
    , $tokenButton = $('#token-button')

  /*
    Alert
  */

  /**
   * Display alert message
   * @param  {String} message Message may contain html elements
   * @param  {String} type    success, info, warning or danger. info by default
   */
  function showAlert(message, type) {
    type = type !== void 0 ? type : 'info'

    $repositoryAlert
      .html(message)
      .removeClass('alert-success alert-info alert-warning alert-danger')
      .addClass('alert-' + type)
      .show()
  }

  function hideAlert() {
    $repositoryAlert.hide()
  }

  function setProgress(progress) {
    $progressBar
      .attr('aria-valuenow', progress)
      .width(progress + '%')
      .text(progress + '%')
  }


  /*
    Parser callbacks
  */
  parser.beforeParse = function(){
    $repoTitle.text(loadingText)
    $repoDescription.text(loadingText)
    lockInput()

    $graphs.hide()
    visuals.emptyGraphs()
    $progress.show()
  }

  parser.afterParse = function(data){
    $repoTitle.text(data.name || '')
    $repoDescription.text(data.description || '')
    unlockInput()

    $progress.hide()
    setProgress(0)
    $graphs.show()

    visuals.showData(data)
  }

  parser.onError = function(message){
    $repoTitle.text(errorText)
    $repoDescription.text(errorText)
    unlockInput()
    lastInputValue = null

    $progress.hide()
    setProgress(0)

    showAlert('<strong>Error occured!</strong> ' + message, 'danger')
  }

  parser.onProgress = function(progress){
    setProgress(progress)
  }

  /*
    Lock input while loading
  */
  function lockInput() {
    parsingLocked = true
  }

  function unlockInput() {
    parsingLocked = false
  }

  function runParse() {
    // Do not check if script is still working
    if (parsingLocked) {
      return
    }

    hideAlert()
    parser.parse(repositoryUri)
  }

  runParse()

  /*
    Authentication
  */
  // Init authentication
  hello.init({github : "689dea3122f7c6cd4dba"})

  // Show the message with auth request
  parser.onAuthRequired = function(repositoryUri) {
    unlockInput()
    showAlert('<strong>API rate limit exceeded</strong> You have exceeded your API requests rate limit or you have no permissions to view this repository issues. In order to increase limit please <a href="#" class="authorization-request">authorize</a> this application. Alternatively you can <a href="https://help.github.com/articles/creating-an-access-token-for-command-line-use" target="_blank">generate a token</a> and <a href="#" class="toggle-token-input">set it manually</a>.<br><br><a class="btn btn-warning authorization-request">Click here to authorize application</a>', 'warning')
  }

  // Auth request
  $('#repository-alert').on('click', '.authorization-request', function(ev){
    ev.preventDefault()

    hello('github').login({redirect_uri: 'redirect.html'}).then(function() {
      var github = hello("github").getAuthResponse()

      parser.token = github.access_token
      // Save into cookies
      document.cookie = "token=" + github.access_token

      // Continue with parsing
      runParse()
    }, function(error) {
      console.log('Error, failed to auth: ', error)
    })
  })

  /*
  Token input
   */

  $('body').on('click', '.toggle-token-input', function(ev){
    ev.preventDefault()

    $tokenForm.toggle(function(){
      if ($(this).css('display') !== 'none') {
        // Update token input
        $tokenInput.val(parser.token)
      }
    })
  })

  $tokenForm.submit(function(ev){
    ev.preventDefault()

    var token = $tokenInput.val()

    // Update token
    parser.token = token
    // Save into cookies
    document.cookie = "token=" + token

    $tokenForm.hide()
  })

  // display-token-input
})
