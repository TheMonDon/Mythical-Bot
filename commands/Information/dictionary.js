const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const config = require('../../config.js');
// const Dictionary = require('oxford-dictionaries-api'); // Leaving this in here, but switching to owl if no issues.
const owlBot = require('owlbot-js');

class DictionaryCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'dictionary',
      description: 'Get the definition of a word from owlbot English dictionary',
      usage: 'dictionary <word>',
      category: 'Information',
      aliases: ['dict', 'dic']
    });
  }

  async run(msg, input) { // eslint-disable-line no-unused-vars
    // const dict = new Dictionary(config.appId, config.appKey); // again... leaving.
    const owl = owlBot(config.owlKey);
    const p = msg.settings.prefix;

    input = input.join(' ').toLowerCase();

    if (!input || input.length < 1) return msg.channel.send(`Incorrect Usage: ${p}Dictionary <word>`);

    owl.define(input)
      .then(function (result) {
        if (!result) return msg.channel.send('No entry was found for that word.'); // Edited owlbot-js index.js to return error.
        const example = result.definitions[0].example.replace(/(<([^>]+)>)/gi, "");
        const em = new DiscordJS.MessageEmbed()
          .setTitle('Dictionary Information')
          .setColor('RANDOM')
          .setAuthor(msg.author.username, msg.author.displayAvatarURL())
          .addField('Definition', result.definitions[0].definition, true)
          .addField('Example', example || 'No example provided', true)
          .addField('Pronunciation', result.pronunciation || 'No pronunciation provided', true);
        if (result.definitions[0].image_url) em.setThumbnail(result.definitions[0].image_url);
        msg.channel.send(em);
      })

    /*
    dict.entries({
      word_id: input,
      fields: ['definitions']
    })
      .then((data) => {
        const embed = new DiscordJS.MessageEmbed()
          .setTitle('Dictionary Definition')
          .setColor('RANDOM')
          .setAuthor(msg.member.displayName, msg.author.displayAvatarURL()) // This should probably be username or have a check for member.
          .addField(data.word, data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0], true)
          .setTimestamp();
        return msg.channel.send(embed);
      })
      .catch(() => {
        return msg.channel.send('No entry was found for that word.');
      });
      */
  }
}

module.exports = DictionaryCommand;
