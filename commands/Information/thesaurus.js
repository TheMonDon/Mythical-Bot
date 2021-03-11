const Command = require('../../base/Command.js');
// const DiscordJS = require('discord.js');
const config = require('../../config.js');

class thesaurus extends Command {
  constructor (client) {
    super(client, {
      name: 'thesaurus',
      description: 'Get the synomyns of a word from the Oxford Thesaurus.',
      usage: 'Thesaurus <word>',
      category: 'Information',
      aliases: ['thes', 'synonym']
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Thesaurus <word>`);
    const input = args.join(' ');

    /*
      .then(function (result) {
        if (!result) return msg.channel.send('No entry was found for that word.');
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
        return msg.channel.send(em);
      });
      */
  }
}

module.exports = thesaurus;
