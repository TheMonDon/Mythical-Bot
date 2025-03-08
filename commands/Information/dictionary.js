const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const fetch = require('node-superfetch');

class Dictionary extends Command {
  constructor(client) {
    super(client, {
      name: 'dictionary',
      description: 'Define a word from Wordnik',
      usage: 'dictionary <word>',
      requiredArgs: 1,
      category: 'Information',
      aliases: ['dict', 'wordnik'],
    });
  }

  async run(msg, args) {
    const query = args.join(' ');

    const { body } = await fetch.get(
      `https://api.wordnik.com/v4/word.json/${query}/definitions?api_key=${this.client.config.Wordnik}&useCanonical=true&includeTags=false&includeRelated=false&limit=69`,
    );
    if (!body) return msg.channel.send('No results found for that word.');

    const firstWithText = body.find((item) => item.text !== undefined);
    if (!firstWithText) return msg.channel.send('No results found for that word.');

    return msg.channel.send(stripIndents`
    # __${firstWithText.word}__
    
    *${firstWithText.partOfSpeech}* ${firstWithText.text}
    -# [${firstWithText.attributionText}](<${firstWithText.attributionUrl}>) Powered by [Wordnik](<${firstWithText.wordnikUrl}>)
    `);
  }
}
module.exports = Dictionary;
