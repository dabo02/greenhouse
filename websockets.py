import os
from threading import Lock
from flask import Flask, render_template, session, url_for, request, redirect
from flask_socketio import SocketIO, emit
from db import DBManager
from datetime import datetime

'''
***************
On RPi
***************
'''
template_dir = os.path.dirname(os.path.abspath(os.path.dirname(__file__)))
template_dir = os.path.join(template_dir, 'greenhouse/build')
static_dir = os.path.join(template_dir, 'static')
app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
socketio = SocketIO(app, async_mode=None)
thread = None
thread_lock = Lock()
users = DBManager('localhost', 27017)
users.set_db('greenhouse')
users.set_collection('users')

secret = None

if 'RPi' in os.environ:
    from Adafruit_BME280 import *
    import Adafruit_ADS1x15
    import RPi.GPIO as GPIO
    secret = os.environ['SECRET_KEY']
    app.config['SECRET_KEY'] = secret
else:
    secret = 'lZsY4zEG00QwQzDDKiMrPqsrUcYQhG5Z'
    app.config['SECRET_KEY'] = secret



null_state = {
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
    'sunriseDate': None,
    'tempDayMin': 0,
    'tempDayMax': 0,
    'tempNightMin': 0,
    'tempNightMax': 0,
    'humidityDayMin': 0,
    'humidityDayMax': 0,
    'humidityNightMin': 0,
    'humidityNightMax': 0,
    'Co2DayMin': 0,
    'Co2DayMax': 0,
    'ready': False
}

state = null_state.copy()


def interpolate(val, analogMin, analogMax, realMin, realMax):
    return (float((val - analogMin))*float((realMax - realMin))/float(analogMax - analogMin) + float(realMin))


def monitor():
    GPIO.setmode(GPIO.BCM)
    lights_pin = 16
    co2_pin = 20
    exhaust_pin = 21
    dehumidifier_pin = 25
    GPIO.setup(lights_pin, GPIO.OUT)
    GPIO.setup(co2_pin, GPIO.OUT)
    GPIO.setup(exhaust_pin, GPIO.OUT)
    GPIO.setup(dehumidifier_pin, GPIO.OUT)
    GPIO.output(lights_pin, GPIO.LOW)
    GPIO.output(co2_pin, GPIO.LOW)
    GPIO.output(exhaust_pin, GPIO.LOW)
    GPIO.output(dehumidifier_pin, GPIO.LOW)
    PH_GAIN = 1
    CO2_GAIN = 1
    ph_channel = 0
    co2_channel = 1
    bme_sensor = BME280(t_mode=BME280_OSAMPLE_8, p_mode=BME280_OSAMPLE_8, h_mode=BME280_OSAMPLE_8)
    adc = Adafruit_ADS1x15.ADS1115()
    while True:
        global state
        if state['ready']:
            if not state['manual']:
                try:
                    state['temperature'] = round(((bme_sensor.read_temperature()*1.8) + 32), 1)
                    bme_sensor.read_pressure()
                    state['rh'] = round(bme_sensor.read_humidity(), 1)
                    state['ph'] = round(interpolate(adc.read_adc(ph_channel, gain=PH_GAIN), 0, 65535, 0, 14), 1)
                    pre_co2_value = adc.read_adc(co2_channel, gain=CO2_GAIN)
                    state['carbonDioxide'] = round(((pre_co2_value - 35500)/-6.83)-1226.42)
                except:
                    continue

                if state['veg']:  # only for veg state
                    set_time = datetime.strptime(state['sunriseDate'], "%a, %d %b %Y %H:%M:%S %Z")  # get time in UTC
                    current_time = datetime.now()
                    elapsed_time = current_time - set_time  # get elapsed time
                    elapsed_seconds = elapsed_time.seconds  # get elapsed seconds

                    if elapsed_time.days < 0:
                        # inform the client that a day has passed and new time should be set
                        socketio.emit('message', {'purpose': 'setDay', 'current': set_time.day}, namespace='/greenhouse')
                        socketio.sleep(1)
                    if elapsed_seconds > 64800: # 64800 secs = 18 hours
                        state['lights'] = False
                        if GPIO.input(lights_pin):
                            GPIO.output(lights_pin, GPIO.LOW)
                        if state['rh'] >= round(float(state['humidityNightMax']), 1):
                            state['exhaust'] = True
                            state['humidity'] = True
                            if not GPIO.input(exhaust_pin):
                                GPIO.output(exhaust_pin, GPIO.HIGH)
                            if not GPIO.input(dehumidifier_pin):
                                GPIO.output(dehumidifier_pin, GPIO.HIGH)
                        else:
                            state['exhaust'] = False
                            state['humidity'] = False
                            if GPIO.input(exhaust_pin):
                                GPIO.output(exhaust_pin, GPIO.LOW)
                            if GPIO.input(dehumidifier_pin):
                                GPIO.output(dehumidifier_pin, GPIO.LOW)

                        if state['temperature'] > round(float(state['tempNightMax']), 1):
                            if state['exhaust'] == False:
                                state['exhaust'] = True
                                if not GPIO.input(exhaust_pin):
                                    GPIO.output(exhaust_pin, GPIO.HIGH)

                    else:
                        state['lights'] = True
                        if not GPIO.input(lights_pin):
                            GPIO.output(lights_pin, GPIO.HIGH)

                        if state['rh'] >= float(state['humidityDayMax']):
                            state['exhaust'] = True
                            state['humidity'] = True
                            if not GPIO.input(exhaust_pin):
                                GPIO.output(exhaust_pin, GPIO.HIGH)
                            if not GPIO.input(dehumidifier_pin):
                                GPIO.output(dehumidifier_pin, GPIO.HIGH)
                        else:
                            state['exhaust'] = False
                            state['humidity'] = False
                            GPIO.output(exhaust_pin, GPIO.LOW)
                            GPIO.output(dehumidifier_pin, GPIO.LOW)

                        if state['temperature'] > float(state['tempDayMax']):
                            if state['exhaust'] == False:
                                state['exhaust'] = True
                                GPIO.output(exhaust_pin, GPIO.HIGH)

                elif state['flower']:
                    set_time = datetime.strptime(state['sunriseDate'], "%a, %d %b %Y %H:%M:%S %Z")  # get time in UTC
                    current_time = datetime.now()
                    elapsed_time = current_time - set_time  # get elapsed time
                    elapsed_seconds = elapsed_time.seconds  # get elapsed seconds

                    if elapsed_time.days < 0:
                        # inform the client that a day has passed and new time should be set
                        socketio.emit('message', {'purpose': 'setDay', 'current': set_time.day}, namespace='/greenhouse')
                        socketio.sleep(1)
                    if elapsed_seconds > 43200:
                        state['lights'] = False
                        if GPIO.input(lights_pin):
                            GPIO.output(lights_pin, GPIO.LOW)
                        if state['rh'] > round(float(state['humidityNightMax']), 1):
                            state['exhaust'] = True
                            state['humidity'] = True
                            if not GPIO.input(exhaust_pin):
                                GPIO.output(exhaust_pin. GPIO.HIGH)
                            if not GPIO.input(dehumidifier_pin):
                                GPIO.output(dehumidifier_pin. GPIO.HIGH)
                        else:
                            state['humidity'] = False
                            if GPIO.input(dehumidifier_pin):
                                GPIO.output(dehumidifier_pin, GPIO.LOW)
                            if GPIO.input(exhaust_pin):
                                GPIO.output(exhaust_pin, GPIO.LOW)

                    else:
                        state['lights'] = True
                        if not GPIO.input(lights_pin):
                            GPIO.output(lights_pin, GPIO.HIGH)

                        if state['carbonDioxide'] < round(float(state['Co2DayMax']), 1):
                            state['co2'] = True
                            state['exhaust'] = False
                            if not GPIO.input(co2_pin):
                                GPIO.output(co2_pin, GPIO.HIGH)
                            if GPIO.input(exhaust_pin):
                                GPIO.output(exhaust_pin, GPIO.LOW)

                        if state['rh'] > round(float(state['humidityDayMax']), 1):
                            state['humidity'] = True
                            if not GPIO.input(exhaust_pin):
                                if not state['carbonDioxide'] < round(float(state['Co2DayMax']), 1) or state['temperature'] > float(state['tempDayMax']):
                                    state['exhaust'] = True
                                    GPIO.output(exhaust_pin. GPIO.HIGH)
                            if not GPIO.input(dehumidifier_pin):
                                GPIO.output(dehumidifier_pin. GPIO.HIGH)
                        else:
                            state['humidity'] = False
                            if GPIO.input(dehumidifier_pin):
                                GPIO.output(dehumidifier_pin, GPIO.LOW)
                            if GPIO.input(exhaust_pin):
                                GPIO.output(exhaust_pin, GPIO.LOW)git

                socketio.emit('message', {'purpose': 'State', 'currentState': state}, namespace='/greenhouse')
                socketio.sleep(5)
        else:
            socketio.sleep(3)


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
    global state
    global null_state
    state = null_state.copy()
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
