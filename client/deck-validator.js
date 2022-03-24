const $ = require('jquery'); // eslint-disable-line no-unused-vars
const _ = require('underscore');
const axios = require('axios').default;
const GameModes = require('./GameModes');
const crypto = require('crypto');
const NodeCache = require( "node-cache" );

let validatorCache = new NodeCache();

class DeckValidator {
    constructor(packs, gameMode) {
        this.packs = packs;
        this.gameMode = gameMode;
    }

    async validateDeck(deck) {
        let allCards = deck.provinceCards.concat(deck.dynastyCards).concat(deck.conflictCards).concat(deck.role).concat(deck.stronghold);
        let cardCountByName = {};
        _.each(allCards, cardQuantity => {
            cardCountByName[cardQuantity.card.id] = 0;
            cardCountByName[cardQuantity.card.id] += cardQuantity.count;
        });

        let mode = this.gameMode;
        if(mode === GameModes.Stronghold) {
            mode = 'standard';
        }

        const body = {
            cards: cardCountByName,
            format: mode
        };

        const jsonString = JSON.stringify(body);
        const hash = crypto.createHash('md5').update(jsonString).digest('hex');
        const cached = validatorCache.get(hash);
        if (cached === undefined) {
            try {
                const res = await axios.post('https://www.emeralddb.org/api/decklists/validate', body);
                const resultObj = {
                    valid: res.data.valid,
                    extendedStatus: res.data.errors
                };
                validatorCache.set(hash, resultObj, 600);
                return resultObj;
            } catch(e) {
                return {
                    valid: undefined,
                    extendedStatus: ['Error Validating']
                };
            }
        }
        return cached;
    }
}

module.exports = async function validateDeck(deck, options) {
    options = Object.assign({ includeExtendedStatus: true }, options);

    let validator = new DeckValidator(options.packs, options.gameMode);
    let result = await validator.validateDeck(deck);

    if(!options.includeExtendedStatus) {
        return _.omit(result, 'extendedStatus');
    }

    return result;
};
