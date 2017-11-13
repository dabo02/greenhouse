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

secret = None

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
    secret = 'lZsY4zEG00QwQzDDKiMrPqsrUcYQhG5Z'
    app.config['SECRET_KEY'] = secret



state = {
    'carbonDioxide': 0,
    'temperature': 0,
    'rh': 0,
    'ph': 0.0,
    'manual': False,
    'co2': False,
    'lights': False,
    'exhaust':  False,
    'humidity': False,
    'flower': False,
    'veg': False,
    'sunrise': None,
    'tempDayMin': 0,
    'tempDayMax': 0,
    'tempNightMin': 0,
    'tempNightMax': 0,
    'humidityDayMin': 0,
    'humidityDayMax': 0,
    'humidityNightMin': 0,
    'humidityNightMax': 0,
    'Co2DayMin': 0,
    'Co2DayMax': 0
}


def monitor():
    global state
    while True:
        # TODO Monitor logic goes here
        if not state['manual']:
            if state['veg']:
                state['lights'] = True
                #TODO implement socketio.emit() to setState here
                # TODO implement 18 hr logic here
            elif state['flower']:
                a = 1
                state['lights'] = True


        # state['temperature'] = sensor.read_temperature()
        # state['rh'] = sensor.read_humidity()
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
    global state
    emit('message', {'purpose': 'State', 'currentState': state})


@socketio.on('setState', namespace='/greenhouse')
def handle_set_state(message):
    data = message['data']
    global state
    for k, value in data.items():
        key = k
        stateChange = value
        state[key] = stateChange


@socketio.on('start', namespace='/greenhouse')
def handle_start(message):
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(target=monitor)

        else:
            thread = None
            thread = socketio.start_background_task(target=monitor)


if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)