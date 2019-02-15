const {h, render, Component} = require('preact')
const setByPath = require('set-value')

const helper = require('../src/helper.js')
const classnames = require('classnames')

const {gameclock} = require('..')

// these two functions are only needed for the SPLIT PLAYER CLOCKS dmeo
// mini diff for when we change gameClockID, playerID, or number of players
var removeOldClocks = function(gameClockID = null) {
    if (gameClockID == null) {
        let oldClocks = document.getElementsByClassName('targetdiv_playerclock')
        if (oldClocks != null && oldClocks.length > 0) {
            let i
            for (i = 0; i < oldClocks.length; i++) {
                let m = oldClocks[i]
                while (m.firstChild) {
                    m.removeChild(m.firstChild);
                }
            }
        }
    } else {
        let oldClocks = document.getElementsByClassName('gameclock_' + gameClockID)
        if (oldClocks != null && oldClocks.length > 0) {
            let i
            for (i = oldClocks.length - 1; i >= 0; i--) {
                let m = oldClocks[i]
                let p = m.parentNode
                p.removeChild(m)
            }
        }
    }
}
var handleUpdated = function() {
    // For SPLIT PLAYER CLOCKS demo
    // for demo, create copies of playerclocks using handleUpdated
    // this way we can work around that preact limitation
    // of not allowing multiple return values (html fragments)
    // just need divs for each playerclock with id and class
    //  id:   targetdiv_playerclock_GAMECLOCKID_PLAYER
    //  class: targetdiv_playerclock

    let gameClock = document.getElementsByClassName('gameclock')[0]

    if (gameClock == null ||
        gameClock.childNodes == null ||
        !(gameClock.childNodes.length > 0)) {
        return
    }
    gameClock.childNodes.forEach(function(e) {
        if (e == null) {
            return
        }
        let frag = e.cloneNode(true)
        if (frag != null) {
            let clockID = e.id

            // after update we remove old clock copy
            let oldClock = document.getElementById(clockID + '_M')
            if (oldClock != null) {
                oldClock.parentNode.removeChild(oldClock);

            }
            frag.id = clockID + '_M'
            let t = document.getElementById('targetdiv_' + clockID)
            if (t != null) {
                t.appendChild(frag)
            }
        }
    })
}

// Game Clock Demo
// counter for unique IDs for Accordion
let counter = 0

class Accordion extends Component {
    constructor(props) {
        super(props)

        this.state = {
            id: counter++,
            activeID: null
        }

        this.setActive = this.setActive.bind(this)
    }

    setActive(activeID, expand) {
        if (expand === true) {
            this.setState({activeID : activeID})
        } else {
            this.setState({activeID : null})
        }
    }

    render() {
        let accordionItems = []
        let i
        // with preact, using first child as header, second as panel
        for (i = 0; i < this.props.children.length; i++) {
            accordionItems.push(
                h(AccordionItem, {
                        activeID: this.state.activeID,
                        setActive: this.setActive
                    },
                    this.props.children[i],
                    this.props.children[++i]
                )
            )
        }
        return h('div', {
                id: 'accordion-' + this.state.id,
                className: classnames('accordion'),
                accordionID: this.state.id
            },
            accordionItems
        )
    }
}

class AccordionItem extends Component {
    constructor(props) {
        super(props)

        this.state = {
            id: counter++
        }

        this.toggleActive = this.toggleActive.bind(this)
    }

    toggleActive(evt) {
        this.props.setActive(
            this.state.id,
            !(this.props.activeID === this.state.id)
        )
    }

    render() {
        return h('div', {},
            h('div', {
                    id: 'accordionHeader-' + this.state.id,
                    className: classnames(
                        'accordionHeader',
                        this.props.activeID === this.state.id ?
                            'active' : null
                    ),
                    onClick: this.toggleActive
                }, this.props.children[0]
            ),
            h('div', {
                    id: 'accordionPanel-' + this.state.id,
                    className: classnames(
                        'accordionPanel'
                    ),
                    style: {
                        display: this.props.activeID === this.state.id ?
                            'block' : 'none'
                    }
                }, this.props.children[1]
            )
        )
    }
}

class InputItem extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return h('span', {},
            h('label', {}, this.props.name + ': '
            ),
            h('input', {
                type: this.props.type != null ? this.props.type : 'input',
                style: this.props.style ? this.props.style : null,
                id: this.props.id,
                min: this.props.min,
                max: this.props.max,
                step: this.props.step,
                value: this.props.value,
                onInput: this.props.onInput != null ?
                    this.props.onInput : null
            })
        )
    }
}

// credit; yishn @ github
const createTwoWayCheckBox = component => (
    ({stateKey, text}) => h('label',
        {
            style: {
                display: 'flex',
                alignItems: 'center'
            }
        },

        h('input', {
            style: {marginRight: '.5em'},
            type: 'checkbox',
            checked: component.state[stateKey],

            onClick: () => component.setState(s => {
                if (stateKey &&
                    component.state.initialTime != null &&
                    stateKey.split('_')[0] == 'infiniteTime') {

                    let i = stateKey.split('_')[1]
                    let data = {}
                    data['initialTime'] = JSON.parse(JSON.stringify(component.state.initialTime))
                    let k = 'initialTime.' + i + '.' + 'mainTime'
                    let v = (s[stateKey] == null || !s[stateKey]) ? 'Infinity' : 5
                    setByPath(data, k, v)
                    return ({
                        initialTime: data.initialTime,
                        [stateKey]: (s[stateKey] == null || !s[stateKey]) ? true : false
                    })
                } else {
                    return ({[stateKey]: (s[stateKey] == null || !s[stateKey]) ? true : false})
                }
            })
        }),

        h('span', {style: {userSelect: 'none'}}, text)
    )
)

class App extends Component {
    constructor(props) {
        super(props)

        this.state = {
            // game clock props
            clockMode: 'byo-yomi',
            dispInfoNumPeriods: true,
            dispInfoPeriodMoves: true,
            dispInfoPlayerText: true,
            dispCountElapsedMainTime: false,
            dispCountElapsedNumPeriods: false,
            dispCountElapsedPeriodMoves: false,
            dispCountElapsedPeriodTime: false,
            dispFormatMainTimeFSNumDigits: 2,
            dispFormatMainTimeFSLastNumSecs: 10,
            dispFormatMainTimeFSUpdateInterval: 0.02,
            dispFormatPeriodTimeFSNumDigits: 2,
            dispFormatPeriodTimeFSLastNumSecs: 10,
            dispFormatPeriodTimeFSUpdateInterval: 0.02,
            dispOnExpired: 'OT',
            gameClockID: 'demo',
            mode: 'init',
            minActiveClocks: 2,
            numMoves: 0,
            initialTime: [
                {playerID: 'black', playerText: '   ',
                    mainTime: 5, numPeriods: 1, periodTime: 4, periodMoves: 1},
                {playerID: 'white', playerText: '   ',
                    mainTime: 5, numPeriods: 1, periodTime: 4, periodMoves: 1}],

            //demo state
            eventLog: '',
            numPlayers: 2,
            playerIcons: '../assets/demo/',
            splitPlayerClocks: false
        }

        // gameclock callbacks
        this.handleInit = this.handleInit.bind(this)
        this.handleMadeMove = this.handleMadeMove.bind(this)
        this.handlePaused = this.handlePaused.bind(this)
        this.handlePlayerClockExpired = this.handlePlayerClockExpired.bind(this)
        this.handleReset = this.handleReset.bind(this)
        this.handleResumed = this.handleResumed.bind(this)

        // demo callbacks
        this.logEvent = this.logEvent.bind(this)

        this.handleInputInt = this.handleInputInt.bind(this)
        this.handleInputFloat = this.handleInputFloat.bind(this)
        this.handleInputStr = this.handleInputStr.bind(this)
        this.handleOptionChange = this.handleOptionChange.bind(this)

        this.renderClocks = this.renderClocks.bind(this)

        this.CheckBox = createTwoWayCheckBox(this)
    }

    handleInputInt(evt) {
        let element = evt.currentTarget
        let k = element.id
        let v = element.value
        let valid = true
        v = parseInt(v, 10)
        if (isNaN(v)) { valid = false }
        if (valid && k != null) {
            let parts = k.split('.')
            if (parts.length > 1) {
                parent = parts[0]
                let data = {}
                data[parent] = JSON.parse(JSON.stringify(this.state[parent]))
                setByPath(data, k, v)
                this.setState(data)
            } else {
                let data = {
                    [k]: v
                }
                this.setState(data)
            }
        }
    }

    handleInputFloat(evt) {
        let element = evt.currentTarget
        let k = element.id
        let v = element.value
        let valid = true
        v = parseFloat(v)
        if (isNaN(v)) { valid = false }
        if (valid && k != null) {
            let parts = k.split('.')
            if (parts.length > 1) {
                parent = parts[0]
                let data = {}
                data[parent] = JSON.parse(JSON.stringify(this.state[parent]))
                setByPath(data, k, v)
                this.setState(data)
            } else {
                let data = {
                    [k]: v
                }
                this.setState(data)
            }
        }
    }

    handleInputStr(evt) {
        let element = evt.currentTarget
        let k = element.id
        let v = element.value
        if (k != null) {
            let parts = k.split('.')
            if (parts.length > 1) {
                parent = parts[0]
                let data = {}
                data[parent] = JSON.parse(JSON.stringify(this.state[parent]))
                setByPath(data, k, v)
                this.setState(data)
            } else {
                let data = {
                    [k]: v
                }
                this.setState(data)
            }
        }
    }

    handleOptionChange(evt) {
        let element = evt.currentTarget
        let [k, v] = element.value.split(':')
        let data = {
            [k]: v
        }
        this.setState(data)
    }

    handleInit({playerID, clock} = {}) {
        this.logEvent('P ' + playerID + ' init' +
            '\n  P ' + playerID + ' clock: ' + JSON.stringify(clock))
    }

    handleMadeMove({playerID, clock} = {}) {
        this.logEvent('P ' + playerID + ' madeMove' +
            '\n  P ' + playerID + ' clock: ' + JSON.stringify(clock))
    }

    handlePaused({playerID, clock} = {}) {
        this.logEvent('P ' + playerID + ' paused' +
            '\n  P ' + playerID + ' clock: ' + JSON.stringify(clock))
    }

    handlePlayerClockExpired({playerID, nextPlayer, clock} = {}) {
        this.logEvent('P ' + playerID + ' time expired: nextPlayer: ' + nextPlayer +
            '\n  P ' + playerID + ' clock: ' + JSON.stringify(clock))
    }

    handleReset({playerID, clock} = {}) {
        this.logEvent('P ' + playerID + ' reset' +
        '\n  P' + playerID + ' clock: ' + JSON.stringify(clock))
    }

    handleResumed({playerID, clock} = {}) {
        this.logEvent('P ' + playerID + ' resumed' +
            '\n  P ' + playerID + ' clock: ' + JSON.stringify(clock))
    }

    logEvent(str) {
        let ts = (new Date).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        this.setState({
            eventLog: ts + ' : ' + str + '\n' + this.state.eventLog
        })
    }

    componentDidUpdate(prevProps, prevState) {
        // for SPLIT PLAYER CLOCKS demo
        let timeChanged = !helper.shallowEquals(
            this.state.initialTime, prevState.initialTime)
        let gameClockIDChanged = (this.state.gameClockID != prevState.gameClockID)
        let splitPlayerClocksChanged = (this.state.splitPlayerClocks != prevState.splitPlayerClocks)
        if (timeChanged || gameClockIDChanged) {
            let previd = prevState.gameClockID
            //this.forceUpdate()
            removeOldClocks(previd)
        }
        if (splitPlayerClocksChanged && this.state.splitPlayerClocks) {
            handleUpdated()
        }

        // for when we add/remove players, set defaults
        if (this.state.numPlayers != prevState.numPlayers) {
            let numPlayers = this.state.numPlayers
            if (numPlayers && typeof(numPlayers) == 'number' && numPlayers > 0) {
                let initTime = Array.from(Array(numPlayers)).map((e, i) => i)
                initTime = initTime.map((e, i) => {
                    let o = {
                        playerID: i + 1,
                        playerText: '[' + String(i + 1) + ']',
                        mainTime: 5,
                        numPeriods: 1,
                        periodTime: 4,
                        periodMoves: 1
                    }
                    return o
                })
                this.setState({initialTime: initTime})
            } else {
                this.setState({initialTime: null})
            }
        }
    }

    renderClocks() {
        let clockProps = {}
        let clockMode = this.state.clockMode
        if (clockMode === 'absolutePerPlayer') {
            clockProps = {'mainTime': 'Main Time (sec)'}
        } else if (clockMode === 'byo-yomi') {
            clockProps = {'mainTime': 'Main Time (sec)',
            'numPeriods': '# Periods',
            'periodTime': 'Period Time (sec)',
            'periodMoves': 'Moves/Period'}
        } else {
            return null
        }

        return Array.from(Array(this.state.numPlayers)).map((e, n) => {
            return h('li', {style: {width: '16em'}},
                'Player ' + (n + 1),
                h('br', {}), Object.keys(clockProps).map((k, i) => {
                    return h('div', {},
                        k === 'mainTime' &&
                            this.state.initialTime != null &&
                            this.state.initialTime[n] ?

                            [h('ul', {},
                                h(InputItem, {
                                    type: 'text',
                                    name: 'Player Clock ID',
                                    id: 'initialTime.' + n + '.' + 'playerID',
                                    style: {width: '8em', float: 'right'},
                                    value: this.state.initialTime != null &&
                                        this.state.initialTime[n] &&
                                        this.state.initialTime[n].playerID,
                                    onInput: this.handleInputStr
                                })
                            ),
                            h('ul', {},
                                h(InputItem, {
                                    type: 'text',
                                    name: 'Player Text',
                                    id: 'initialTime.' + n + '.' + 'playerText',
                                    style: {width: '8em', float: 'right'},
                                    value: this.state.initialTime != null &&
                                        this.state.initialTime[n] &&
                                        this.state.initialTime[n].playerText,
                                    onInput: this.handleInputStr
                                })
                            ),
                            h('ul', {},
                                h(this.CheckBox,
                                    {stateKey: 'infiniteTime_' + n,
                                    text: 'Infinite Time'}
                                )
                            )] : null,
                        !this.state['infiniteTime_' + n] ?
                            [h('ul', {},
                                h(InputItem, {
                                    type: 'number',
                                    name: clockProps[k],
                                    id: 'initialTime.' + n + '.' + k,
                                    min: 0,
                                    style: {width: '8em', float: 'right'},
                                    value: this.state.initialTime != null &&
                                        this.state.initialTime[n] &&
                                        this.state.initialTime[n][k],
                                    onInput: this.handleInputInt
                                }),
                            )] : null
                    )
                })
            )
        })
    }

    render() {
        let {clockMode,

            dispInfoNumPeriods,
            dispInfoPeriodMoves,
            dispInfoPlayerText,
            dispCountElapsedMainTime,
            dispCountElapsedNumPeriods,
            dispCountElapsedPeriodMoves,
            dispCountElapsedPeriodTime,
            dispFormatMainTimeFSNumDigits,
            dispFormatMainTimeFSLastNumSecs,
            dispFormatMainTimeFSUpdateInterval,
            dispFormatPeriodTimeFSNumDigits,
            dispFormatPeriodTimeFSLastNumSecs,
            dispFormatPeriodTimeFSUpdateInterval,
            dispOnExpired,

            gameClockID,
            minActiveClocks,
            mode,
            numMoves,
            initialTime,

            eventLog,
            numPlayers,
            playerIcons,
            splitPlayerClocks
        } = this.state

        // should be a further option,
        //    if you need for some reason multiple gameClocks?

        return h('div', {}, h('section', {
            style: {
                    display: 'grid',
                    gridTemplateColumns: '20em auto',
                    gridColumnGap: '1em'
                }
            },

            // DEMO for using icons instead of player text
            // just set a player text to a few spaces and do as below
            h('style', {},
                playerIcons != null &&
                initialTime != null && initialTime.map((k,v) =>
                    `.playerclock_${gameClockID}_${k.playerID} {
                        background-image: url('${playerIcons.replace(/\\/g, '/')}clock_${gameClockID}_${k.playerID}.svg');
                        background-repeat: no-repeat;
                        background-size: contain;
                    }`
                )
            ),

            h('form',
                {
                    style: {
                        display: 'flex',
                        flexDirection: 'column'
                    }
                },

                h('div', {style: {margin: '0 0 .25em 0'}},
                    'Game Clock Controls:',
                    h('br', {}),

                    h('button', {
                        type: 'button',
                        title: 'Pause',
                        onClick: evt => {
                            this.setState({mode: 'pause'})
                        }
                    }, 'Pause'), ' ',

                    h('button', {
                        type: 'button',
                        title: 'Resume',
                        onClick: evt => {
                            this.setState({mode: 'resume'})
                        }
                    }, 'Resume'), ' ',

                    h('br', {}),

                    h('button', {
                        type: 'button',
                        title: 'Reset',
                        onClick: evt => {
                            this.setState({
                                numMoves: 0,
                                mode: 'reset'
                            })
                        }
                    }, 'Reset'), ' ',

                    h('button', {
                        type: 'button',
                        title: 'Make Move',
                        onClick: evt => {
                            this.setState({numMoves: this.state.numMoves + 1})
                        }
                    }, 'Make Move'), ' '
                ),
                h(Accordion, {},
                    'Game Clock Settings',
                    h('div', {},
                        h('div', {
                                style: {height: '1.5em'}
                            },
                            h(InputItem, {
                                type: 'number',
                                name: 'Num Players',
                                id: 'numPlayers',
                                min: 0,
                                style: {width: '3em'},
                                value: this.state.numPlayers,
                                onInput: this.handleInputInt
                            })
                        ),
                        h('div', {
                                style: {height: '1.5em'}
                            },
                            h(InputItem, {
                                type: 'number',
                                name: 'Minimum Active Clocks',
                                id: 'minActiveClocks',
                                min: 1,
                                max: this.state.numPlayers,
                                style: {width: '3em'},
                                value: this.state.minActiveClocks,
                                onInput: this.handleInputInt
                            })
                        ),
                        h('div', {},
                            h('label', {},
                                'Clock Mode: '
                            ),
                            h('select', {
                                type: 'select',
                                onChange: this.handleOptionChange,
                                value: 'clockMode:' + this.state.clockMode,
                                }, h('option', {
                                        value: 'clockMode:absolutePerPlayer'
                                    }, 'Absolute'
                                ), h('option', {
                                        value: 'clockMode:byo-yomi',
                                    }, 'Byo-yomi'
                                )
                            )
                        ),
                        h(InputItem, {
                            type: 'text',
                            name: 'Game Clock ID',
                            id: 'gameClockID',
                            style: {width: '8em'},
                            value: this.state.gameClockID,
                            onInput: this.handleInputStr
                        }),
                        h(this.CheckBox,
                            {stateKey: 'splitPlayerClocks',
                            text: 'Split the player clocks (hack)'}
                        ),
                    ),
                    'Player Clock Time',
                    h('div', {},
                        this.state.numPlayers > 0 &&
                        this.state.initialTime != null &&
                        this.state.initialTime.length >= this.state.numPlayers ?
                            this.renderClocks() : null
                    ),
                    'Display Info',
                    h('div', {},
                        h(InputItem, {
                            type: 'text',
                            name: 'Time Expired Text',
                            id: 'dispOnExpired',
                            style: {width: '8em'},
                            value: this.state.dispOnExpired,
                            onInput: this.handleInputStr
                        }),
                        h(this.CheckBox,
                            {stateKey: 'dispInfoNumPeriods',
                            text: 'Show # Periods'}
                        ),
                        h(this.CheckBox,
                            {stateKey: 'dispInfoPeriodMoves',
                            text: 'Show # Period Moves'}
                        ),
                        h(this.CheckBox,
                            {stateKey: 'dispInfoPlayerText',
                            text: 'Show Player Text'}
                        ),
                        h(this.CheckBox,
                            {stateKey: 'dispCountElapsedMainTime',
                            text: 'Show Main Time as Elapsed'}
                        ),
                        h(this.CheckBox,
                            {stateKey: 'dispCountElapsedPeriodTime',
                            text: 'Show Period Time as Elapsed'}
                        ),
                        h(this.CheckBox,
                            {stateKey: 'dispCountElapsedNumPeriods',
                            text: 'Show # Periods as Elapsed'}
                        ),
                        h(this.CheckBox,
                            {stateKey: 'dispCountElapsedPeriodMoves',
                            text: 'Show # Moves (made in period) as Elapsed'}
                        )
                    ),
                    'Display Formatting',
                    h('div', {},
                        h('li', {},
                            'Main Time format:',
                            h('br', {}),
                            h('ul', {}, h(InputItem, {
                                type: 'number',
                                name: '# digits of fractional-secs',
                                id: 'dispFormatMainTimeFSNumDigits',
                                min: 0,
                                max: 4,
                                style: {width: '5em', float: 'right'},
                                value: this.state.dispFormatMainTimeFSNumDigits,
                                onInput: this.handleInputInt
                            })),
                            h('ul', {}, h(InputItem, {
                                type: 'number',
                                name: 'Fractional-secs on # secs left',
                                id: 'dispFormatMainTimeFSLastNumSecs',
                                style: {width: '5em', float: 'right'},
                                value: this.state.dispFormatMainTimeFSLastNumSecs,
                                onInput: this.handleInputInt
                            })),
                            h('ul', {}, h(InputItem, {
                                type: 'number',
                                name: 'Update interval for fractional-secs',
                                id: 'dispFormatMainTimeFSUpdateInterval',
                                step: 0.01,
                                min: 0.02,
                                max: 0.5,
                                style: {width: '5em', float: 'right'},
                                value: this.state.dispFormatMainTimeFSUpdateInterval,
                                onInput: this.handleInputFloat
                            })),
                        ),
                        h('li', {},
                            'Period Time format:',
                            h('br', {}),
                            h('ul', {}, h(InputItem, {
                                type: 'number',
                                name: '# digits of fractional-secs',
                                id: 'dispFormatPeriodTimeFSNumDigits',
                                min: 0,
                                max: 4,
                                style: {width: '5em', float: 'right'},
                                value: this.state.dispFormatPeriodTimeFSNumDigits,
                                onInput: this.handleInputInt
                            })),
                            h('ul', {}, h(InputItem, {
                                type: 'number',
                                name: 'Fractional-secs on # secs left',
                                id: 'dispFormatPeriodTimeFSLastNumSecs',
                                style: {width: '5em', float: 'right'},
                                value: this.state.dispFormatPeriodTimeFSLastNumSecs,
                                onInput: this.handleInputInt
                            })),
                            h('ul', {}, h(InputItem, {
                                type: 'number',
                                name: 'Update interval for fractional-secs',
                                id: 'dispFormatPeriodTimeFSUpdateInterval',
                                step: 0.01,
                                min: 0.02,
                                max: 0.5,
                                style: {width: '5em', float: 'right'},
                                value: this.state.dispFormatPeriodTimeFSUpdateInterval,
                                onInput: this.handleInputFloat
                            }))
                        )
                    )
                ),
                h('br', {}),
                'event log: ',
                h('textarea', {
                    type: 'textarea',
                    rows: '10',
                    value: eventLog
                })
            ),

            h('div', {style: {display: (splitPlayerClocks ? 'none' : null)}},
                "Game Clock Demo",
                h('br', {}),
                h('br', {}),
                this.state.numPlayers > 0 && h(gameclock, {
                    clockMode: clockMode,

                    dispInfoNumPeriods: dispInfoNumPeriods,
                    dispInfoPeriodMoves: dispInfoPeriodMoves,
                    dispInfoPlayerText: dispInfoPlayerText,
                    dispCountElapsedMainTime: dispCountElapsedMainTime,
                    dispCountElapsedNumPeriods: dispCountElapsedNumPeriods,
                    dispCountElapsedPeriodMoves: dispCountElapsedPeriodMoves,
                    dispCountElapsedPeriodTime: dispCountElapsedPeriodTime,
                    dispFormatMainTimeFSNumDigits: dispFormatMainTimeFSNumDigits,
                    dispFormatMainTimeFSLastNumSecs: dispFormatMainTimeFSLastNumSecs,
                    dispFormatMainTimeFSUpdateInterval: dispFormatMainTimeFSUpdateInterval,
                    dispFormatPeriodTimeFSNumDigits: dispFormatPeriodTimeFSNumDigits,
                    dispFormatPeriodTimeFSLastNumSecs: dispFormatPeriodTimeFSLastNumSecs,
                    dispFormatPeriodTimeFSUpdateInterval: dispFormatPeriodTimeFSUpdateInterval,
                    dispOnExpired: dispOnExpired,

                    gameClockID: gameClockID,
                    minActiveClocks: minActiveClocks,
                    mode: mode,
                    numMoves: numMoves,
                    initialTime: initialTime,

                    handleInit: this.handleInit,
                    handleMadeMove: this.handleMadeMove,
                    handlePaused: this.handlePaused,
                    handlePlayerClockExpired: this.handlePlayerClockExpired,
                    handleReset: this.handleReset,
                    handleResumed: this.handleResumed,
                    handleUpdated: handleUpdated
                })
            ),
            splitPlayerClocks !== true || initialTime == null ? null :
                h('div', {},
                    'Split Player Clocks Demo',
                    h('br', {}),
                    h('br', {}),
                    initialTime == null ? null :
                        initialTime.map((k, i) =>
                            [h('div', {
                                    class: 'targetdiv_playerclock',
                                    style: {
                                        height: 'fit-content',
                                        width: 'fit-content'
                                    },
                                    id: 'targetdiv_playerclock_' +
                                        gameClockID + "_" + k.playerID
                                },
                            ),
                            h('br', {})]
                    )
                )
            )
        )
    }
}

render(h(App), document.body)
