$(function(){
  // Constants
  PER_PAGE = 100

  // Construstor
  var Parser = function() {
    this.init()
  }

  /**
   * Init parser. One time call
   */
  Parser.prototype.init = function() {}

  /**
   * Before parse callback
   */
  Parser.prototype.beforeParse = function () {}

  /**
   * After parse callback
   * @param {Object} data
   */
  Parser.prototype.afterParse = function (data) {}

  /**
   * When error happens execute this callback
   * @param {String} message
   */
  Parser.prototype.onError = function (message) {}

  /**
   * When the progress of parsing changes
   * @param  {Integer} progress
   */
  Parser.prototype.onProgress = function() {}

  /**
   * Parser starting point
   */
  Parser.prototype.parse = function() {
    var that = this

    this.beforeParse()

    var filename = 'ad-data.json'
    $.getJSON(filename)
      .done(function(adItems) {
        filename = (filename.substring(0, filename.lastIndexOf('.')) || filename).toUpperCase();
        document.title = filename + ' - жизнь замечательных людей';
        var final_repo_info = that.transformAdData(filename, adItems || [])
        that.onProgress(100)
        that.afterParse(final_repo_info)
      })
      .fail(function() {
        that.onError('Failed to load data')
      })
  }

  Parser.prototype.transformAdData = function(header, adItems) {
    var final_repo_info = {
      name: header,
      description: 'Сотрудников: ' + adItems.length,
      labels: [],
      issues: [],
      earliest_issue_time: null
    }
    var labelsMap = {}
    var earliestTimestamp = +Infinity

    for (var i = 0; i < adItems.length; i++) {
      var item = adItems[i]
      var created = normalizeIsoDate(item.whenCreated) || formatDate(new Date())
      var isActive = item.active === true
      var lastLogon = null
      if (!isActive && item.lastLogon != null) {
        lastLogon = normalizeIsoDate(item.lastLogon)
      }
      var department = item.department
      var issueLabels = []

      if (department) {
        issueLabels.push(department)
        if (!labelsMap.hasOwnProperty(department)) {
          labelsMap[department] = {
            name: department,
            color: stringToColor(department)
          }
        }
      }

      final_repo_info.issues.push({
        url: '',
        title: item.cn || '(no cn)',
        cn: item.cn || '(no cn)',
        department: department,
        active: isActive,
        whenCreated: created,
        lastLogon: lastLogon,
        state: lastLogon === null ? 'open' : 'closed',
        open: [{from: created, to: lastLogon}],
        labels: issueLabels,
        number: i + 1
      })

      if (created != null) {
        var createdTs = Date.parse(created)
        if (!isNaN(createdTs) && createdTs < earliestTimestamp) {
          earliestTimestamp = createdTs
          final_repo_info.earliest_issue_time = created
        }
      }
    }

    for (var key in labelsMap) {
      final_repo_info.labels.push(labelsMap[key])
    }

    if (final_repo_info.earliest_issue_time == null) {
      final_repo_info.earliest_issue_time = formatDate(new Date())
    }

    return final_repo_info
  }

  /**
   * Return a string representation of the date in format YYYY-MM-DD
   * @param  {Date} date_obj
   * @return {String}
   */
  function formatDate(date_obj) {
    var date = date_obj.getDate()
    var month = date_obj.getMonth() + 1
    var year = date_obj.getFullYear()
    return year + "-" + pad2(month) + "-" + pad2(date)
  }

  function normalizeIsoDate(isoString) {
    if (!isoString) {
      return null
    }

    var date = new Date(isoString)
    if (isNaN(date.getTime())) {
      return null
    }

    return formatDate(date)
  }

  function stringToColor(value) {
    var hash = 0
    for (var i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash)
      hash = hash & hash
    }

    var color = ''
    for (var j = 0; j < 3; j++) {
      var channel = (hash >> (j * 8)) & 255
      color += ('00' + channel.toString(16)).slice(-2)
    }

    return color
  }

  /**
   * Pad a number to 2 digits
   * @param  {Number} number
   * @return {String}
   */
  function pad2(number) {
    return (number < 10 ? '0' : '') + number
  }

  window.Parser = Parser
})
