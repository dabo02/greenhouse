import React from 'react';
import openSocket from 'socket.io-client';
import ToggleSwitch from '@trendmicro/react-toggle-switch';
import ReactLoading from 'react-loading';

export default class WebsocketHandler extends React.Component {

    constructor(props) {
        super(props);
        this.logout = 'logout/';
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
            manual: false
        };
    }

    componentDidMount() {
        let self = this;
        self.ws = openSocket('http://0.0.0.0:8000/greenhouse');
        self.ws.on('message', data => {
            console.log(JSON.stringify(data));
            let result = data.data ? data.data : data;
            switch (result.purpose) {
                case 'Connected':
                    this.setState({connected: true});
                    self.ws.emit('getCurrentState', {});
                    break;

                case 'Disconnected':
                    this.setState({connected: false});
                    break;

                case 'State':
                    let currentState = result.currentState;
                    this.setState(currentState);
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

    render() {
        if (this.state.connected) {
            return (
                <div>
                    <div className='container'>
                        <div className='row temperature-data'>
                            <div className='col'>
                                <strong><i className="fa fa-thermometer-full"
                                           aria-hidden="true"/> {this.state.temperature}&deg;</strong>
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
                                    disabled = {this.state.manual}
                                    checked={this.state.lights}
                                    onChange={this.lightController.bind(this)}
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
                                    disabled = {this.state.manual}
                                    checked={this.state.exhaust}
                                    onChange={this.exhaustController.bind(this)}
                                />
                            </div>
                            <div className='col'>
                                <i className="fa fa-cog fa-spin" aria-hidden="true"/>
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
                                    disabled = {this.state.manual}
                                    checked={this.state.co2}
                                    onChange={this.co2Controller.bind(this)}
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
                                <strong>De-Humidifier</strong>
                            </div>
                            <div className='col'>
                                <ToggleSwitch
                                    disabled = {this.state.manual}
                                    checked={this.state.humidity}
                                    onChange={this.humidityController.bind(this)}
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
                                    onChange={this.manualOverride.bind(this)}
                                />
                            </div>
                            <div className="row justify-content-center">
                                <div className="col">
                                    <form action='/logout' method='get'>
                                        <button type='submit' className='btn btn-success'><a href={this.logout}>Logout</a></button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>);
        } else {
            return(<div className='container'>
                    <div className='row justify-cotent-center'>
                        <ReactLoading type='cylon' color='#ffffff' height='667' width='375'/>
                    </div>
                </div>);
        }
    }
}