const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const math = require('mathjs');

class Ping extends Command {
  constructor (client) {
    super(client, {
      name: 'math',
      description: 'Solve some math equations',
      usage: 'math',
      category: 'Information'
    });
  }

  async run (msg, args) {
    const text = args.join(' ');

    if (!text || text.length < 1) {
      return msg.channel.send('Please type something to evaluate.');
    }

    try {
      const solution = math.evaluate(text);
      const embed = new DiscordJS.MessageEmbed()
        .setAuthor(msg.author.username, msg.author.displayAvatarURL())
        .setColor('#767CC1')
        .addField('**📥 Expression**', `\`\`\`${text}\`\`\``, false)
        .addField('**📤 Result**', `\`\`\`${solution}\`\`\``, false);
      return msg.channel.send(embed);
    } catch (err) {
      return msg.channel.send(`Sorry, I couldn't solve that equation. \`${err}\``);
    }
  }
}

module.exports = Ping;
