import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import '@trendmicro/react-toggle-switch/dist/react-toggle-switch.css';

import WebsocketHandler from './components/websocket_handler';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Daniel's Greenhouse</h1>
        </header>
        <div>
            <WebsocketHandler/>
        </div>
      </div>
    );
  }
}

export default App;
