import React, { Component, PropTypes } from 'react';
import '../../styles/css/temp.css';
import FontAwesome from 'react-fontawesome'

class UserStatus extends Component {

  static propTypes = {
    participant: PropTypes.string.isRequired
  }

  render() {
    return (
      <div className="voterStatus">
        <p><FontAwesome name='bomb' spin style={{ color: '#4CF33C' }}/> { this.props.participant }</p>
      </div>
    );
  }
};

export default UserStatus;
