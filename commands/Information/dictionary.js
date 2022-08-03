const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const owlBot = require('owlbot-js');

class Dictionary extends Command {
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

    input = input.join(' ').toLowerCase();

    if (!input || input.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Dictionary <word>`);

    owl.define(input)
      .then(function (result) {
        if (!result) return msg.channel.send('No entry was found for that word.'); // Edited owlbot-js index.js to return error.
        const example = result.definitions?.[0]?.example?.replace(/(<([^>]+)>)/gi, '');

        const definition = result.definitions?.[0]?.definition;
        if (!definition) return msg.channel.send('No entry was found for that word.');

        const em = new EmbedBuilder()
          .setTitle('Dictionary Information')
          .setColor('#0099CC')
          .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
          .addFields([
            { name: 'Definition', value: definition, inline: true },
            { name: 'Example', value: example || 'No example provided', inline: true },
            { name: 'Pronunciation', value: result.pronunciation || 'No pronunciation provided', inline: true }
          ]);
        if (result.definitions?.[0].image_url) em.setThumbnail(result.definitions[0].image_url);
        return msg.channel.send({ embeds: [em] });
      })
      .catch(() => {
        return msg.channel.send('No entry was found for that word.');
      });
  }
}

module.exports = Dictionary;
