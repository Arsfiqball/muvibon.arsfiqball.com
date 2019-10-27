var el = {}
var state = {}

el.template = document.getElementById('template')
el.start = document.getElementById('start')
el.screen = document.getElementById('screen')
el.close = document.getElementById('close')
el.canvas = document.getElementById('canvas')
el.video = document.getElementById('video')
el.record = document.getElementById('record')
el.preview = document.getElementById('preview')
el.done = document.getElementById('done')
el.download = document.getElementById('download')
el.clear = document.getElementById('clear')
el.player = document.getElementById('player')
el.canvasContext = el.canvas.getContext('2d')

state.image = null
state.imageIsLoaded = false
state.intervalID = null
state.isStarted = false
state.stream = null
state.recorder = null
state.timeoutID = null

function handleFileInputChange (e) {
  var file = e.target.files[0]
  var reader = new FileReader()
  reader.readAsDataURL(file)

  reader.onload = function (f) {
    if(f.target.readyState == FileReader.DONE) {
      state.imageIsLoaded = false
      state.image = new Image()
      state.image.src = f.target.result
      state.image.onload = function () {
        state.imageIsLoaded = true
      }
    }
  }
}

function getCoverPosition (boxWidth, boxHeight, camWidth, camHeight) {
  var width, height, offsetX, offsetY

  if (boxHeight * camWidth / camHeight >= boxWidth) {
    // goes with offset width
    width = boxHeight * camWidth / camHeight
    height = boxHeight
    offsetX = -1 * (width - boxWidth) / 2
    offsetY = 0
  } else {
    // goes with offset height
    height = boxWidth * camHeight / camWidth
    width = boxWidth
    offsetY = -1 * (height - boxHeight) / 2
    offsetX = 0
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY)
  }
}

function timerCallback () {
  var pos = getCoverPosition(
    state.image.naturalWidth,
    state.image.naturalHeight,
    el.video.videoWidth,
    el.video.videoHeight
  )

  el.canvasContext.drawImage(
    el.video,
    pos.offsetX,
    pos.offsetY,
    pos.width,
    pos.height
  )

  if (state.image) {
    el.canvasContext.drawImage(
      state.image,
      0,
      0,
      state.image.naturalWidth,
      state.image.naturalHeight
    )
  }
}

function handleClickStart (e) {
  if (state.imageIsLoaded && !state.isStarted) {
    state.isStarted = true

    el.canvas.setAttribute('width', state.image.naturalWidth)
    el.canvas.setAttribute('height', state.image.naturalHeight)
    el.screen.classList.remove('is-hidden')

    navigator
      .mediaDevices
      .getUserMedia({ video: { width: 1080 }, audio: false })
      .then(function (stream) {
        state.stream = stream
        el.video.srcObject = stream
        el.video.play()
        el.video.onloadedmetadata = function () {
          state.intervalID = setInterval(timerCallback, 16)
        }
      })
      .catch(console.error)
  }
}

function handleClickClose () {
  state.isStarted = false
  el.screen.classList.add('is-hidden')

  if (state.intervalID) {
    clearInterval(state.intervalID)
    state.intervalID = null
  }

  if (state.stream) {
    state
      .stream
      .getTracks()
      .forEach(function (track) {
        track.stop()
      })

    state.stream = null
  }
}

function exportVideo (blob) {
  el.preview.src = URL.createObjectURL(blob)
  el.preview.controls = true
  el.download.download = 'myvid.webm'
  el.download.href = el.preview.src
}

function handleClickRecord (e) {
  el.record.classList.add('is-hidden')
  el.done.classList.remove('is-hidden')
  el.download.classList.add('is-hidden')

  var chunks = []
  var stream = el.canvas.captureStream()

  state.recorder = new MediaRecorder(stream)

  state.recorder.ondataavailable = function (video) {
    chunks.push(video.data)
  }

  state.recorder.onstop = function () {
    exportVideo(new Blob(chunks, { type: 'video/webm' }))
  }
  
  state.recorder.start()

  state.timeoutID = setTimeout(function () {
    handleClickDone()
  }, 10000)
}

function handleClickDone () {
  if (state.timeoutID) {
    clearTimeout(state.timeoutID)
  }

  el.player.classList.remove('is-hidden')
  el.record.classList.remove('is-hidden')
  el.done.classList.add('is-hidden')
  el.download.classList.remove('is-hidden')
  handleClickClose()
  state.recorder.stop()
}

function handleClickClear () {
  el.player.classList.add('is-hidden')
  handleClickStart()
}

el.template.addEventListener('change', handleFileInputChange)
el.start.addEventListener('click', handleClickStart)
el.close.addEventListener('click', handleClickClose)
el.record.addEventListener('click', handleClickRecord)
el.done.addEventListener('click', handleClickDone)
el.clear.addEventListener('click', handleClickClear)
