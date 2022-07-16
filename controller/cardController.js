//Declaration
const _ = require('lodash');
const axios = require('axios')
const url = 'https://api.trello.com/1/boards/609f488638122f7a82bf31b4?key=e4ca0224f7ed7ba9dceac38b122ef10e&token=22dc795b770cc5fe1a66ee042ebd69caec1a8276917963e6ececd5ac20263ccd&fields=all&actions=all&action_fields=all&actions_limit=1000&cards=all&card_fields=all&card_attachments=true&labels=all&lists=all&list_fields=all&members=all&member_fields=all&checklists=all&checklist_fields=all&organization=false'

const catchError = (error) => {
    console.error(error)
  }

function generateReport(request,response){
  const parseTrello = (res) => {
    const cards = res.data.cards
    const actions = res.data.actions
    const lists = res.data.lists

    //Map created card with date
    const cardsWithFullDetails= cards.map(card => {
        const matched = actions.find(action => (action.type == 'createCard' || action.type == 'copyCard') && action.data.card.id === card.id);
        if (matched){
            return {...card,...matched}
        }
    })

    const objStatus = {
        Info:["General Info", "Template"],
        Todo:["Todo"],
        InProgress:["In Progress", "Reviewing"],
        Done:["Closed","Classes","Done"]
    }

    let updatedCard = cardsWithFullDetails;

    //Add updated list name to the card obj
    updatedCard = updatedCard.map(card=>{    
        const matched = lists.find(list=> card.idList == list.id)
        if (matched){
            card.updatedListName = matched.name
            return {...card}
        } 
    })
    
    //Filter
    //list
    const status = request.query.status;
    const arrStatus = objStatus[status];
    if (status){
        updatedCard = updatedCard.filter(card=>
            arrStatus.includes(card.updatedListName)
        )
    }

    //label
    const label = request.query.label;
    if (label){
        updatedCard = updatedCard.filter(card=>{
            const cardLabels = card.labels
            const labelExist = cardLabels.some(labelOfCard => labelOfCard.name == label)
            if (labelExist){
                return card
            }
        })
    }

    //from Date
    const fromDate = request.query.from;
    if (fromDate){
        updatedCard = updatedCard.filter(card=>
            card.date >= fromDate
        )
    }

    //to Date
    const toDate = request.query.to;
    if (toDate){
        updatedCard = updatedCard.filter(card=>
            card.date <= toDate
        )
    }
    //End of filter

    //Group by list
    var sortedCard = _.groupBy(updatedCard,'updatedListName');

    //Group by month of card created
    for (let cardStatus in sortedCard){
        sortedCard[cardStatus] =_.groupBy(sortedCard[cardStatus], data=>{
            const createdDate = new Date(data.date)
            return createdDate.toLocaleString('default', { month: 'long' })
        });

        //to display number of cards created
        for (let cardInMonth in sortedCard[cardStatus]){
            sortedCard[cardStatus][cardInMonth] = _.size(sortedCard[cardStatus][cardInMonth]);
        }
    }
    response.json(sortedCard);
  };

  axios
  .get(url)
  .then(parseTrello)
  .catch(catchError)
}

  module.exports = { generateReport }