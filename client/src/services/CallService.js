
// var localVideo;
var localStream;
var remoteStream;
// var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;
var streamEventObject;

var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

uuid = createUUID();

serverConnection = new WebSocket('ws://localhost:8444');
serverConnection.onmessage = gotMessageFromServer;

var constraints = {
  video: true,
  audio: true,
};

if (navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
} else {
  alert('Your browser does not support getUserMedia API');
}

function getUserMediaSuccess(stream) {
  localStream = stream;
}

export function setSrcObject(localVideo) {
  localVideo.srcObject = localStream;
}

// ===================================================================

//  CALL ONCLICK
export function start(isCaller, cb) {
  console.log('start');
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = (event) => {
    streamEventObject = event;
    gotRemoteStream(event);
    setTimeout(() => {
      peerConnection.close()
    }, 5000);
    if (typeof cb === 'function') cb();
  }
  peerConnection.addStream(localStream);
  setTimeout(() => {
    peerConnection.close()
  }, 5000);
  if (isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    setTimeout(() => {
      peerConnection.close()
    }, 5000);
    }
}

// ===================================================================

function gotMessageFromServer(message) {
  if (!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid === uuid) return;

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type === 'offer') {
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if (signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    console.log('sending')
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }));
  }
}

function createdDescription(description) {
  console.log('got description');
  peerConnection.setLocalDescription(description).then(function () {
    serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }));
  }).catch(errorHandler);
}


function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteStream = event.streams[0];
}
console.log(remoteStream)

export function setSrcObjectRemote(remoteVideo) {
  console.log('set src object')
  remoteVideo.srcObject = remoteStream;
  streamEventObject = remoteVideo.srcObject;
}

function errorHandler(error) {
  console.error(error);
}
// Taken from http://stackoverflow.com/a/105074/515584`
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}