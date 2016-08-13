import React, { Component } from 'react';
import '../../styles/css/dashboard.css';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actionCreators from '../../actions/actionCreators';
import { Link } from 'react-router';

class NewEvent extends Component {

  //Hate to do it this way..very hacky but redux forms is giving us some trouble
    //This should work for no until we come up with a better solution
  makeEvent(e) {
    e.preventDefault();
    // Ugly way of checking but serves our MVP purposes
    let currDate = new Date();
    if (e.target.date.value < currDate) {
      return false;
    } else {
      let newEventObj = {
        date: e.target.date.value,
        time: e.target.time.value,
        name: e.target.name.value,
        locations: e.target.locations.value.split(','),
        tags: e.target.tags.value.split(','),
        priceRange: e.target.priceRange.value
      };
      //would call an action creator at this point using this data
      console.log(newEventObj);
      this.props.createNewEvent(newEventObj);
    }
  }

  render() {
    return (
      <div className="newVoteContainer">
        <form className="formContainer" onSubmit={this.makeEvent.bind(this)}>
            <label>Date:</label>
            <input type="date" name="date" />
            <label>Event Name</label>
            <input type="text" placeholder="ie. Birthday Party" name="eventName" />
            <label>Time:</label>
            <input type="time" name="time" />
            <label>Locations:</label>
            <input type="text" placeholder="ie. Los Angeles, San Francisco" name="locations" />
            <label>Preferred Tags:</label>
            <input type="text" placeholder="ie. Movies, Tacos, Bars" name="tags" />
            <label>Price Range:</label>
            <select name="priceRange">
              <option value="1">$</option>
              <option value="2">$$</option>
              <option value="3">$$$</option>
            </select>
            <button className="constraintBtn" action="submit">Create Event</button>
            <Link to="/polling">Next</Link>
        </form>
      </div>
    );
  }
};

function mapStateToProps(state) {
    //Not sure what kind of error we'd return here
  return {

  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(actionCreators, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(NewEvent);
