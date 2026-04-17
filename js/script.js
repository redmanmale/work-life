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
    , $graphsStage = $('#graphs-stage')  /*
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

  function showGraphsLoader() {
    $graphsStage.addClass('is-loading')
  }

  function hideGraphsLoader() {
    $graphsStage.removeClass('is-loading')
  }

  /*
    Parser callbacks
  */
  parser.beforeParse = function(){
    $repoTitle.text(loadingText)
    $repoDescription.text(loadingText)
    lockInput()

    showGraphsLoader()
    visuals.emptyGraphs()
  }

  parser.afterParse = function(data){
    $repoTitle.text(data.name || '')
    $repoDescription.text(data.description || '')
    unlockInput()

    visuals.showData(data, function() {
      hideGraphsLoader()
    })
  }

  parser.onError = function(message){
    $repoTitle.text(errorText)
    $repoDescription.text(errorText)
    unlockInput()
    lastInputValue = null
    hideGraphsLoader()

    showAlert('<strong>Error occured!</strong> ' + message, 'danger')
  }

  parser.onProgress = function(){}

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
})
