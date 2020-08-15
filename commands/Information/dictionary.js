const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const config = require('../../config.js');
const app_id = config.appId;
const app_key = config.appKey;
const Dictionary = require('oxford-dictionaries-api');

class DictionaryCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'dictionary',
      description: 'Get the definition of a word from oxford dictionary',
      usage: 'dictionary',
      category: 'Information',
      aliases: ['dict', 'oxford', 'dic']
    });
  }

  async run (msg, input) { // eslint-disable-line no-unused-vars
    const dict = new Dictionary(app_id, app_key);
    const p =  this.client.settings.get(msg.guild.id).prefix;
    
    input = input.join(' ').toLowerCase();
    
    if (!input) return msg.channel.send(`Incorrect Usage: ${p}Dict <word>`);
    
    dict.entries({
      word_id: input,
      fields: ['definitions']
    })
      .then((data) => {
        const embed = new DiscordJS.MessageEmbed()
          .setTitle('Dictionary Definition')
          .setColor('RANDOM')
          .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
          .addField(data.word, data.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0], true)
          .setTimestamp();
        return msg.channel.send(embed);
      })
      // eslint-disable-next-line no-unused-vars
      .catch((e) => {
        return msg.channel.send('No entry was found for that word.');
      });
  }
}

module.exports = DictionaryCommand;
