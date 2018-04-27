from django.shortcuts import render, HttpResponse
import json
import queue
import cv2
import os
import glob as gb
import base64
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Create your views here.

q = queue.Queue()
q1 = queue.Queue()
threads = [1,2,]
i = 0
base64_head = {
    'img': 'data:image/jpg;base64,',
    'audio': 'data:audio/mp3;base64,',
}

def recorder(request):
    if request.method == 'POST':
        data = request.FILES.get('video')
        # q.put(data)
        global i
        i = i + 1
        # q1.put(i)
        # threading.Thread(target=thread_judge).start()
        path = '{0}/static/video/{1}{2}.avi'.format(BASE_DIR, data.field_name, i)
        with open(path, 'wb') as f:
            for chunk in data.chunks():
                f.write(chunk)
        # if threads:
        #     return HttpResponse('OK')
        # else:
        with open('{0}/static/audio/candybling.mp3'.format(BASE_DIR),'rb') as file:
            file_base64 = base64.b64encode(file.read())
        data = base64_head['audio']+'{0}'.format(file_base64)[2:-1]
        return HttpResponse(data)
    return render(request, 'recorderview.html')


def write_video(data):
    num = q1.get()
    path = '{0}/static/video/{1}{2}.avi'.format(BASE_DIR, data.field_name, num)
    with open(path, 'wb') as f:
        for chunk in data.chunks():
            f.write(chunk)


def thread_judge():
    if q.qsize() == 0:
        pass
    else:
        data = q.get()
        write_video(data)



#将video中的视频合并
def synthetic_video():
    fps = 25
    size = (640, 480)
    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    videoWriter = cv2.VideoWriter('{0}/static/synthetic/video.avi'.format(BASE_DIR), fourcc, fps, size)
    img_root = gb.glob('{0}/static/video/*.avi'.format(BASE_DIR))
    for video in img_root:
        videoCapture = cv2.VideoCapture(video)
        success, frame = videoCapture.read()
        while success:
            videoWriter.write(frame)
            success, frame = videoCapture.read()


class MyJson(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, bytes):
            return o
        else:
            return json.JSONEncoder.default(self, o)


if __name__ == '__main__':
    with open('{0}/static/audio/fade.mp3'.format(BASE_DIR), 'rb') as file:
        file_base64 = base64.b64encode(file.read())
    data = base64_head['audio'] + '{0}'.format(file_base64)[2:-1]
    print(file_base64)
