$(function(){
  // Construstor
  var Visuals = function(selector) {
    this.init(selector)
  }

  var NO_LABEL_COLOR = 'ccc'
    , NO_LABEL_TITLE = 'без отдела'
    , MARGIN_RIGHT = 30
    , MARGIN_LEFT = 0
    , STROKE_OPACITY = 0.4
    , STROKE_OPACITY_ACTIVE = 0.9
    ;

  /**
   * Init visuals. One time call
   * @param  {String} selector
   */
  Visuals.prototype.init = function(selector) {
    var that = this
      , $svg1 = $('#stackedArea svg')
      , $svg2 = $('#semiCircles svg')
      , $graphs = $('#graphs')

    // Init semicircles container
    d3.select('#semiCircles')
      // .style('margin-left', MARGIN_LEFT)
      // .style('margin-right', MARGIN_RIGHT + 'px')

    // On resize
    var onResize = function(ev){
      if (that.lastData != null) {
        that.showSemiCircles(that.lastData, that.lastSplitIssues, false)
      }

      var width = $graphs.width()
        , svg1Height = Math.ceil(Math.max(200, width / 3))
        , svg2Height = Math.ceil(Math.max(200, width / 2.5))

      $svg1.height(svg1Height)
      $svg2.height(svg2Height)
    }
    // Trigger on resize for the first time
    onResize()

    window.addEventListener('resize', onResize)
  }

  Visuals.prototype.emptyGraphs = function() {
    d3.selectAll('#stackedArea > svg > *').remove()
    d3.selectAll('#semiCircles > svg > *').remove()
  }

  /**
   * Transforms a date of type YYYY-MM-DD into timestamp
   * @param  {String} str
   * @return {Integer}     timestamp
   */
  function dateToTimestamp(str) {
    if (str == null) {
      // Today
      return Math.ceil(Date.now() / 86400000) * 86400000
    } else {
      var d = str.match(/\d+/g)
      return Date.UTC(d[0], d[1] - 1, d[2])
    }
  }

  Visuals.prototype.showData = function(data, onRendered) {
    console.log(data)
    var splitIssues = splitIssuesByOpenTime(data)

    this.showStackedArea(data, onRendered)
    this.showSemiCircles(data, splitIssues)
    this.showEmployeesStats(data)

    this.lastData = data
    this.lastSplitIssues = splitIssues
  }

  Visuals.prototype.showStackedArea = function(data, onRendered) {
    // Bootstrap stacked area object
    var processedData = bootstrapStackedAreaObject(data)

    // Add time-values to each issue
    fillTimeValues(processedData, data)

    // Object to Array
    var processedDataArray = []
    for (var p in processedData) {
      processedDataArray.push(processedData[p])
    }

    drawStackedArea(processedDataArray, onRendered)
  }

  function bootstrapStackedAreaObject(data) {
    var datesMilisecondsRange = {}
      , start = dateToTimestamp(data.earliest_issue_time)
      , today = dateToTimestamp(null) + 1

    // Fill dates range
    while (start < today) {
      datesMilisecondsRange[start] = 0
      start += 86400 * 1000
    }

    var processedData = {}
      , label
      , i

    // Add all labels
    for (i in data.labels) {
      label = data.labels[i]

      processedData[label.name] = {key: label.name, values: [], time: Object.create(datesMilisecondsRange), color: '#' + label.color}
    }

    // Add no label
    processedData[NO_LABEL_TITLE] = {key: NO_LABEL_TITLE, values: [], time: Object.create(datesMilisecondsRange), color: '#' + NO_LABEL_COLOR}

    return processedData
  }

  function fillTimeValues(processedData, data) {
    var i
      , issue
      , l
      , label
      , o
      , open
      , d
      , from
      , to

    // Go throuch all issues
    for (i in data.issues) {
      issue = data.issues[i]

      // If issue has no labels than assign 'no label' label
      if (issue.labels.length === 0) {
        issue.labels.push(NO_LABEL_TITLE)
      }

      // For each label
      for (l in issue.labels) {
        label = issue.labels[l]

        // For each open range
        for (o in issue.open) {
          open = issue.open[o]

          from = dateToTimestamp(open.from)
          to = dateToTimestamp(open.to)

          // Fill label time-value object
          while(from <= to) {
            processedData[label].time[from] += 1
            from += 86400 * 1000 // 3600 * 24 * 1000
          }
        }
      }
    }

    var p
      , _data
      , t

    for (p in processedData) {
      _data = processedData[p]

      // Add tuples of timeKey-value to values array
      for (t in _data.time) {
        _data.values.push([+t, _data.time[t]])
      }

      // Sort values by timeKey
      _data.values.sort(function(a, b){
        return a[0] - b[0]
      })

      // Get rid of time array
      delete _data.time
    }
  }

  function drawStackedArea(processedDataArray, onRendered) {
    var _chart // Keeps chart instance
      , rendered = false

    nv.dev = false
    nv.addGraph(function() {
      var chart = nv.models.stackedAreaChart()
        .margin({
          right: MARGIN_RIGHT
        , left: 0
        , bottom: 10
        })
        .x(function(d) { return d[0] })
        .y(function(d) { return d[1] })
        .useInteractiveGuideline(true)    // Tooltips which show all data points
        .rightAlignYAxis(true)            // Let's move the y-axis to the right side.
        .transitionDuration(500)
        .showControls(false)              // Allow user to choose 'Stacked', 'Stream', 'Expanded' mode.
        .clipEdge(true)
        // .showLegend(false)
        .showXAxis(false)                 // Hide X Axis (dates)
        // .showYAxis(false)
        .showLegend(false)                // Hide legend
        .transitionDuration(0)

      //Format x-axis labels with custom function.
      chart.xAxis.tickFormat(function(d) {
        return d3.time.format('%x')(new Date(d))
      });

      chart.yAxis.tickFormat(d3.format(',.0f'));

      d3.select('#stackedArea svg')
        .datum(processedDataArray)
        .call(chart);

      nv.utils.windowResize(chart.update);

      _chart = chart
      return chart;
    });

    // After renderer finished
    function completeRender() {
      if (rendered) {
        return
      }

      rendered = true

      // Remove onClick dispatch
      _chart.stacked.dispatch.on('areaClick.toggle', null)

      if (typeof onRendered === 'function') {
        onRendered()
      }
    }

    nv.dispatch.on('render_end.visuals', completeRender)

    setTimeout(completeRender, 400)
  }

  function dateToDays(str) {
    return dateToTimestamp(str) / 86400000
  }

  function getLabelColor(data, labelName) {
    for (var l in data.labels) {
      if (data.labels[l].name === labelName) {
        return data.labels[l].color
      }
    }

    return NO_LABEL_COLOR
  }

  function getIssuesColors(data) {
    var issuesColors = []
      , issue

    for (var i in data.issues) {
      issue = data.issues[i]

      if (issue.labels.length === 0) {
        issuesColors[issue.number] = ['#' + NO_LABEL_COLOR]
      } else {
        issuesColors[issue.number] = issue.labels.map(function(label){
          return '#' + getLabelColor(data, label)
        })
      }
    }

    return issuesColors
  }

  function splitIssuesByOpenTime(data) {
    var issue
      , splitIssues = data.issues.slice()
      , splitIssuesLength = splitIssues.length
      , i, l
      , _open
      // Variable to keep links of SVG elements
      , _linked

    for (i = 0; i < splitIssuesLength; i++) {
      issue = splitIssues[i]
      _open = issue.open.slice()
      _linked = []

      if (issue.open.length > 1) {
        for (l = issue.open.length - 1; l > 0; l--) {
          splitIssues.push({
            labels: issue.labels
          , number: issue.number
          , open: [issue.open[l]]
          , _open: _open
          , state: issue.state
          , title: issue.title
          , url: issue.url
          , _linked: _linked
          })

          // Update length after removing
          issue.open.length -= 1
        }

        issue.open = [issue.open[0]]
        issue._open = _open
        issue._linked = _linked
      } else {
        issue._open = _open
        issue._linked = _linked
      }
    }

    return splitIssues
  }

  Visuals.prototype.showSemiCircles = function(data, splitIssues, createNew) {
    var container = d3.select('#semiCircles')
      , $container = $('#semiCircles')
      , svg = container.select('svg')
      , width = svg[0][0].getBoundingClientRect().width
      , height = svg[0][0].getBoundingClientRect().height
      , start = dateToDays(data.earliest_issue_time)
      , today = dateToDays(null)
      , scale = d3.scale.linear().domain([0, today - start]).range([MARGIN_LEFT, width + MARGIN_LEFT])
      , issuesColors = getIssuesColors(data)

    // By default create new is true
    createNew = createNew === void 0 ? true : createNew

    if (createNew) {
      this.semiCircles = svg
        .selectAll("circle")
        .data(splitIssues)
        .enter()
        .append('circle')
        .attr("cy", 0)
        .attr('cy', 0)
        .attr('r', 0)
        .style("fill", 'none')
        .style('stroke', function(d) {
          // Add to linked list
          d._linked.push(this)

          if (issuesColors.length >= d.number) {
            return issuesColors[d.number][0]
          } else {
            return NO_LABEL_COLOR
          }
        })
        .style('stroke-opacity', 0.5)
        .style('stroke-width', 2)
        .on('mouseover', function(d){
          for (var i = 0; i < d._linked.length; i++) {
            d3.select(d._linked[i]).style({'stroke-opacity': STROKE_OPACITY_ACTIVE})
          }
          displayTooltip(d, d3.mouse(this), data)
        })
        .on('mouseout', function(d){
          for (var i = 0; i < d._linked.length; i++) {
            d3.select(d._linked[i]).style({'stroke-opacity': STROKE_OPACITY})
          }
          hideTooltip(d, d3.mouse(this))
        })
        .on('mousemove', function(d){
          moveTooltip(d, d3.mouse(this), svg[0][0])
        })
    }

    // Only if we have semicircles
    if (this.semiCircles != null) {
      // Attributes that vary on window resize
      this.semiCircles
        .data(splitIssues)
        // .transition()
        //   .duration(500)
        .attr("cx", function (d) {
          var from = dateToDays(d.open[0].from)
            , closed_at = d.open[d.open.length - 1].to
            , to = dateToDays(closed_at)

          if (closed_at !== null) {
            return scale((to + from)/2 - start)
          } else {
            // Make it quater of the circle with today as center
            return scale(to - start)
          }
        })
        .attr("r", function (d) {
          var from = dateToDays(d.open[0].from)
            , closed_at = d.open[d.open.length - 1].to
            , to = dateToDays(closed_at)

          if (closed_at !== null) {
            return scale(to - from + 1) / 2
          } else {
            // Make it quater of the circle if it is still open
            return scale(to - from + 0.5)
          }
        })
    }
  }

  var $tooltip = $('#nvtooltip-semicircles')
    , $tooltipTitle = $tooltip.find('.title')
    , $tooltipBody = $tooltip.find('tbody')
    , $tooltipStub = $tooltip.find('.stub')

  /**
   * Formats a timestamp to MM/DD/YYYY
   * @param  {Integer} timestamp
   * @return {String}
   */
  function formatTimestamp(timestamp) {
    var date = new Date(timestamp)
    return ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + '/' +  date.getFullYear()
  }

  /**
   * Russian plural: 1 год, 2 года, 5 лет
   */
  function ruPlural(n, one, few, many) {
    var n10 = n % 10
    var n100 = n % 100
    if (n10 === 1 && n100 !== 11) return one
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 > 20)) return few
    return many
  }

  /**
   * Inclusive calendar tenure as Y/M/D (same span as dateToDays(to)-dateToDays(from)+1).
   */
  function tenureYmdInclusive(fromStr, toStr) {
    var p = fromStr.match(/\d+/g)
    var fy = +p[0]
    var fm = +p[1]
    var fd = +p[2]
    var toExclusiveTs = dateToTimestamp(toStr) + 86400000
    var end = new Date(toExclusiveTs)
    var ty = end.getUTCFullYear()
    var tm = end.getUTCMonth() + 1
    var td = end.getUTCDate()
    var years = ty - fy
    var months = tm - fm
    var days = td - fd
    if (days < 0) {
      months -= 1
      days += new Date(Date.UTC(ty, tm - 1, 0)).getUTCDate()
    }
    if (months < 0) {
      years -= 1
      months += 12
    }
    return { years: years, months: months, days: days }
  }

  function formatTenureYmd(ymd) {
    var parts = []
    if (ymd.years > 0) {
      parts.push(
        ymd.years +
          ' ' +
          ruPlural(ymd.years, 'год', 'года', 'лет')
      )
    }
    if (ymd.months > 0) {
      parts.push(
        ymd.months +
          ' ' +
          ruPlural(ymd.months, 'месяц', 'месяца', 'месяцев')
      )
    }
    if (ymd.days > 0) {
      parts.push(
        ymd.days + ' ' + ruPlural(ymd.days, 'день', 'дня', 'дней')
      )
    }
    if (parts.length === 0) {
      return 'и дня не отработал'
    }
    return parts.join(' ')
  }

  function formatInclusiveRangeTenure(fromStr, toStr) {
    return formatTenureYmd(tenureYmdInclusive(fromStr, toStr))
  }

  /** Inclusive day count from hire to last day (or «today» if toStr is null). */
  function inclusiveUtcDaySpan(fromStr, toStr) {
    var endMs = toStr != null ? dateToTimestamp(toStr) : dateToTimestamp(null)
    return Math.floor((endMs - dateToTimestamp(fromStr)) / 86400000) + 1
  }

  /**
   * Длительность по числу дней (как в «Средний стаж»): грубое Y/M от суток.
   */
  function formatDurationDays(days) {
    days = Math.max(0, Math.floor(days))
    if (days < 365) {
      return days + ' ' + ruPlural(days, 'день', 'дня', 'дней')
    }

    var years = Math.floor(days / 365)
    var months = Math.floor((days % 365) / 30)
    var parts = [years + ' ' + ruPlural(years, 'год', 'года', 'лет')]
    if (months > 0) {
      parts.push(
        months + ' ' + ruPlural(months, 'месяц', 'месяца', 'месяцев')
      )
    }
    return parts.join(' ')
  }

  function ymdFromUtcMs(ms) {
    var d = new Date(ms)
    return (
      d.getUTCFullYear() +
      '-' +
      ('0' + (d.getUTCMonth() + 1)).slice(-2) +
      '-' +
      ('0' + d.getUTCDate()).slice(-2)
    )
  }

  function displayTooltip(d, mouse, data) {
    var i

    $tooltipTitle.text('имя: ' + (d.cn || d.title))

    // Remove previous body
    $tooltipBody.children().not('.stub').remove()

    for (i = 0; i < d.labels.length; i++) {
      $tooltipStub
        .clone()
        .removeClass('stub')
          .find('.legend-color-guide > div')
          .css('background-color', '#' + getLabelColor(data, d.labels[i]))
        .end()
          .find('.key')
          .text('отдел: ' + d.labels[i])
        .end()
        .appendTo($tooltipBody)
        .show()
    }

    for (i = 0; i < d._open.length; i++) {
      $tooltipStub
        .clone()
        .removeClass('stub')
          .find('.legend-color-guide > div')
          .addClass('glyphicon glyphicon-eye-open')
        .end()
          .find('.key')
          .text('принят: ' + formatTimestamp(dateToTimestamp(d._open[i].from)))
        .end()
        .appendTo($tooltipBody)
        .show()

      if (d._open[i].to !== null) {
        $tooltipStub
          .clone()
          .removeClass('stub')
            .find('.legend-color-guide > div')
            .addClass('glyphicon glyphicon-eye-close')
          .end()
            .find('.key')
            .text('уволен: ' + formatTimestamp(dateToTimestamp(d._open[i].to)))
          .end()
          .appendTo($tooltipBody)
          .show()

        $tooltipStub
          .clone()
          .removeClass('stub')
            .find('.legend-color-guide > div')
            .addClass('glyphicon glyphicon-time')
          .end()
            .find('.key')
            .text(
              'проработал: ' +
                formatInclusiveRangeTenure(
                  d._open[i].from,
                  d._open[i].to
                )
            )
          .end()
          .appendTo($tooltipBody)
          .show()
      } else {
        $tooltipStub
          .clone()
          .removeClass('stub')
            .find('.legend-color-guide > div')
            .addClass('glyphicon glyphicon-time')
          .end()
            .find('.key')
            .text(
              'работает уже: ' + formatInclusiveRangeTenure(
                d._open[i].from,
                null
              )
            )
          .end()
          .appendTo($tooltipBody)
          .show()
      }
    }

    $tooltip.show()
  }

  function moveTooltip(d, mouse, svg) {
    var x = mouse[0]
      , y = mouse[1]
      , xPadding = 50
      , width = svg.offsetWidth
      , height = svg.offsetHeight
      , tooltipWidth = $tooltip.width()
      , tooltipHeight = $tooltip.height()

    if (x + xPadding + tooltipWidth > width) {
      // position tooltip to the left of mouse
      $tooltip.css('left', x - xPadding - tooltipWidth)
    } else {
      // position tooltip to the right of the mouse
      $tooltip.css('left', x + xPadding)
    }

    $tooltip.css('top', y - Math.ceil(tooltipHeight / 2))
  }

  function hideTooltip(d, mouse) {
    $tooltip.hide()
  }

  function toDateOrNow(dateString) {
    if (dateString == null) {
      return new Date()
    }

    var date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return new Date()
    }

    return date
  }

  function daysBetween(start, end) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
  }

  function formatPercent(value) {
    return (value * 100).toFixed(1) + '%'
  }

  function createStatCardsHTML(items) {
    var html = ''
    for (var i = 0; i < items.length; i++) {
      html += '<div class="col-sm-6 col-md-4"><div class="stat-card">'
      html += '<p class="stat-label">' + _.escape(items[i].label) + '</p>'
      html += '<p class="stat-value">' + _.escape(items[i].value) + '</p>'
      html += '</div></div>'
    }
    return html
  }

  Visuals.prototype.showEmployeesStats = function(data) {
    var issues = data.issues || []
    var totalEmployees = issues.length
    var activeEmployees = 0
    var firedEmployees = 0
    var oneYearPlus = 0
    var twoYearsPlus = 0
    var sinceFoundation = 0
    var shortest = null
    var longest = null
    var totalTenureDays = 0
    var departmentActive = {}
    var earliestHireDate = toDateOrNow(data.earliest_issue_time)
    var now = new Date()
    var firstMonthFromFoundationEnds = new Date(earliestHireDate.getTime() + 3 * 30 * 86400000)

    for (var i = 0; i < issues.length; i++) {
      var issue = issues[i]
      var hireDate = toDateOrNow(issue.whenCreated || (issue.open && issue.open[0] ? issue.open[0].from : null))
      var isActive = issue.active === true
      var finishDate = isActive ? now : toDateOrNow(issue.lastLogon || (issue.open && issue.open[issue.open.length - 1] ? issue.open[issue.open.length - 1].to : null))
      var tenureDays = daysBetween(hireDate, finishDate)
      var hireYmd = ymdFromUtcMs(hireDate.getTime())
      var finishYmd = ymdFromUtcMs(finishDate.getTime())
      var tenurePretty = formatInclusiveRangeTenure(hireYmd, finishYmd)

      totalTenureDays += tenureDays

      if (tenureDays > 0 && (shortest == null || tenureDays < shortest.days)) {
        shortest = {
          name: issue.cn || issue.title || '—',
          days: tenureDays,
          tenurePretty: tenurePretty
        }
      }

      if (longest == null || tenureDays > longest.days) {
        longest = {
          name: issue.cn || issue.title || '—',
          days: tenureDays,
          tenurePretty: tenurePretty
        }
      }

      if (isActive) {
        activeEmployees += 1
        if (tenureDays >= 365) {
          oneYearPlus += 1
        }
        if (tenureDays >= 730) {
          twoYearsPlus += 1
        }
        if (hireDate.getTime() <= firstMonthFromFoundationEnds.getTime()) {
          sinceFoundation += 1
        }

        var departmentName = issue.department || 'без отдела'
        if (departmentName !== 'без отдела') {
          departmentActive[departmentName] = (departmentActive[departmentName] || 0) + 1
        }
      } else {
        firedEmployees += 1
      }
    }

    var averageTenureDays = totalEmployees > 0 ? Math.round(totalTenureDays / totalEmployees) : 0

    var stats = [
      { label: 'Всего сотрудников', value: String(totalEmployees) },
      { label: 'Активных', value: String(activeEmployees) },
      { label: 'Уволенных', value: String(firedEmployees) },
      { label: 'Работают более года', value: formatPercent(activeEmployees > 0 ? oneYearPlus / activeEmployees : 0) },
      { label: 'Работают более двух лет', value: formatPercent(activeEmployees > 0 ? twoYearsPlus / activeEmployees : 0) },
      { label: 'Работают с самого начала', value: formatPercent(activeEmployees > 0 ? sinceFoundation / activeEmployees : 0) },
      { label: 'Вжух и всё', value: shortest ? (shortest.name + ' (' + shortest.tenurePretty + ')') : '—' },
      { label: 'Средний стаж', value: formatDurationDays(averageTenureDays) },
      { label: 'Часть команды — часть корабля', value: longest ? (longest.name + ' (' + longest.tenurePretty + ')') : '—' }
    ]

    $('#employeesStatsGrid').html(createStatCardsHTML(stats))
  }

  window.Visuals = Visuals
})
