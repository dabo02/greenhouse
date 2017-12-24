import React from 'react';
import openSocket from 'socket.io-client';
import ToggleSwitch from '@trendmicro/react-toggle-switch';
import ReactLoading from 'react-loading';

export default class WebsocketHandler extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            temperature: 0,
            carbonDioxide: 0,
            rh: 0,
            ph: 0.0,
            connected: false,
            lights: false,
            exhaust: false,
            co2: false,
            humidity: false,
            manual: false,
            settings: false,
            flower: false,
            veg: false,
            sunrise: '',
            sunriseDate: null,
            tempDayMin: 0,
            tempDayMax: 0,
            tempNightMin: 0,
            tempNightMax: 0,
            humidityDayMin: 0,
            humidityDayMax: 0,
            humidityNightMin: 0,
            humidityNightMax: 0,
            Co2DayMin: 0,
            Co2DayMax: 0,
            ready: false
        };
        this.lightController = this.lightController.bind(this);
        this.exhaustController = this.exhaustController.bind(this);
        this.co2Controller = this.co2Controller.bind(this);
        this.humidityController = this.humidityController.bind(this);
        this.settingsManager = this.settingsManager.bind(this);
        this.handleCheckBoxChange = this.handleCheckBoxChange.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.manualOverride = this.manualOverride.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.showMessage = this.showMessage.bind(this);
        
    }

    componentDidMount() {
        let self = this;
        const namespace = 'greenhouse';
        self.ws = openSocket(window.location.href + namespace);
        // self.ws = openSocket('0.0.0.0:8000/' + namespace);
        self.ws.on('message', data => {
            console.log(JSON.stringify(data));
            let result = data.data ? data.data : data;
            switch (result.purpose) {
                case 'Connected':
                    this.setState({connected: true});
                    self.ws.emit('getCurrentState', {});
                    self.ws.emit('start', {});
                    break;

                case 'Disconnected':
                    this.setState({connected: false});
                    break;

                case 'State':
                    let currentState = result.currentState;
                    this.setState(currentState);
                    break;

                case 'setDay':
                    const temp_date = Date.parse(this.state.sunriseDate);
                    temp_date.setDate(temp_date.getDate() + 1);
                    this.setState({sunriseDate: temp_date}, () => {
                        this.ws.emit('setState', {data: this.state})
                    });
                    break;

                default:
                    this.setState({connected: false})
            }
        });
    }

    lightController(event) {
        this.ws.emit('setState', {data: {lights: !this.state.lights}});
        this.setState({lights: !this.state.lights});

    }

    exhaustController(event) {
        this.ws.emit('setState', {data: {exhaust: !this.state.exhaust}});
        this.setState({exhaust: !this.state.exhaust})
    }

    co2Controller(event) {
        this.ws.emit('setState', {data: {co2: !this.state.co2}});
        this.setState({co2: !this.state.co2})
    }

    humidityController(event) {
        this.ws.emit('setState', {data: {humidity: !this.state.humidity}});
        this.setState({humidity: !this.state.humidity})
    }

    manualOverride(event){
        this.ws.emit('setState', {data: {manual: !this.state.manual}});
        this.setState({manual: !this.state.manual})
    }

    settingsManager(event){
        this.setState({settings: !this.state.settings, ready: false}, () => {
            this.ws.emit('setState', {data: {ready: false}});
        })
    }

    handleCheckBoxChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        const name2 = name === 'flower' ? 'veg' : 'flower';

        this.setState({
            [name]: value,
            [name2]: !value
        });
    }

    handleInputChange(event) {
        const target = event.target;
        const value =  target.value;
        const name = target.name;
        if (name === 'sunrise'){
            const date = new Date();
            const hr = parseInt(value.substr(0, 2), 10);
            const min = parseInt(value.substr(3, 2), 10);
            const sec = 0;
            date.setHours(hr - 6);
            date.setMinutes(min);
            date.setSeconds(sec);
            const stringDate = date.toUTCString();
            console.log(stringDate);
            this.setState({sunriseDate: stringDate});
        }
        this.setState({
            [name]: value
        });
    }

    saveSettings(event) {
        if (this.state.sunriseDate && (this.state.veg || this.state.flower) && this.state.sunrise &&
            this.state.tempDayMin && this.state.tempNightMin  && this.state.tempDayMin && this.state.tempDayMax
            && this.state.humidityDayMin && this.state.humidityDayMax && this.state.humidityNightMin &&
            this.state.humidityNightMax && this.state.Co2DayMin && this.state.Co2DayMax) {

                this.setState({ready: true}, () => {
                this.setState({settings: !this.state.settings}, () => {
                    this.ws.emit('setState', {data: this.state});
                });
        });

        }
    };

    showMessage(msg, type, classType) {
        return(
            <div className={classType} role="alert">
                <strong>{type}</strong> {msg}
            </div>
        )
    }

    render() {
        if (this.state.connected && !this.state.settings) {
            return (
                <div>
                    <div className={this.state.ready ? 'hidden' : 'container'}>
                        {this.showMessage('Settings have not been applied', 'Error', 'alert alert-danger')}
                    </div>
                    <div className='container'>
                        <div className='row temperature-data'>
                            <div className='col'>
                                <strong><i className="fa fa-thermometer-full"
                                           aria-hidden="true"/> {this.state.temperature}&deg;F</strong>
                            </div>
                            <div className='col'>
                                <div className='row data-display'>
                                    <div className='col'>
                                        <strong>Co2: {this.state.carbonDioxide}ppm</strong>
                                    </div>
                                </div>
                                <div className='row data-display'>
                                    <div className='col'>
                                        <strong>RH: {this.state.rh}%</strong>
                                    </div>
                                </div>
                                <div className='row data-display'>
                                    <div className='col'>
                                        <strong>pH: {this.state.ph}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <hr/>
                    </div>
                    <div className='container'>
                        <div className='row justify-content-center'>
                            <div className='row'>
                                <h6>CURRENT STATUS: <span className={this.state.manual ? 'text-warning' : 'text-primary'}>{this.state.manual ? 'MANUAL' : 'AUTO'}</span></h6>
                            </div>
                        </div>
                    </div>
                    <div className='container'>
                        <div className='row justify-content-center control-display'>
                            <div className='col'>
                                <strong>Lights</strong>
                            </div>
                            <div className='col'>
                                <ToggleSwitch
                                    disabled = {!this.state.manual}
                                    checked={this.state.lights}
                                    onChange={this.lightController}
                                />
                            </div>
                            <div className='col'>
                                <i className="fa fa-lightbulb-o" aria-hidden="true"/>
                            </div>
                        </div>
                    </div>
                    <div className='container'>
                        <div className='row justify-content-center control-display'>
                            <div className='col'>
                                <strong>Exhaust</strong>
                            </div>
                            <div className='col'>
                                <ToggleSwitch
                                    disabled = {!this.state.manual}
                                    checked={this.state.exhaust}
                                    onChange={this.exhaustController}
                                />
                            </div>
                            <div className='col'>
                                <i className="fa fa-cog" aria-hidden="true"/>
                            </div>
                        </div>
                    </div>
                    <div className='container'>
                        <div className='row justify-content-center control-display'>
                            <div className='col'>
                                <strong>Co2</strong>
                            </div>
                            <div className='col'>
                                <ToggleSwitch
                                    disabled = {!this.state.manual}
                                    checked={this.state.co2}
                                    onChange={this.co2Controller}
                                />
                            </div>
                            <div className='col'>
                                <i className="fa fa-fire-extinguisher" aria-hidden="true"/>
                            </div>
                        </div>
                    </div>
                    <div className='container'>
                        <div className='row justify-content-center control-display'>
                            <div className='col'>
                                <strong>De-Hum</strong>
                            </div>
                            <div className='col'>
                                <ToggleSwitch
                                    disabled = {!this.state.manual}
                                    checked={this.state.humidity}
                                    onChange={this.humidityController}
                                />
                            </div>
                            <div className='col'>
                                <i className="fa fa-tint" aria-hidden="true"/>
                            </div>
                        </div>
                        <hr/>
                    </div>

                    <div className='container'>
                        <div className='row justify-content-center control-display'>
                            <div className='col'>
                                <strong>Manual Control</strong>
                            </div>
                            <div className='col'>
                                <ToggleSwitch
                                    checked={this.state.manual}
                                    onChange={this.manualOverride}
                                />
                            </div>
                            <div className='container'>
                                <div className="row justify-content-center control-display">
                                    <div className="col">
                                        <form action='/logout' method='get'>
                                            <button type='submit' className='btn btn-success'>Logout</button>
                                        </form>
                                    </div>
                                    <div className="col">
                                        <button onClick={this.settingsManager} className='btn btn-success'>Settings</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>);
        } else if(this.state.settings){
            return(
            <div>
                <div className={this.state.ready ? 'hidden' : 'container'}>
                    {this.showMessage('Settings not yet saved', 'Warning', 'alert alert-warning')}
                </div>
                <div className='container'>
                    <form>
                        <div className={this.state.flower  !== this.state.veg ? 'container' : 'hidden'}>
                            <div className='row form-group justify-content-center control-display'>
                                <h4 className='col-12'>{this.state.flower  &&  !this.state.veg ? '12/12 Flower Cycle' : this.state.flower === this.state.veg ? '' : '18/6 Veg Cycle'}</h4>
                                <label className="col-2 col-form-label">Sunrise</label>
                                <div className="col-10">
                                    <input className="form-control"
                                           type="time"
                                           name='sunrise'
                                           value={this.state.sunrise}
                                           onChange={this.handleInputChange}/>
                                </div>
                            </div>
                        </div>
                        <div className={this.state.flower !== this.state.veg ? 'form-group row' : 'form-group row check-when-hidden'}>
                            <div className='col'>
                                <div className='form-check'>
                                    <label className='form-check-label'>
                                        <input
                                            className="form-check-input"
                                            name="flower"
                                            type="checkbox"
                                            checked={this.state.flower}
                                            onChange={this.handleCheckBoxChange} />
                                        flower
                                    </label>
                                </div>
                            </div>
                            <div className='col'>
                                <div className='form-check'>
                                    <label className='form-check-label'>
                                        <input
                                            className="form-check-input"
                                            name="veg"
                                            type="checkbox"
                                            checked={this.state.veg}
                                            onChange={this.handleCheckBoxChange} />
                                        veg
                                    </label>
                                </div>
                            </div>
                        </div>
                        <hr/>
                        <div>
                            <div className="form-group row">
                                <label className='col-12 col-form-label'>Daytime Settings</label>
                                <label className="col col-form-label">Temperature:</label>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='min'
                                           name='tempDayMin'
                                           value={this.state.tempDayMin}
                                           onChange={this.handleInputChange}/>
                                </div>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='max'
                                           name='tempDayMax'
                                           value={this.state.tempDayMax}
                                           onChange={this.handleInputChange}/>
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col col-form-label">Co2 ppm:</label>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='min'
                                           name='Co2DayMin'
                                           value={this.state.Co2DayMin}
                                           onChange={this.handleInputChange}/>
                                </div>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='max'
                                           name='Co2DayMax'
                                           value={this.state.Co2DayMax}
                                           onChange={this.handleInputChange}/>
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col col-form-label">Humidity:</label>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='min'
                                           name='humidityDayMin'
                                           value={this.state.humidityDayMin}
                                           onChange={this.handleInputChange}/>
                                </div>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='max'
                                           name='humidityDayMax'
                                           value={this.state.humidityDayMax}
                                           onChange={this.handleInputChange}/>
                                </div>
                            </div>
                            <hr/>
                            <div className="form-group row">
                                <label className='col-12 col-form-label'>Nighttime Settings</label>
                                <label className="col col-form-label">Temperature:</label>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='min'
                                           name='tempNightMin'
                                           value={this.state.tempNightMin}
                                           onChange={this.handleInputChange}/>
                                </div>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='max'
                                           name='tempNightMax'
                                           value={this.state.tempNightMax}
                                           onChange={this.handleInputChange}/>
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col col-form-label">Humidity:</label>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='min'
                                           name='humidityNightMin'
                                           value={this.state.humidityNightMin}
                                           onChange={this.handleInputChange}/>
                                </div>
                                <div className="col">
                                    <input className="form-control"
                                           type="number"
                                           placeholder='max'
                                           name='humidityNightMax'
                                           value={this.state.humidityNightMax}
                                           onChange={this.handleInputChange}/>
                                </div>
                            </div>
                        </div>
                    </form>
                <hr/>
                </div>
                <div className='container'>
                    <div className="row justify-content-center control-display">
                        <div className="col">
                            <button onClick={this.saveSettings} className='btn btn-success'>Apply</button>
                        </div>
                        <div className="col">
                            <button onClick={this.settingsManager} className='btn btn-success'>Dashboard</button>
                        </div>
                    </div>
                </div>
            </div>)
        } else{
            return(<div className='container'>
                    <div className='row justify-cotent-center'>
                        <ReactLoading type='cylon' color='#ffffff' height='667' width='375'/>
                    </div>
                </div>);
        }
    }
}