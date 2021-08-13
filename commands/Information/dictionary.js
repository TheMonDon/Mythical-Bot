const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const config = require('../../config.js');
const owlBot = require('owlbot-js');

class DictionaryCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'dictionary',
      description: 'Get the definition of a word from owlbot English dictionary',
      usage: 'dictionary <word>',
      category: 'Information',
      aliases: ['dict', 'dic']
    });
  }

  async run (msg, input) {
    const owl = owlBot(config.owlKey);
    const p = msg.settings.prefix;

    input = input.join(' ').toLowerCase();

    if (!input || input.length < 1) return msg.channel.send(`Incorrect Usage: ${p}Dictionary <word>`);

    owl.define(input)
      .then(function (result) {
        if (!result) return msg.channel.send('No entry was found for that word.'); // Edited owlbot-js index.js to return error.
        const example = result.definitions?.[0]?.example?.replace(/(<([^>]+)>)/gi, '');

        const definition = result.definitions?.[0]?.definition;
        if (!definition) return msg.channel.send('No entry was found for that word.');

        const em = new DiscordJS.MessageEmbed()
          .setTitle('Dictionary Information')
          .setColor('RANDOM')
          .setAuthor(msg.author.username, msg.author.displayAvatarURL())
          .addField('Definition', definition, true)
          .addField('Example', example || 'No example provided', true)
          .addField('Pronunciation', result.pronunciation || 'No pronunciation provided', true);
        if (result.definitions?.[0].image_url) em.setThumbnail(result.definitions[0].image_url);
        return msg.channel.send({ embeds: [em] });
      })
      .catch(() => {
        return msg.channel.send('No entry was found for that word.');
      });
  }
}

module.exports = DictionaryCommand;
