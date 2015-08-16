var KEYS = {
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  spacebar: 32
};

var Playgrid = React.createClass({
  getInitialState: function() {
    return {
      focussed_cell: null,
      defense: 1000,
      attack: 1000,
      level: "Some Level Name",
      adventurer_hp: null,
      adventurer_attack: null,
      adventurer_level: null,
      turn_changing: true,
      modal: null,
      outcome_modal: null,
      playerWon: false,
      playerEtherOutcome: 0,
      items: [
        { name: "sword", attack: "40", hp: "50" },
        { name: "potion", attack: "20", hp: "30" },
        { name: "shield", attack: "0", hp: "60" },
        { name: "pizza", attack: "20", hp: "30" }
      ]
    };
  },
  getAttack: function() {
    return this.state.attack;
  },
  getDefense: function() {
    return this.state.defense;
  },
  getLevelName: function() {
    return this.state.level;
  },
  componentDidMount: function() {
    var self = this;
    var game = this.props.game;

    this.setState({
      modal: <SimpleModal title="Loading level..." />
    }, function() {
      var self = this;
      this.reloadGrid().then(function() {
        return self.updateStats();
      }).then(function() {
        self.setState({
          turn_changing: false,
          modal: null
        });
      });
    });

    document.addEventListener('keydown', this.onKeyDown);
  },

  modalItemClicked: function(id, event) {
    var focussed_cell = this.state.focussed_cell;

    // TODO: Handle actions from multiple items being clicked.
    if (id == "add_monster") {
      this.checkFromStaircase();
      focussed_cell.type = "monster";

    } else if (id == "add_wall") {
      this.checkFromStaircase();
      focussed_cell.type = "wall";

    } else if (id == "add_staircase" && !this.hasStaircase()) {
      this.hasStaircase(true);
      focussed_cell.type = "staircase";

    } else if (id == "set_empty") {
      this.checkFromStaircase();
      focussed_cell.type = "empty";
    }

    // Remove the menu.
    this.setState({
      menu: null,
      focussed_cell: null
    });
  },
  updateStats: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      var game = self.props.game;
      var adventurer_hp;
      var adventurer_attack;
      var adventurer_level;
      game.adventurer_hp.call().then(function(hp) {
        adventurer_hp = hp.toNumber();
        return game.adventurer_attack.call();
      }).then(function(attack) {
        adventurer_attack = attack.toNumber();
        return game.adventurer_level.call();
      }).then(function(level) {
        adventurer_level = level.toNumber();
        self.setState({
          adventurer_hp: adventurer_hp,
          adventurer_attack: adventurer_attack,
          adventurer_level: adventurer_level
        }, resolve);

        var player_won_or_lost = false;
        if (adventurer_hp <= 0) {
          this.endGame(player_won_or_lost);
        }

      }).catch(reject);
    });
  },
  endGame: function(game) {
    // get ether waged
    var challenge = this.props.challenge;
    var ether_waged = 0;
    var self = this;

    challenge.best_offer.call().then(function(offer) {
      if (web3.toDecimal(offer[0]) != 0) {
        ether_waged = web3.fromWei(offer[1].toString(), "ether");
      } else {
        console.log("Error getting/formatting offer amount");
      }
    }).then(function() {
      return game.won.call();
    }).then(function(playerWon) {
      self.setState({ outcome_modal:
        <PlayOutcomeModal playerWon={playerWon} ether={ether_waged} />});
    });
  },
  reloadGrid: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.props.game.get_all_squares.call().then(function(squares) {
        var grid = [];

        for (var location = 0; location < squares.length; location++) {
          var type_id = squares[location].toNumber();
          var x = (location % 16);
          var y = parseInt(location / 16);
          var type = "empty";

          if (type_id == 1) {
            type = "wall";
          }

          if (type_id == 2) {
            type = "staircase";
          }

          if (type_id == 3) {
            type = "character";
          }

          if (type_id == 4) {
            type = "potion";
          }

          if (type_id == 5) {
            type = "shield";
          }

          if (type_id == 6) {
            type = "sword";
          }

          if (type_id >= 100) {
            type = "monster";
          }

          grid.push({type: type, x: x, y: y, location: location});
        }

        self.refs.grid.setState({
          grid: grid
        }, resolve);
      }).catch(reject);
    });
  },

  componentWillUnmount: function() {
    document.removeEventListener('keydown', this.onKeyDown);
  },

  takeTurn: function(direction) {
    var self = this;
    var game = this.props.game;

    this.setState({
      turn_changing: true,
      modal: <SimpleModal title="Changing turns..." />
    });

    game.move(direction).then(function() {
      console.log("move done");
      return self.reloadGrid();
    }).then(function() {
      console.log("update stats");
      return self.updateStats();
    }).then(function() {
      return game.over.call();
    }).then(function(over) {
      if (over) {
        self.endGame(game);
      }
    }).then(function() {
      self.setState({
        turn_changing: false,
        modal: false
      });
    }).catch(function(e) {
      alert("Error! Oh no!");
      console.log(e);
    });
  },

  checkOutOfBounds: function(val) {
    if (val < 0 || val > 160) {
      return true;
    } else {
      return false;
    }
  },

  onKeyDown: function(e) {
    if (this.state.turn_changing) {
      return;
    }

    switch(e.which) {
      case KEYS.left:
        this.takeTurn(0);
        break;

      case KEYS.right:
        this.takeTurn(1);
        break;

      case KEYS.up:
        this.takeTurn(2);
        break;

      case KEYS.down:
        this.takeTurn(3);
        break;
    }
  },

  render: function() {
    var self = this;
    var item_id = 0;

    var name = "Vitalik";

    if (this.props.character == "nick") {
      name = "Nick";
    } else if (this.props.character == "satoshi") {
      name = "Satoshi";
    }

    return (
      <div className="playgrid">
        <div className="four columns">
          <dl className="infobox your_score">
            <dt><strong>YOU ({name})</strong><span className="num">{self.state.adventurer_hp}</span></dt>
            <dt>Attack: <span className="num">{self.state.adventurer_attack}</span></dt>
            <dt>Level: <span className="num">{self.state.adventurer_level}</span></dt>
          </dl>
        </div>
        <div className="four columns">
          <dl className="infobox your_items">
            <dt>
              <strong>Your Items</strong>
              <div className="row_stats">
                <span className="label">Attack</span>
                <span className="label label_second">HP</span>
              </div>
            </dt>
            {
              this.state.items.map(function(item) {
                item_id++;
                return <dt key={item_id} className="item item_row">
                  <span className="name">{item.name}</span>
                  <div className="row_stats">
                    <span className="num item_stat"> &#43; {item.hp}</span>
                    <span className="num item_stat"> &#43; {item.attack}</span></div>
                </dt>

              })
            }
          </dl>
        </div>
        <div className="four columns right end">
          <p>LEVEL: <span className="levelname">{self.getLevelName()}</span></p>

          <button id="end_game" className="button-primary">End Game</button>
          <label for="end_game"><small>Give up?</small></label>
        </div>

        <div className="grid-container twelve columns" ref="grid_container">
          <Grid key="__editor" editor={false} cellClicked={this.cellClicked} character={self.props.character} ref="grid"/>
          {this.state.menu}
        </div>
        {this.state.modal}
        {this.state.outcome_modal}
      </div>
    );
  }
});
