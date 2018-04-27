/*

*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.

*

*  Use of this source code is governed by a BSD-style license

*  that can be found in the LICENSE file in the root of the source

*  tree.

*/

// This code is adapted from
// https://rawgit.com/Miguelao/demos/master/mediarecorder.html
'use strict';

/* globals MediaRecorder */
var mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
var mediaRecorder;
var recordedBlobs;
var sourceBuffer;
var gumVideo = document.querySelector('video#gum');
var recordedVideo = document.querySelector('video#recorded');
var recordButton = document.querySelector('button#record');
var playButton = document.querySelector('button#play');
var downloadButton = document.querySelector('button#download');
recordButton.onclick = toggleRecording;
playButton.onclick = play;
downloadButton.onclick = download;

// window.isSecureContext could be used for Chrome
var isSecureOrigin = location.protocol === 'https:' ||
location.hostname === 'localhost';
if (!isSecureOrigin) {
    alert('getUserMedia() must be run from a secure origin: HTTPS or localhost.' +
      '\n\nChanging protocol to HTTPS');
    location.protocol = 'HTTPS';
}

var constraints = {
    audio: true,
    video: true
};

function handleSuccess(stream) {
    recordButton.disabled = false;
    console.log('getUserMedia() got stream: ', stream);
    window.stream = stream;
    gumVideo.srcObject = stream;

}

// function autoplay() {
//     toggleRecording();
//     setTimeout(toggleRecording(),10000);
//     play();
// }

function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}

navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);

function handleSourceOpen(event) {
    console.log('MediaSource opened');
    sourceBuffer = mediaSource.addSourceBuffer('video/avi; codecs="vp8"');
    console.log('Source buffer: ', sourceBuffer);
}

recordedVideo.addEventListener('error', function(ev) {
    console.error('MediaRecording.recordedMedia.error()');
    alert('Your browser can not play\n\n' + recordedVideo.src
      + '\n\n media clip. event: ' + JSON.stringify(ev));
  }, true);

function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function handleStop(event) {
  console.log('Recorder stopped: ', event);
}

function toggleRecording() {
    if (recordButton.textContent === 'Start Recording') {
        startRecording();
        setTimeout(toggleRecording, 5000);
    } else {
        stopRecording();
        recordButton.textContent = 'Start Recording';
        playButton.disabled = false;
        downloadButton.disabled = false;
        videoUpload();
    }
}

function startRecording() {
    recordedBlobs = [];
    var options = {mimeType: 'video/avi;codecs=vp9'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log(options.mimeType + ' is not Supported');
        options = {mimeType: 'video/avi;codecs=vp8'};
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.log(options.mimeType + ' is not Supported');
            options = {mimeType: 'video/avi'};
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.log(options.mimeType + ' is not Supported');
                options = {mimeType: ''};
            }
        }
    }

    try {
        mediaRecorder = new MediaRecorder(window.stream, options);
    } catch (e) {
        console.error('Exception while creating MediaRecorder: ' + e);
        alert('Exception while creating MediaRecorder: '
          + e + '. mimeType: ' + options.mimeType);
        return;
    }
    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
    recordButton.textContent = 'Stop Recording';
    playButton.disabled = true;
    downloadButton.disabled = true;
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(10); // collect 10ms of data
    console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
    mediaRecorder.stop();
    console.log('Recorded Blobs: ', recordedBlobs);
    recordedVideo.controls = true;
    var blob = new Blob(recordedBlobs, {type: 'video/avi'});
    console.log(blob);
}

function play() {
    var superBuffer = new Blob(recordedBlobs, {type: 'video/avi'});
    recordedVideo.src = window.URL.createObjectURL(superBuffer);
    // workaround for non-seekable video taken from
    // https://bugs.chromium.org/p/chromium/issues/detail?id=642012#c23
    recordedVideo.addEventListener('loadedmetadata', function() {
        if (recordedVideo.duration === Infinity) {
            recordedVideo.currentTime = 1e101;
            recordedVideo.ontimeupdate = function() {
                recordedVideo.currentTime = 0;
                recordedVideo.ontimeupdate = function() {
                  delete recordedVideo.ontimeupdate;
                  recordedVideo.play();
                };
            };
        }
    });
}

function download() {
    var blob = new Blob(recordedBlobs, {type: 'video/avi'});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.avi';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}


function videoUpload() {
    var blob = new Blob(recordedBlobs, {type: 'video/avi'});
    // var fileReader = new FileReader();
    // fileReader.readAsDataURL(blob);
    // fileReader.onloadend = function () {
    //     console.log('file:'+fileReader.result);
    //     var xmlHttp = new XMLHttpRequest();
    //     xmlHttp.open('post', '/recorder/',true);
    //     xmlHttp.send({'video':fileReader.result});
    //     xmlHttp.onreadystatechange = function () {
    //     };
    // };
    var obj = new FormData();
    obj.append('video',blob);
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open('post', '/recorder/',true);
    xmlHttp.send(obj);
    xmlHttp.onreadystatechange = function () {
        if(xmlHttp.readyState === 4 && xmlHttp.status === 200){
            if(xmlHttp.response){
                // var img = document.createElement('img');
                // img.src = xmlHttp.response;
                // document.getElementById('response').appendChild(img);
                var audio = document.createElement('audio');
                audio.src = xmlHttp.response;
                document.getElementById('response').appendChild(audio);
                console.log(xmlHttp.response)
            }
            // toggleRecording()
        }else if(xmlHttp.status!==200){
            console.log('error:'+xmlHttp.status)
        }
    };
}