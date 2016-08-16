import React, { Component } from 'react';
import '../../styles/css/polling.css';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actionCreators from '../../actions/actionCreators';
import PollingList from '../presentational/PollingList';
import WinningResult from '../presentational/WinningResult';
import Lobby from '../presentational/Lobby';

class VoteBoard extends Component {

  componentWillMount() {
    this.props.getEvent(this.props.pollId);
  }

  addVote(index) {
    this.props.increaseVote(index);
  }

  removeVote(index) {
    this.props.decreaseVote(index);
  }

  setStartVote() {
    //fire off an action creator would likely hold the id of this given event
    this.props.startVote();
  }

  inviteUser(userId, email) {
    this.props.inviteUser(userId, email);
  }

  setTheWinner() {
    //fire off an action creator would likely hold the id of this given event
    let highestVote = this.props.nominees.sort(function(a,b) {
      return b.netVotes - a.netVotes;
    })[0];
    this.props.setWinningResult(highestVote);
  }

  // Do this to reuse the nominations board component
    //Will probably have to refactor to render via external methods for modularity
  render() {
    if (this.props.voteStatus.isVoting && !this.props.voteStatus.winningResult) {
      return (
        //Would have to change to include commitments
        <div className="votefieldContainer">
          <div className="votingBoard">
            <div className="voteboardContent">
              <div className="nominationContainer">
                {this.props.nominees.map((nominee, i) =>
                  <PollingList
                    key={i}
                    index={i}
                    nominee={nominee}
                    addVote={this.addVote.bind(this)}
                    removeVote={this.removeVote.bind(this)}
                  />
                )}
              </div>
            </div>
            <div>
              <button onClick={this.setTheWinner.bind(this)}>Stop the Vote</button>
            </div>
          </div>
        </div>
      );
    } else if (this.props.voteStatus.isVoting && this.props.voteStatus.winningResult) {
      return (
        <div className="votefieldContainer">
          <WinningResult winner={this.props.voteStatus.theWinner}/>
        </div>
      );
    } else {
        // Passing down startVote function
      return (
        <div className="votefieldContainer">
          <Lobby event={this.props.event} startVote={this.setStartVote.bind(this)} inviteUser={this.inviteUser.bind(this)} />
        </div>
      );
    }
  }
};

function mapStateToProps(state) {
  return {
    //would hold data for nominated events
    //would also hold data for a given event
    nominees: state.nominees,
    voteStatus: state.voteStatus,
    event: state.event
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(actionCreators, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(VoteBoard);
