var Bet = React.createClass({
  getInitialState: function() {
    return {
      modal: null,
      valid_bet: null,
      showModal: true,
      challenge_addresses: [],
      num_levels: [],
      players: [],
      bet_values: []
    };
  },

  componentDidMount: function() {
    var self = this;
    var registry = ChallengeRegistry.at(ChallengeRegistry.deployed_address);

    registry.get_all_challenges.call().then(function(challenges) {
      self.setState({
        challenge_addresses: challenges
      });
      return registry.get_all_num_levels.call();
    }).then(function(num_levels) {
      console.log("num_levels: ", num_levels);
      self.setState({
        num_levels: num_levels
      });
      return registry.get_all_players.call();
    }).then(function(players) {
      self.setState({
        players: players
      });
      return registry.get_all_bet_values.call();
    }).then(function(bet_values) {
      console.log("bet_values:", bet_values);
      self.setState({
        bet_values: bet_values
      });
    }).catch(function(e) {
      alert("Error getting challenges! Oh no!");
      console.log(e);
    });
  },

  submitBet: function(address, event) {
    var self = this;
    var input = this.refs["input_" + address];
    var value = input.getDOMNode().value;

    var challenge = Challenge.at(address);
    challenge.make_offer({value: web3.toWei(value, "ether")}).then(function() {
      self.setState({
        modal: <SimpleModal title="Offer sent!"/>
      });

      setTimeout(function() {
        self.setState({
          modal: null
        });
      }, 1000);
      console.log("Offer sent.");
    }).catch(function(e) {
      alert("Error making offer! Oh no!");
      console.log(e);
    });
  },

  play: function(address, event) {
    var self = this;
    var challenge = Challenge.at(address);

    challenge.best_offer.call().then(function(offer) {
      if (web3.toDecimal(offer[0]) == 0) {
        self.setState({
          modal: <SimpleModal title="Waiting for wager!"/>
        });
      } else {
        self.props.startGame(challenge);
      }
    });
  },

  render: function() {
    var self = this;
    var hide_modal = this.state.showModal ? ' ' : 'hidden';
    var bet_key = 0;

    var challenges = [];

    for (var i = 0; i < this.state.challenge_addresses.length; i++) {
      var challenge = {
        address: this.state.challenge_addresses[i]
      }

      console.log(challenge);

      if (this.state.num_levels.length > 0) {
        challenge.num_levels = this.state.num_levels[i].toNumber();
      } else {
        challenge.num_levels = "...";
      }

      if (this.state.players.length > 0) {
        challenge.player = this.state.players[i];
      } else {
        challenge.player = "...";
      }

      if (this.state.bet_values.length > 0) {
        challenge.stake = web3.fromWei(this.state.bet_values[i].toString(), "ether");
      } else {
        challenge.stake = "...";
      }

      challenges.push(challenge);
    }

    return (
      <div className="bet">
        <div className="twelve columns">
          <h5 className="tab-title">Games Awaiting Challengers</h5>
        </div>
        <div className="bet_table_container twelve columns" ref="bet_table">
          <table className="u-full-width">
            <thead>
              <tr>
                <th>Game ID</th>
                <th>Levels</th>
                <th>Player ID</th>
                <th>Player&apos;s Stake</th>
                <th>Your Ether Wager</th>
                <th>Place Your Bet</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {
                challenges.map(function(challenge) {
                  return ( <tr className="bet">
                      <td className="game_id">{challenge.address}</td>
                      <td className="levels">{challenge.num_levels}</td>
                      <td className="player_id">{challenge.player}</td>
                      <td className="player_stake">{challenge.stake} <span>ETH</span></td>
                      <td className="bet_input"><input type="number" min="0" className="u-full-width" ref={"input_" + challenge.address}/></td>
                      <td className="bet_button"><button className="button-primary" onClick={self.submitBet.bind(null, challenge.address)}>Challenge</button></td>
                      <td className="bet_button"><button className="button-primary" onClick={self.play.bind(null, challenge.address)}>Play</button></td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
          {this.state.modal}
        </div>
      </div>
    );
  }
});
