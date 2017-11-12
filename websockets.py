import os
from threading import Lock
from flask import Flask, render_template, session, url_for, request, redirect
from flask_socketio import SocketIO, send, emit
from db import DBManager

'''
***************
On RPi
***************
'''
template_dir = os.path.dirname(os.path.abspath(os.path.dirname(__file__)))
template_dir = os.path.join(template_dir, 'greenhouse/build')
static_dir = os.path.join(template_dir, 'static')
app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
socketio = SocketIO(app)
thread = None
thread_lock = Lock()
users = DBManager('localhost', 27017)
users.set_db('greenhouse')
users.set_collection('users')

if 'RPi' in os.environ:
    from Adafruit_BME280 import *
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    pinList = [16, 25]
    for i in pinList:
        GPIO.setup(i, GPIO.OUT)

    sensor = BME280(t_mode=BME280_OSAMPLE_8, p_mode=BME280_OSAMPLE_8, h_mode=BME280_OSAMPLE_8)
    secret = os.environ['SECRET_KEY']
    app.config['SECRET_KEY'] = secret

else:
    app.config['SECRET_KEY'] = 'lZsY4zEG00QwQzDDKiMrPqsrUcYQhG5Z'


status = {'manual': False,
          'co2': False,
          'lights': False,
          'exhaust':  False,
          'humidity': False}
state = {
    'carbonDioxide': 0,
    'temperature': 0,
    'rh': 0,
    'ph': 0.0
}

def monitor():
    global state
    global status
    state['temperature'] = sensor.read_temperature()
    state['rh'] = sensor.read_humidity()
    return ''


@app.route('/')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        id = request.form['username']
        pwd = request.form['password']
        user = users.get_single({'_id': id})
        if user:
            if pwd == user['password']:
                session['user'] = id
                return redirect(url_for('dashboard'))
            else:
                return render_template('login.html', error='incorrect password')
        else:
            return render_template('login.html',  error='{0} does not exist'.format(id))
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/signup', methods=['POST'])
def signup():
    id = request.form['username']
    pwd = request.form['password']
    key = request.form['key']
    if key == secret:
        doc = {'_id': id, 'password': pwd}
        user = users.save_single(doc)
        if user:
            return redirect(url_for('login'))
    else:
        return render_template('login.html', error='Incorrect key please register again')

@socketio.on('message', namespace='/greenhouse')
def handle_message(message):
    emit('message', message)


@socketio.on('connect', namespace='/greenhouse')
def handle_connect():
    emit('message', {'purpose': 'Connected'})


@socketio.on('getCurrentState', namespace='/greenhouse')
def handel_get_state(message):
    global status
    global state
    data = {'temperature': state['temperature'],
            'carbonDioxide': state['carbonDioxide'],
            'rh': state['rh'],
            'ph': state['ph'],
            'lights': status['lights'],
            'exhaust': status['exhaust'],
            'co2': status['co2'],
            'humidity': status['humidity'],
            'manual': status['manual']}
    emit('message', {'purpose': 'State', 'currentState': data})


@socketio.on('setState', namespace='/greenhouse')
def handle_set_state(message):
    data = message['data']
    for k, value in data.items():
        key = k
        statusChange = value
    global status
    status[key] = statusChange
    print(status)


@socketio.on('start', namespace='/test')
def handle_start():
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(target=monitor)
    emit('my_response', {'data': 'Connected', 'count': 0})


if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)